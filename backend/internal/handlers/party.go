package handlers

import (
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type PartyHandler struct {
	repo *repository.Repository
}

func NewPartyHandler(repo *repository.Repository) *PartyHandler {
	return &PartyHandler{repo: repo}
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
	var req models.CreateFinanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	txDate, err := time.Parse(time.RFC3339, req.TransactionDate)
	if err != nil {
		txDate = time.Now()
	}

	finance := &models.PartyFinance{
		ID:              uuid.New(),
		TransactionType: req.TransactionType,
		AmountUSD:       req.AmountUSD,
		AmountKHR:       req.AmountKHR,
		PaymentMethod:   req.PaymentMethod,
		TransactionDate: txDate,
	}
	if req.MemberID != "" {
		mid, err := uuid.Parse(req.MemberID)
		if err == nil {
			finance.MemberID = &mid
		}
	}
	if req.ContributorNameKh != "" {
		finance.ContributorNameKh = &req.ContributorNameKh
	}
	if req.ContributorNameEn != "" {
		finance.ContributorNameEn = &req.ContributorNameEn
	}
	if req.ReferenceNumber != "" {
		finance.ReferenceNumber = &req.ReferenceNumber
	}
	if req.Notes != "" {
		finance.Notes = &req.Notes
	}

	if err := h.repo.CreateFinance(finance); err != nil {
		utils.InternalError(c, "Failed to record transaction")
		return
	}

	utils.JSON(c, http.StatusCreated, finance)
}

func (h *PartyHandler) GetFinances(c *gin.Context) {
	txType := c.Query("type")
	finances, err := h.repo.ListFinances(txType)
	if err != nil {
		utils.InternalError(c, "Failed to fetch finances")
		return
	}
	utils.JSON(c, http.StatusOK, finances)
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
	summary, err := h.repo.GetFinanceSummary()
	if err != nil {
		utils.InternalError(c, "Failed to get summary")
		return
	}
	utils.JSON(c, http.StatusOK, summary)
}
