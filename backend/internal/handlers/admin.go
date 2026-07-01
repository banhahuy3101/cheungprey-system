package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	gotrue "github.com/supabase-community/gotrue-go/types"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type AdminHandler struct {
	repo *repository.Repository
	cfg  *config.Config
}

func NewAdminHandler(repo *repository.Repository, cfg *config.Config) *AdminHandler {
	return &AdminHandler{repo: repo, cfg: cfg}
}

func (h *AdminHandler) requireAdmin(c *gin.Context) bool {
	return auth.RequireAdminHandler(c)
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
	profiles, err := h.repo.ListAdminUsers()
	if err != nil {
		utils.InternalError(c, "Failed to fetch users")
		return
	}

	if profiles == nil {
		profiles = []models.AdminUser{}
	}

	utils.JSON(c, http.StatusOK, profiles)
}

func (h *AdminHandler) GetUserByID(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	profile, err := h.repo.GetProfileByID(id)
	if err != nil || profile == nil {
		utils.Error(c, http.StatusNotFound, "User not found")
		return
	}

	permSvc := service.NewPermissionService(h.repo)
	_ = permSvc.EnrichProfile(profile)

	utils.JSON(c, http.StatusOK, profile)
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	var req models.AdminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	assignerRole, _ := auth.GetUserRole(c)
	targetRole := req.Role
	if targetRole == "" && len(req.Roles) > 0 {
		targetRole = models.PrimaryRole(req.Roles)
	}
	if targetRole == "" {
		targetRole = models.RoleRecorder
	}
	if err := auth.ValidateRoleAssignment(assignerRole, targetRole); err != nil {
		utils.Forbidden(c, err.Error())
		return
	}
	roles := req.Roles
	if len(roles) == 0 {
		roles = []models.UserRole{targetRole}
	}
	for _, role := range roles {
		if err := auth.ValidateRoleAssignment(assignerRole, role); err != nil {
			utils.Forbidden(c, err.Error())
			return
		}
	}

	pw := req.Password
	resp, err := h.repo.AdminClient.Auth.AdminCreateUser(gotrue.AdminCreateUserRequest{
		Email:    req.Email,
		Password: &pw,
	})
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	profile := &models.Profile{
		ID:        resp.User.ID,
		FullName:  req.FullName,
		Email:     req.Email,
		Role:      targetRole,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if req.PhoneNumber != "" {
		profile.PhoneNumber = &req.PhoneNumber
	}
	if req.ZoneCode != "" {
		profile.ZoneCode = &req.ZoneCode
	}
	if req.CommuneID != "" {
		cid, err := uuid.Parse(req.CommuneID)
		if err == nil {
			profile.CommuneID = &cid
		}
	}
	if req.VillageID != "" {
		vid, err := uuid.Parse(req.VillageID)
		if err == nil {
			profile.VillageID = &vid
		}
	}

	if err := h.repo.CreateProfile(profile); err != nil {
		utils.InternalError(c, "Failed to create profile")
		return
	}

	if err := h.repo.SetUserRoles(resp.User.ID, roles); err != nil {
		utils.InternalError(c, "Failed to assign roles")
		return
	}

	permSvc := service.NewPermissionService(h.repo)
	access, _ := permSvc.GetUserAccess(resp.User.ID)
	if access != nil {
		utils.JSON(c, http.StatusCreated, access.Profile)
		return
	}

	utils.JSON(c, http.StatusCreated, profile)
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	var req models.AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if req.Role != "" {
		assignerRole, _ := auth.GetUserRole(c)
		if assignerRole != models.RoleSuperAdmin {
			if err := auth.ValidateRoleAssignment(assignerRole, req.Role); err != nil {
				utils.Forbidden(c, err.Error())
				return
			}
		}
	}

	if err := h.repo.AdminUpdateProfile(id, &req); err != nil {
		utils.InternalError(c, "Failed to update user")
		return
	}

	if len(req.Roles) > 0 {
		if err := h.repo.SetUserRoles(id, req.Roles); err != nil {
			utils.InternalError(c, "Failed to update roles")
			return
		}
	} else if req.Role != "" {
		if err := h.repo.SetUserRoles(id, []models.UserRole{req.Role}); err != nil {
			utils.InternalError(c, "Failed to update roles")
			return
		}
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "User updated"})
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	assignerRole, _ := auth.GetUserRole(c)
	target, err := h.repo.GetProfileByID(id)
	if err != nil || target == nil {
		utils.Error(c, http.StatusNotFound, "User not found")
		return
	}

	if err := auth.ValidateRoleAssignment(assignerRole, target.Role); err != nil {
		utils.Forbidden(c, "Cannot delete a user with equal or higher role")
		return
	}

	if err := h.repo.DeleteProfile(id); err != nil {
		utils.InternalError(c, "Failed to delete user")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "User deleted"})
}

func (h *AdminHandler) UpdateUserRoles(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	var req models.UpdateUserRolesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	assignerRole, _ := auth.GetUserRole(c)
	for _, role := range req.Roles {
		if err := auth.ValidateRoleAssignment(assignerRole, role); err != nil {
			utils.Forbidden(c, err.Error())
			return
		}
	}

	if err := h.repo.SetUserRoles(id, req.Roles); err != nil {
		utils.InternalError(c, "Failed to update roles")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Roles updated", "roles": req.Roles})
}

func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	userID := c.Param("id")
	assignerRole, _ := auth.GetUserRole(c)

	var req models.UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := auth.ValidateRoleAssignment(assignerRole, req.Role); err != nil {
		utils.Forbidden(c, err.Error())
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	if err := h.repo.UpdateUserRole(uid, req.Role); err != nil {
		utils.InternalError(c, "Failed to update role")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Role updated"})
}

func (h *AdminHandler) GetStatistics(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	profiles, err := h.repo.ListUsers()
	if err != nil {
		utils.InternalError(c, "Failed to fetch statistics")
		return
	}

	stats := &models.Statistics{
		TotalUsers:   len(profiles),
		RecordsByRole: map[string]int{},
	}

	for _, p := range profiles {
		stats.RecordsByRole[string(p.Role)]++
	}

	utils.JSON(c, http.StatusOK, stats)
}

func (h *AdminHandler) GetSettings(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	utils.JSON(c, http.StatusOK, models.AdminSettings{
		DefaultUserPassword: h.cfg.DefaultUserPassword,
	})
}

func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	var req models.AdminResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		req.Password = h.cfg.DefaultUserPassword
	}

	if err := h.repo.AdminResetUserPassword(id, req.Password); err != nil {
		utils.InternalError(c, "Failed to reset password")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Password reset"})
}
