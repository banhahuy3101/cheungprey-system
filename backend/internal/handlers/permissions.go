package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type PermissionHandler struct {
	repo *repository.Repository
}

func NewPermissionHandler(repo *repository.Repository) *PermissionHandler {
	return &PermissionHandler{repo: repo}
}

func (h *PermissionHandler) ListRolePermissions(c *gin.Context) {
	if !auth.RequireFeatureHandler(c, models.FeatureUsers) {
		return
	}
	list, err := h.repo.ListRolePermissions()
	if err != nil {
		utils.InternalError(c, "Failed to load role permissions")
		return
	}
	if list == nil {
		list = []models.RolePermissions{}
	}
	utils.JSON(c, http.StatusOK, list)
}

func (h *PermissionHandler) UpdateRolePermissions(c *gin.Context) {
	if !auth.RequireFeatureHandler(c, models.FeatureUsers) {
		return
	}
	role := models.UserRole(c.Param("role"))
	if role == "" {
		utils.BadRequest(c, "Invalid role")
		return
	}
	var req models.UpdateRolePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.repo.UpdateRolePermissions(role, req.Permissions); err != nil {
		utils.InternalError(c, "Failed to update role permissions")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Role permissions updated"})
}

func (h *PermissionHandler) ListFeatures(c *gin.Context) {
	features := make([]gin.H, 0, len(models.AllFeatures))
	for _, f := range models.AllFeatures {
		features = append(features, gin.H{
			"key":   f,
			"label": models.FeatureLabels[f],
		})
	}
	utils.JSON(c, http.StatusOK, features)
}
