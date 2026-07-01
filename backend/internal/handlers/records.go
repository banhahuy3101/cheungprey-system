package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type RecordHandler struct {
	repo *repository.Repository
	svc  *service.RecordService
}

func NewRecordHandler(repo *repository.Repository) *RecordHandler {
	return &RecordHandler{
		repo: repo,
		svc:  service.NewRecordService(repo),
	}
}

func (h *RecordHandler) accessContext(c *gin.Context) service.RecordAccessContext {
	userID, _ := auth.GetUserID(c)
	profile, _ := auth.GetProfile(c)
	return service.RecordAccessFromProfile(userID, profile)
}

func (h *RecordHandler) CreateRecord(c *gin.Context) {
	userID, _ := auth.GetUserID(c)
	profile, _ := auth.GetProfile(c)

	var req models.CreateRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	record, err := h.svc.CreateRecord(userID, profile, &req)
	if err != nil {
		if err.Error() == "forbidden" {
			utils.Forbidden(c, "Insufficient permissions to create records")
			return
		}
		utils.InternalError(c, "Failed to create record")
		return
	}

	utils.JSON(c, http.StatusCreated, record)
}

func (h *RecordHandler) GetRecords(c *gin.Context) {
	records, err := h.svc.GetRecords(h.accessContext(c))
	if err != nil {
		utils.InternalError(c, "Failed to fetch records")
		return
	}

	if records == nil {
		records = []models.Record{}
	}

	utils.JSON(c, http.StatusOK, records)
}

func (h *RecordHandler) GetRecordByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid record ID")
		return
	}

	record, err := h.svc.GetRecordByID(h.accessContext(c), id)
	if err != nil {
		if err.Error() == "forbidden" {
			utils.Forbidden(c, "Insufficient permissions")
			return
		}
		utils.InternalError(c, "Failed to fetch record")
		return
	}
	if record == nil {
		utils.Error(c, http.StatusNotFound, "Record not found")
		return
	}

	utils.JSON(c, http.StatusOK, record)
}

func (h *RecordHandler) UpdateRecord(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid record ID")
		return
	}

	var req models.UpdateRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.svc.UpdateRecord(h.accessContext(c), id, &req); err != nil {
		if err.Error() == "forbidden" {
			utils.Forbidden(c, "Insufficient permissions")
			return
		}
		utils.InternalError(c, "Failed to update record")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Record updated"})
}

func (h *RecordHandler) DeleteRecord(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid record ID")
		return
	}

	if err := h.svc.DeleteRecord(h.accessContext(c), id); err != nil {
		if err.Error() == "forbidden" {
			utils.Forbidden(c, "Insufficient permissions")
			return
		}
		utils.InternalError(c, "Failed to delete record")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Record deleted"})
}
