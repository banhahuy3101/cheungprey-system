package handlers

import (
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/internal/services"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type PartyHandler struct {
	repo    *repository.Repository
	finance *service.FinanceService
	reports *services.ReportService
}

func NewPartyHandler(repo *repository.Repository, reports *services.ReportService) *PartyHandler {
	return &PartyHandler{
		repo:    repo,
		finance: service.NewFinanceService(repo),
		reports: reports,
	}
}

func (h *PartyHandler) financeAccess(c *gin.Context) service.FinanceAccessContext {
	userID, _ := auth.GetUserID(c)
	profile, _ := auth.GetProfile(c)
	return h.finance.AccessContext(userID, profile)
}

func financeServiceError(c *gin.Context, err error, fallback string) {
	if err == nil {
		return
	}
	switch err.Error() {
	case "forbidden":
		utils.Error(c, http.StatusForbidden, "គ្មានសិទ្ធិធ្វើប្រតិបត្តិការនេះ")
	case "forbidden zone":
		utils.Error(c, http.StatusForbidden, "អ្នកគ្មានសិទ្ធិកត់ត្វាតំបន់នេះ")
	case "not found":
		utils.Error(c, http.StatusNotFound, "រកមិនឃើញប្រតិបត្តិការ")
	case "invalid zone":
		utils.BadRequest(c, "សូមជ្រើសរើសឃុំ (ខេត្ត → ស្រុក → ឃុំ)")
	case "profile zone missing":
		utils.Error(c, http.StatusForbidden, "គណនីអ្នកមិនមានតំបន់កំណត់ — សូមទាក់ទងអ្នកគ្រប់គ្រង")
	case "invalid transaction type":
		utils.BadRequest(c, "ប្រភេទប្រតិបត្តិការមិនត្រឹមត្រូវ")
	case "no fields to update":
		utils.BadRequest(c, err.Error())
	default:
		utils.InternalError(c, fallback)
	}
}

func (h *PartyHandler) GetZoneTree(c *gin.Context) {
	allZones, err := h.repo.ListAllZones()
	if err != nil {
		utils.InternalError(c, "Failed to fetch zones")
		return
	}

	children := map[string][]models.GeographicZone{}
	var roots []models.GeographicZone
	for _, z := range allZones {
		if z.ParentCode != nil {
			children[*z.ParentCode] = append(children[*z.ParentCode], z)
		} else {
			roots = append(roots, z)
		}
	}

	var buildTree func(parentCode string) []models.GeographicZone
	buildTree = func(parentCode string) []models.GeographicZone {
		var result []models.GeographicZone
		for _, z := range children[parentCode] {
			node := z
			node.Children = buildTree(z.ZoneCode)
			result = append(result, node)
		}
		return result
	}

	// Build full tree starting from roots (provinces with nil parent_code)
	for i, r := range roots {
		roots[i].Children = buildTree(r.ZoneCode)
	}
	utils.JSON(c, http.StatusOK, roots)
}

func (h *PartyHandler) GetZones(c *gin.Context) {
	zoneType := c.Query("type")
	parentCode := c.Query("parent_code")
	code := c.Query("code")

	if code != "" {
		zone, err := h.repo.GetZoneByCode(code)
		if err != nil {
			utils.InternalError(c, "Failed to fetch zone")
			return
		}
		if zone == nil {
			utils.JSON(c, http.StatusOK, nil)
			return
		}
		utils.JSON(c, http.StatusOK, zone)
		return
	}

	if parentCode != "" {
		zones, err := h.repo.GetChildren(parentCode)
		if err != nil {
			utils.InternalError(c, "Failed to fetch zones")
			return
		}
		utils.JSON(c, http.StatusOK, zones)
		return
	}

	zones, err := h.repo.ListZones(zoneType)
	if err != nil {
		utils.InternalError(c, "Failed to fetch zones")
		return
	}
	utils.JSON(c, http.StatusOK, zones)
}

func (h *PartyHandler) GetStructures(c *gin.Context) {
	structures, err := h.repo.ListPartyStructures()
	if err != nil {
		utils.InternalError(c, "Failed to fetch structures")
		return
	}
	utils.JSON(c, http.StatusOK, structures)
}

func (h *PartyHandler) CreateMember(c *gin.Context) {
	var req models.CreateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	member := &models.Member{
		ID:                    uuid.New(),
		MembershipCardNo:      req.MembershipCardNo,
		LastNameKh:            req.LastNameKh,
		FirstNameKh:           req.FirstNameKh,
		LastNameEn:            req.LastNameEn,
		FirstNameEn:           req.FirstNameEn,
		Gender:                req.Gender,
		DateOfBirth:           req.DateOfBirth,
		PhoneNumber:           req.PhoneNumber,
		RegisteredVillageCode: req.RegisteredVillageCode,
		PartyRole:             "Member",
		JoinDate:              req.JoinDate,
		Status:                "Active",
	}
	if req.NationalID != "" {
		member.NationalID = &req.NationalID
	}
	if req.Email != "" {
		member.Email = &req.Email
	}
	if req.TelegramUsername != "" {
		member.TelegramUsername = &req.TelegramUsername
	}
	if req.CurrentAddressDetails != "" {
		member.CurrentAddressDetails = &req.CurrentAddressDetails
	}
	if req.PartyRole != "" {
		member.PartyRole = req.PartyRole
	}
	if req.StructureID != "" {
		sid, err := uuid.Parse(req.StructureID)
		if err == nil {
			member.StructureID = &sid
		}
	}

	if err := h.repo.CreateMember(member); err != nil {
		utils.InternalError(c, "Failed to create member")
		return
	}

	utils.JSON(c, http.StatusCreated, member)
}

func (h *PartyHandler) GetMembers(c *gin.Context) {
	status := c.Query("status")
	members, err := h.repo.ListMembers(status)
	if err != nil {
		utils.InternalError(c, "Failed to fetch members")
		return
	}
	utils.JSON(c, http.StatusOK, members)
}

func (h *PartyHandler) GetMemberByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	member, err := h.repo.GetMemberByID(id)
	if err != nil || member == nil {
		utils.Error(c, http.StatusNotFound, "Member not found")
		return
	}

	utils.JSON(c, http.StatusOK, member)
}

func (h *PartyHandler) UpdateMember(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	var req models.UpdateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	data := map[string]any{"updated_at": "now()"}
	if req.MembershipCardNo != "" { data["membership_card_no"] = req.MembershipCardNo }
	if req.NationalID != "" { data["national_id"] = req.NationalID }
	if req.LastNameKh != "" { data["last_name_kh"] = req.LastNameKh }
	if req.FirstNameKh != "" { data["first_name_kh"] = req.FirstNameKh }
	if req.LastNameEn != "" { data["last_name_en"] = req.LastNameEn }
	if req.FirstNameEn != "" { data["first_name_en"] = req.FirstNameEn }
	if req.Gender != "" { data["gender"] = req.Gender }
	if req.PhoneNumber != "" { data["phone_number"] = req.PhoneNumber }
	if req.Email != "" { data["email"] = req.Email }
	if req.TelegramUsername != "" { data["telegram_username"] = req.TelegramUsername }
	if req.RegisteredVillageCode != "" { data["registered_village_code"] = req.RegisteredVillageCode }
	if req.CurrentAddressDetails != "" { data["current_address_details"] = req.CurrentAddressDetails }
	if req.PartyRole != "" { data["party_role"] = req.PartyRole }
	if req.Status != "" { data["status"] = req.Status }

	if err := h.repo.UpdateMember(id, data); err != nil {
		utils.InternalError(c, "Failed to update member")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Member updated"})
}

func (h *PartyHandler) DeleteMember(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid member ID")
		return
	}

	if err := h.repo.DeleteMember(id); err != nil {
		utils.InternalError(c, "Failed to delete member")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Member deleted"})
}

func (h *PartyHandler) CreateVoter(c *gin.Context) {
	var req models.CreateVoterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	voter := &models.VoterInsight{
		ID:           uuid.New(),
		LastNameKh:   req.LastNameKh,
		FirstNameKh:  req.FirstNameKh,
		Gender:       req.Gender,
		CommuneCode:  req.CommuneCode,
		VoterSentiment: "Undecided",
	}
	if req.PollingStationCode != "" {
		voter.PollingStationCode = &req.PollingStationCode
	}
	if req.VoterSentiment != "" {
		voter.VoterSentiment = req.VoterSentiment
	}
	if req.LastContactedDate != "" {
		voter.LastContactedDate = &req.LastContactedDate
	}

	if err := h.repo.CreateVoter(voter); err != nil {
		utils.InternalError(c, "Failed to create voter record")
		return
	}

	utils.JSON(c, http.StatusCreated, voter)
}

func (h *PartyHandler) GetVoters(c *gin.Context) {
	communeCode := c.Query("commune_code")
	sentiment := c.Query("sentiment")

	voters, err := h.repo.ListVoters(communeCode, sentiment)
	if err != nil {
		utils.InternalError(c, "Failed to fetch voters")
		return
	}
	utils.JSON(c, http.StatusOK, voters)
}

func (h *PartyHandler) CreateFinance(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	var req models.CreateFinanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	finance, err := h.finance.Create(h.financeAccess(c), userID, &req)
	if err != nil {
		financeServiceError(c, err, "Failed to record transaction")
		return
	}

	utils.JSON(c, http.StatusCreated, finance)
}

func (h *PartyHandler) GetFinanceByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}

	finance, err := h.finance.GetByID(h.financeAccess(c), id)
	if err != nil {
		if err.Error() == "forbidden" {
			utils.Error(c, http.StatusForbidden, "Forbidden")
			return
		}
		utils.Error(c, http.StatusNotFound, "Transaction not found")
		return
	}

	utils.JSON(c, http.StatusOK, finance)
}

func (h *PartyHandler) UpdateFinance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}

	var req models.UpdateFinanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	updated, err := h.finance.Update(h.financeAccess(c), id, &req)
	if err != nil {
		financeServiceError(c, err, "Failed to update transaction")
		return
	}

	utils.JSON(c, http.StatusOK, updated)
}

func (h *PartyHandler) DeleteFinance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}

	if err := h.finance.Delete(h.financeAccess(c), id); err != nil {
		financeServiceError(c, err, "Failed to delete transaction")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Transaction deleted"})
}

func (h *PartyHandler) GetFinances(c *gin.Context) {
	params := financeListParamsFromQuery(c)
	result, err := h.finance.List(h.financeAccess(c), params)
	if err != nil {
		utils.InternalError(c, "Failed to fetch finances")
		return
	}
	utils.JSON(c, http.StatusOK, result)
}

func financeListParamsFromQuery(c *gin.Context) models.FinanceListParams {
	txType := c.Query("transaction_type")
	if txType == "" {
		txType = c.Query("type")
	}
	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if n, err := parseIntDefault(p, 1); err == nil && n > 0 {
			page = n
		}
	}
	if l := c.Query("limit"); l != "" {
		if n, err := parseIntDefault(l, 20); err == nil && n > 0 {
			limit = n
		}
	}
	return models.FinanceListParams{
		TransactionType: txType,
		Direction:       c.Query("direction"),
		From:            c.Query("from"),
		To:              c.Query("to"),
		Search:          c.Query("q"),
		ZoneCode:        c.Query("zone_code"),
		Status:          c.Query("status"),
		Page:            page,
		Limit:           limit,
	}
}

func parseIntDefault(s string, def int) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil {
		return def, err
	}
	return n, nil
}

func (h *PartyHandler) UploadFile(c *gin.Context) {
	var req models.UploadFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid upload payload")
		return
	}

	raw, err := base64.StdEncoding.DecodeString(req.Base64Data)
	if err != nil {
		utils.BadRequest(c, "Invalid base64 file data")
		return
	}

	userID, _ := auth.GetUserID(c)
	file := &models.PartyFile{
		ID:            uuid.New(),
		FileName:      req.FileName,
		MimeType:      req.MimeType,
		Base64Content: req.Base64Data,
		FileSize:      len(raw),
		UploadedBy:    &userID,
	}
	if req.Description != "" {
		file.Description = &req.Description
	}
	if req.MemberID != "" {
		mid, err := uuid.Parse(req.MemberID)
		if err == nil {
			file.MemberID = &mid
		}
	}

	if err := h.repo.CreateFile(file); err != nil {
		utils.InternalError(c, "Failed to upload file")
		return
	}

	resp := *file
	resp.Base64Content = ""
	utils.JSON(c, http.StatusCreated, resp)
}

func (h *PartyHandler) GetFiles(c *gin.Context) {
	memberID := c.Query("member_id")
	files, err := h.repo.ListFiles(memberID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch files")
		return
	}
	for i := range files {
		files[i].Base64Content = ""
	}
	utils.JSON(c, http.StatusOK, files)
}

func (h *PartyHandler) GetFileByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid file ID")
		return
	}

	file, err := h.repo.GetFileByID(id)
	if err != nil || file == nil {
		utils.Error(c, http.StatusNotFound, "File not found")
		return
	}

	utils.JSON(c, http.StatusOK, file)
}

func (h *PartyHandler) DeleteFile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid file ID")
		return
	}

	if err := h.repo.DeleteFile(id); err != nil {
		utils.InternalError(c, "Failed to delete file")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "File deleted"})
}

func (h *PartyHandler) GetFinanceSummary(c *gin.Context) {
	params := financeListParamsFromQuery(c)
	params.Page = 1
	params.Limit = 0
	summary, err := h.finance.Summary(h.financeAccess(c), params)
	if err != nil {
		utils.InternalError(c, "Failed to get summary")
		return
	}
	utils.JSON(c, http.StatusOK, summary)
}

func (h *PartyHandler) GetFinanceAnalytics(c *gin.Context) {
	params := financeListParamsFromQuery(c)
	analytics, err := h.finance.Analytics(h.financeAccess(c), params)
	if err != nil {
		utils.InternalError(c, "Failed to get analytics")
		return
	}
	utils.JSON(c, http.StatusOK, analytics)
}

func (h *PartyHandler) GetFinanceReportPDF(c *gin.Context) {
	params := financeListParamsFromQuery(c)
	params.Page = 1
	params.Limit = 0
	data, err := h.finance.BuildReportData(h.financeAccess(c), params)
	if err != nil {
		utils.InternalError(c, "Failed to build report")
		return
	}
	pdfBytes, err := h.reports.GenerateFinanceReport(data)
	if err != nil {
		utils.InternalError(c, "Failed to generate PDF")
		return
	}
	filename := "finance_report"
	if data.ZoneCode != "" {
		filename += "_" + data.ZoneCode
	}
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename="+filename+".pdf")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

func (h *PartyHandler) ListFinanceBudgets(c *gin.Context) {
	params := financeListParamsFromQuery(c)
	budgets, err := h.finance.ListBudgets(h.financeAccess(c), params.ZoneCode, params.From, params.To)
	if err != nil {
		utils.InternalError(c, "Failed to list budgets")
		return
	}
	utils.JSON(c, http.StatusOK, budgets)
}

func (h *PartyHandler) CreateFinanceBudget(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	var req models.CreateFinanceBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	b, err := h.finance.CreateBudget(h.financeAccess(c), userID, &req)
	if err != nil {
		if err.Error() == "forbidden" || err.Error() == "forbidden zone" {
			utils.Error(c, http.StatusForbidden, "Forbidden")
			return
		}
		utils.InternalError(c, "Failed to create budget")
		return
	}
	utils.JSON(c, http.StatusCreated, b)
}

func (h *PartyHandler) UpdateFinanceBudget(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid budget ID")
		return
	}
	var req models.UpdateFinanceBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	b, err := h.finance.UpdateBudget(h.financeAccess(c), id, &req)
	if err != nil {
		if err.Error() == "forbidden" {
			utils.Error(c, http.StatusForbidden, "Forbidden")
			return
		}
		utils.InternalError(c, "Failed to update budget")
		return
	}
	utils.JSON(c, http.StatusOK, b)
}

func (h *PartyHandler) DeleteFinanceBudget(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid budget ID")
		return
	}
	if err := h.finance.DeleteBudget(h.financeAccess(c), id); err != nil {
		utils.Error(c, http.StatusForbidden, "Forbidden")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Budget deleted"})
}

func (h *PartyHandler) SubmitFinance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}
	f, err := h.finance.Submit(h.financeAccess(c), id)
	if err != nil {
		financeServiceError(c, err, "Failed to submit transaction")
		return
	}
	utils.JSON(c, http.StatusOK, f)
}

func (h *PartyHandler) ApproveFinance(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}
	f, err := h.finance.Approve(h.financeAccess(c), userID, id)
	if err != nil {
		financeServiceError(c, err, "Failed to approve transaction")
		return
	}
	utils.JSON(c, http.StatusOK, f)
}

func (h *PartyHandler) RejectFinance(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}
	var req models.RejectFinanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	f, err := h.finance.Reject(h.financeAccess(c), id, req.Reason)
	if err != nil {
		financeServiceError(c, err, "Failed to reject transaction")
		return
	}
	utils.JSON(c, http.StatusOK, f)
}

func (h *PartyHandler) AddFinanceAttachment(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid finance ID")
		return
	}
	var req models.AddFinanceAttachmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	file, err := h.finance.AddAttachment(h.financeAccess(c), userID, id, &req)
	if err != nil {
		utils.Error(c, http.StatusForbidden, "Forbidden")
		return
	}
	utils.JSON(c, http.StatusCreated, file)
}
