package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type ZoneChiefHandler struct {
	repo *repository.Repository
}

func NewZoneChiefHandler(repo *repository.Repository) *ZoneChiefHandler {
	return &ZoneChiefHandler{repo: repo}
}

func (h *ZoneChiefHandler) ListAssignments(c *gin.Context) {
	assignments, err := h.repo.ListZoneChiefAssignments()
	if err != nil {
		utils.InternalError(c, "មិនអាចទាញយកបញ្ជី")
		return
	}

	if assignments == nil {
		assignments = []models.ZoneChiefAssignment{}
	}

	utils.JSON(c, http.StatusOK, assignments)
}

func (h *ZoneChiefHandler) GetAssignment(c *gin.Context) {
	zoneCode := c.Param("zoneCode")
	if zoneCode == "" {
		utils.BadRequest(c, "ត្រូវការ zone_code")
		return
	}

	assignment, err := h.repo.GetZoneChiefAssignment(zoneCode)
	if err != nil {
		utils.InternalError(c, "មិនអាចទាញយកព័ត៌មាន")
		return
	}

	if assignment == nil {
		utils.Error(c, http.StatusNotFound, "មិនមានការចាត់តាំងសម្រាប់ភូមិសាស្ត្រនេះ")
		return
	}

	utils.JSON(c, http.StatusOK, assignment)
}

func (h *ZoneChiefHandler) Assign(c *gin.Context) {
	var req models.AssignZoneChiefRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		utils.BadRequest(c, "Invalid user_id")
		return
	}

	assignerID, _ := auth.GetUserID(c)

	if err := h.repo.AssignZoneChief(req.ZoneCode, userID, assignerID); err != nil {
		utils.InternalError(c, "មិនអាចចាត់តាំង")
		return
	}

	zoneCode := req.ZoneCode
	zoneType, err := h.repo.GetZoneType(zoneCode)
	if err == nil && zoneType != "" {
		role := roleForZoneType(zoneType)
		if role != "" {
			target, _ := h.repo.GetProfileByID(userID)
			if target != nil {
				roles, _ := h.repo.GetUserRoles(userID)
				found := false
				for _, r := range roles {
					if r == role {
						found = true
						break
					}
				}
				if !found {
					roles = append(roles, role)
					_ = h.repo.SetUserRoles(userID, roles)
				}
				if target.ZoneCode == nil || *target.ZoneCode != req.ZoneCode {
					_ = h.repo.AdminUpdateProfile(userID, &models.AdminUpdateUserRequest{ZoneCode: req.ZoneCode})
				}
			}
		}
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "ចាត់តាំងជោគជ័យ"})
}

func (h *ZoneChiefHandler) Remove(c *gin.Context) {
	var req models.RemoveZoneChiefRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.repo.RemoveZoneChief(req.ZoneCode); err != nil {
		utils.InternalError(c, "មិនអាចលុបការចាត់តាំង")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "លុបការចាត់តាំងជោគជ័យ"})
}

func roleForZoneType(zoneType string) models.UserRole {
	switch zoneType {
	case "Province":
		return models.UserRole("province_chief")
	case "District":
		return models.UserRole("district_chief")
	case "Commune":
		return models.UserRole("commune_chief")
	case "Village":
		return models.UserRole("village_chief")
	default:
		return ""
	}
}
