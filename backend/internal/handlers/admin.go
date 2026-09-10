package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	qrcode "github.com/skip2/go-qrcode"
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

func (h *AdminHandler) getDefaultPassword() string {
	setting, err := h.repo.GetSystemSetting("default_user_password")
	if err == nil && setting != nil && len(setting.Value) > 0 {
		var pw string
		if err := json.Unmarshal(setting.Value, &pw); err == nil && pw != "" {
			return pw
		}
	}
	return h.cfg.DefaultUserPassword
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

// lanIP returns the machine's outbound LAN IP (e.g. 192.168.1.20) so that
// URLs embedded in QR codes are reachable from phones on the same network.
func lanIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return ""
	}
	defer conn.Close()
	addr, ok := conn.LocalAddr().(*net.UDPAddr)
	if !ok || addr.IP == nil {
		return ""
	}
	return addr.IP.String()
}

// resolveQRBaseURL picks a base URL phones can reach: it prefers the origin
// the admin browser is on, and swaps localhost/127.0.0.1 for the LAN IP.
func resolveQRBaseURL(requested, fallback string) string {
	base := strings.TrimSpace(requested)
	if base == "" {
		base = fallback
	}
	u, err := url.Parse(base)
	if err != nil || u.Host == "" {
		return fallback
	}
	host := u.Hostname()
	if host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" {
		if lan := lanIP(); lan != "" {
			u.Host = net.JoinHostPort(lan, u.Port())
		}
	}
	return u.Scheme + "://" + u.Host
}

func (h *AdminHandler) GetUserQRCode(c *gin.Context) {
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

	var token string
	existing, err := h.repo.GetActiveQRLoginTokenByUserID(id)
	if err == nil && existing != nil && (existing.ExpiresAt.IsZero() || time.Now().Before(existing.ExpiresAt)) {
		token = existing.Token
	} else {
		raw := make([]byte, 32)
		if _, err := rand.Read(raw); err != nil {
			utils.InternalError(c, "Failed to generate QR code")
			return
		}
		token = base64.RawURLEncoding.EncodeToString(raw)

		createdBy, _ := auth.GetUserID(c)
		var createdByPtr *uuid.UUID
		if createdBy != uuid.Nil {
			createdByPtr = &createdBy
		}
		// Permanent validity (100 years - never expires / no timeout)
		expiresAt := time.Now().Add(100 * 365 * 24 * time.Hour)
		if err := h.repo.CreateQRLoginToken(id, token, expiresAt, createdByPtr); err != nil {
			utils.InternalError(c, "Failed to generate QR code")
			return
		}
	}

	base := resolveQRBaseURL(c.Query("origin"), h.cfg.FrontendURL)
	loginURL := base + "/login?qr_token=" + token

	png, err := qrcode.Encode(loginURL, qrcode.Medium, 320)
	if err != nil {
		utils.InternalError(c, "Failed to generate QR code")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{
		"qr_data_uri":   "data:image/png;base64," + base64.StdEncoding.EncodeToString(png),
		"login_url":     loginURL,
		"never_expires": true,
		"expires_at":    time.Now().Add(100 * 365 * 24 * time.Hour).UTC().Format(time.RFC3339),
	})
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
		utils.BadRequest(c, "Please select at least one role for the user")
		return
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

	if req.Email != "" {
		existing, err := h.repo.GetProfileByEmail(req.Email)
		if err != nil {
			utils.InternalError(c, "Failed to validate email")
			return
		}
		if existing != nil {
			utils.BadRequest(c, "An account with this email already exists")
			return
		}
	}
	if req.PhoneNumber != "" {
		if len(req.PhoneNumber) > 13 || !phonePattern.MatchString(req.PhoneNumber) {
			utils.BadRequest(c, "Phone number must be in Cambodian 0xx or +855 format (9-13 digits)")
			return
		}
		existing, err := h.repo.GetProfileByPhone(req.PhoneNumber)
		if err != nil {
			utils.InternalError(c, "Failed to validate phone number")
			return
		}
		if existing != nil {
			utils.BadRequest(c, "A user with this phone number already exists")
			return
		}
	}

	pw := req.Password
	if pw == "" {
		pw = h.getDefaultPassword()
	}
	resp, err := h.repo.AdminClient.Auth.WithToken(h.cfg.SupabaseServiceKey).AdminCreateUser(gotrue.AdminCreateUserRequest{
		Email:        req.Email,
		Password:     &pw,
		EmailConfirm: true,
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
	if req.DateOfBirth != "" {
		profile.DateOfBirth = &req.DateOfBirth
	}

	if err := h.repo.CreateProfile(profile); err != nil {
		_ = h.repo.AdminClient.Auth.WithToken(h.cfg.SupabaseServiceKey).AdminDeleteUser(gotrue.AdminDeleteUserRequest{UserID: resp.User.ID})
		utils.InternalError(c, "Failed to create user profile: "+err.Error())
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
		if err := auth.ValidateRoleAssignment(assignerRole, req.Role); err != nil {
			utils.Forbidden(c, err.Error())
			return
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
	currentUserID, _ := auth.GetUserID(c)
	if id == currentUserID {
		utils.BadRequest(c, "You cannot delete your own account")
		return
	}
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

	_ = h.repo.AdminClient.Auth.WithToken(h.cfg.SupabaseServiceKey).AdminDeleteUser(gotrue.AdminDeleteUserRequest{UserID: id})

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
		TotalUsers:    len(profiles),
		RecordsByRole: map[string]int{},
	}

	for _, p := range profiles {
		stats.RecordsByRole[string(p.Role)]++
	}

	utils.JSON(c, http.StatusOK, stats)
}

type SettingsNavItem struct {
	Key       string   `json:"key,omitempty"`
	ModuleKey string   `json:"module_key,omitempty"`
	Icon      string   `json:"icon"`
	Title     string   `json:"title"`
	Desc      string   `json:"desc"`
	Path      string   `json:"path"`
	Features  []string `json:"features,omitempty"`
}

func resolveFunctionalModuleKey(subModule string) string {
	switch subModule {
	case "report_templates":
		return "reports"
	case "performance_period", "performance":
		return "performance"
	case "zone_chiefs":
		return "zone_chiefs"
	default:
		return subModule
	}
}

func (h *AdminHandler) GetSettingsCatalog(c *gin.Context) {
	moduleConfigs, _ := h.repo.ListModuleConfigs()
	enabledMap := make(map[string]bool)
	for _, mc := range moduleConfigs {
		enabledMap[mc.ModuleKey] = mc.Enabled
	}

	dbMenuItems, err := h.repo.ListMenuItems()
	if err != nil {
		utils.InternalError(c, "Failed to fetch settings catalog: "+err.Error())
		return
	}

	var rootSettingsID *uuid.UUID
	for _, mi := range dbMenuItems {
		if mi.Path == "/settings" || (mi.ModuleKey == "settings" && mi.ParentID == nil) {
			id := mi.ID
			rootSettingsID = &id
			break
		}
	}

	var catalog []SettingsNavItem
	for _, mi := range dbMenuItems {
		// Only direct child items of Settings that are active and visible
		if mi.ModuleKey == "settings" && mi.ParentID != nil && mi.IsActive && mi.IsVisible {
			if rootSettingsID != nil && *mi.ParentID != *rootSettingsID {
				continue
			}

			funcModule := resolveFunctionalModuleKey(mi.SubModule)
			if funcModule != "" {
				if enabled, ok := enabledMap[funcModule]; ok && !enabled {
					continue
				}
			}

			desc := mi.Description
			if desc == "" {
				desc = mi.TitleEN
			}

			item := SettingsNavItem{
				Key:       mi.FeatureKey,
				ModuleKey: mi.SubModule,
				Icon:      mi.Icon,
				Title:     mi.Title,
				Desc:      desc,
				Path:      mi.Path,
			}

			if mi.SubModule == "workflow" || mi.SubModule == "menu_items" {
				item.Features = []string{string(models.FeatureTechnical), string(models.FeatureUsers)}
			} else if mi.SubModule == "cron" {
				item.Features = []string{string(models.FeatureTechnical), string(models.FeatureUsers), string(models.FeatureSettings)}
			}

			catalog = append(catalog, item)
		}
	}

	if catalog == nil {
		catalog = []SettingsNavItem{}
	}

	utils.JSON(c, http.StatusOK, catalog)
}

func (h *AdminHandler) GetSettings(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	utils.JSON(c, http.StatusOK, models.AdminSettings{
		DefaultUserPassword: h.getDefaultPassword(),
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
		req.Password = h.getDefaultPassword()
	}

	if err := h.repo.AdminResetUserPassword(id, req.Password); err != nil {
		utils.InternalError(c, "Failed to reset password")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Password reset"})
}

func (h *AdminHandler) ListSystemSettings(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	settings, err := h.repo.ListSystemSettings()
	if err != nil {
		utils.InternalError(c, "Failed to fetch system settings")
		return
	}
	utils.JSON(c, http.StatusOK, settings)
}

type UpdateSystemSettingRequest struct {
	Key         string `json:"key" binding:"required"`
	Value       any    `json:"value" binding:"required"`
	Description string `json:"description"`
}

func (h *AdminHandler) UpdateSystemSetting(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	var req UpdateSystemSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request body")
		return
	}
	if err := h.repo.UpsertSystemSetting(req.Key, req.Value, req.Description); err != nil {
		utils.InternalError(c, "Failed to update system setting: "+err.Error())
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "System setting updated successfully"})
}

func (h *AdminHandler) ListDatabaseTables(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	tables, err := h.repo.ListDatabaseTables()
	if err != nil {
		utils.InternalError(c, "Failed to fetch database tables")
		return
	}
	utils.JSON(c, http.StatusOK, tables)
}

