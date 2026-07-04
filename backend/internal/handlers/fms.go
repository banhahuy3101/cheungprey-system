package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type FMSHandler struct {
	repo  *repository.Repository
	fms   *service.FMSService
}

func NewFMSHandler(repo *repository.Repository) *FMSHandler {
	return &FMSHandler{
		repo: repo,
		fms:  service.NewFMSService(repo),
	}
}

func fmsServiceError(c *gin.Context, err error, fallback string) {
	if err == nil {
		return
	}
	switch {
	case err.Error() == "not found":
		utils.Error(c, http.StatusNotFound, "រកមិនឃើញ")
	case err.Error() == "no fields to update":
		utils.BadRequest(c, err.Error())
	case contains(err.Error(), "invalid account code"):
		utils.BadRequest(c, "លេខកូដគណនីមិនត្រឹមត្រូវ")
	case contains(err.Error(), "account code already exists"):
		utils.BadRequest(c, "លេខកូដគណនីមានរួចហើយ")
	case contains(err.Error(), "insufficient budget allocation"):
		utils.BadRequest(c, "ថវិកាមិនគ្រប់គ្រាន់")
	case contains(err.Error(), "not pending approval"):
		utils.BadRequest(c, "ប្រតិបត្តិការមិនស្ថិតក្នុងស្ថានភាពរង់ចាំការអនុម័ត")
	case contains(err.Error(), "no budget found"):
		utils.BadRequest(c, "រកមិនឃើញថវិកាសម្រាប់គណនីនេះ")
	case contains(err.Error(), "budget is not approved"):
		utils.BadRequest(c, "ថវិកាមិនទាន់ត្រូវបានអនុម័ត")
	case contains(err.Error(), "cannot reverse a reversal"):
		utils.BadRequest(c, "មិនអាចបញ្ច្រាសប្រតិបត្តិការដែលបានបញ្ច្រាសរួចហើយ")
	case contains(err.Error(), "only executed"):
		utils.BadRequest(c, "អាចបញ្ច្រាសតែប្រតិបត្តិការដែលបានអនុវត្តរួចរាល់")
	default:
		utils.InternalError(c, fallback)
	}
}

// --- Chart of Accounts ---

func (h *FMSHandler) ListCoA(c *gin.Context) {
	accounts, err := h.fms.ListCoA()
	if err != nil {
		utils.InternalError(c, "Failed to fetch chart of accounts")
		return
	}
	utils.JSON(c, http.StatusOK, accounts)
}

func (h *FMSHandler) GetCoA(c *gin.Context) {
	code := c.Param("code")
	account, err := h.fms.GetCoA(code)
	if err != nil || account == nil {
		utils.Error(c, http.StatusNotFound, "Account code not found")
		return
	}
	utils.JSON(c, http.StatusOK, account)
}

func (h *FMSHandler) CreateCoA(c *gin.Context) {
	var req models.CreateCoARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	account, err := h.fms.CreateCoA(&req)
	if err != nil {
		fmsServiceError(c, err, "Failed to create account")
		return
	}
	utils.JSON(c, http.StatusCreated, account)
}

func (h *FMSHandler) UpdateCoA(c *gin.Context) {
	code := c.Param("code")
	var req models.UpdateCoARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	account, err := h.fms.UpdateCoA(code, &req)
	if err != nil {
		fmsServiceError(c, err, "Failed to update account")
		return
	}
	utils.JSON(c, http.StatusOK, account)
}

// --- FMS Budgets ---

func (h *FMSHandler) ListFMSBudgets(c *gin.Context) {
	zoneCode := c.Query("zone_code")
	fiscalYear, _ := strconv.Atoi(c.Query("fiscal_year"))
	accountCode := c.Query("account_code")

	budgets, err := h.fms.ListBudgets(zoneCode, fiscalYear, accountCode)
	if err != nil {
		utils.InternalError(c, "Failed to fetch budgets")
		return
	}
	utils.JSON(c, http.StatusOK, budgets)
}

func (h *FMSHandler) CreateFMSBudget(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	var req models.CreateFMSBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	budget, err := h.fms.CreateBudget(userID, &req)
	if err != nil {
		fmsServiceError(c, err, "Failed to create budget")
		return
	}
	utils.JSON(c, http.StatusCreated, budget)
}

func (h *FMSHandler) GetFMSBudget(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid budget ID")
		return
	}
	budget, err := h.fms.GetBudgetByID(id)
	if err != nil || budget == nil {
		utils.Error(c, http.StatusNotFound, "Budget not found")
		return
	}
	utils.JSON(c, http.StatusOK, budget)
}

func (h *FMSHandler) UpdateFMSBudget(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid budget ID")
		return
	}
	var req models.UpdateFMSBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	budget, err := h.fms.UpdateBudget(id, &req)
	if err != nil {
		fmsServiceError(c, err, "Failed to update budget")
		return
	}
	utils.JSON(c, http.StatusOK, budget)
}

// --- FMS Transactions ---

func (h *FMSHandler) CreateFMSTransaction(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	var req models.CreateFMSTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	txn, err := h.fms.CreateTransaction(userID, &req)
	if err != nil {
		fmsServiceError(c, err, "Failed to create transaction")
		return
	}
	utils.JSON(c, http.StatusCreated, txn)
}

func (h *FMSHandler) ListFMSTransactions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	params := models.FMSTransactionListParams{
		ZoneCode:    c.Query("zone_code"),
		AccountCode: c.Query("account_code"),
		Type:        c.Query("type"),
		Status:      c.Query("status"),
		From:        c.Query("from"),
		To:          c.Query("to"),
		Page:        page,
		Limit:       limit,
	}

	result, err := h.fms.ListTransactions(params)
	if err != nil {
		utils.InternalError(c, "Failed to fetch transactions")
		return
	}
	utils.JSON(c, http.StatusOK, result)
}

func (h *FMSHandler) GetFMSTransaction(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid transaction ID")
		return
	}
	txn, err := h.fms.GetTransaction(id)
	if err != nil || txn == nil {
		utils.Error(c, http.StatusNotFound, "Transaction not found")
		return
	}
	utils.JSON(c, http.StatusOK, txn)
}

func (h *FMSHandler) ApproveFMSTransaction(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid transaction ID")
		return
	}
	txn, err := h.fms.ApproveTransaction(userID, id)
	if err != nil {
		fmsServiceError(c, err, "Failed to approve transaction")
		return
	}
	utils.JSON(c, http.StatusOK, txn)
}

func (h *FMSHandler) RejectFMSTransaction(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid transaction ID")
		return
	}
	var req models.RejectFinanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Reason is required")
		return
	}
	txn, err := h.fms.RejectTransaction(userID, id, req.Reason)
	if err != nil {
		fmsServiceError(c, err, "Failed to reject transaction")
		return
	}
	utils.JSON(c, http.StatusOK, txn)
}

func (h *FMSHandler) ReverseFMSTransaction(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid transaction ID")
		return
	}
	txn, err := h.fms.ReverseTransaction(userID, id)
	if err != nil {
		fmsServiceError(c, err, "Failed to reverse transaction")
		return
	}
	utils.JSON(c, http.StatusOK, txn)
}

// --- Dashboard ---

func (h *FMSHandler) GetFMSDashboard(c *gin.Context) {
	zoneCode := c.Query("zone_code")
	fiscalYear, _ := strconv.Atoi(c.DefaultQuery("fiscal_year", "2026"))
	dash, err := h.fms.GetDashboard(zoneCode, fiscalYear)
	if err != nil {
		utils.InternalError(c, "Failed to load dashboard")
		return
	}
	utils.JSON(c, http.StatusOK, dash)
}

// --- Audit Log ---

func (h *FMSHandler) ListFMSAuditLog(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	params := models.FMSAuditLogParams{
		TableName: c.Query("table_name"),
		RecordID:  c.Query("record_id"),
		Action:    c.Query("action"),
		From:      c.Query("from"),
		To:        c.Query("to"),
		Page:      page,
		Limit:     limit,
	}
	entries, err := h.fms.ListAuditLog(params)
	if err != nil {
		utils.InternalError(c, "Failed to fetch audit log")
		return
	}
	utils.JSON(c, http.StatusOK, entries)
}

// --- Utility ---

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsStr(s, substr)
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}


