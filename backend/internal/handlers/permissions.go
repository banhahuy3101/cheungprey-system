package handlers

import (
	"fmt"
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

func (h *PermissionHandler) ListPermissionModules(c *gin.Context) {
	rows, err := h.repo.ListPermissionModules()
	if err != nil {
		utils.InternalError(c, "Failed to load permission modules from database")
		return
	}

	var groups []models.PermissionGroup
	groupIndexMap := make(map[string]int)
	moduleIcons := make(map[string]string)
	humanLabels := make(map[string]string)

	for _, r := range rows {
		idx, exists := groupIndexMap[r.GroupKey]
		if !exists {
			idx = len(groups)
			groupIndexMap[r.GroupKey] = idx
			groups = append(groups, models.PermissionGroup{
				Key:   r.GroupKey,
				Label: r.GroupLabel,
				Icon:  r.GroupIcon,
				Items: []models.PermissionItem{},
			})
			moduleIcons[r.GroupKey] = r.GroupIcon
			humanLabels[r.GroupKey] = r.GroupLabel
		}

		actions := r.Actions
		if actions == nil {
			actions = make(map[string]models.PermissionAction)
		}

		groups[idx].Items = append(groups[idx].Items, models.PermissionItem{
			Key:       r.ItemKey,
			Label:     r.ItemLabel,
			AccessKey: r.AccessKey,
			Actions:   actions,
		})

		humanLabels[r.ItemKey] = r.ItemLabel
		for _, act := range actions {
			if act.Key != "" && act.Label != "" {
				humanLabels[act.Key] = act.Label
			}
		}
	}

	// Dynamic DB enhancement: Include any custom root modules from menu_items if not present
	if dbMenuItems, err := h.repo.ListMenuItems(); err == nil {
		knownKeys := make(map[string]bool)
		for _, r := range rows {
			knownKeys[r.GroupKey] = true
			knownKeys[r.ItemKey] = true
			if r.AccessKey != "" {
				knownKeys[r.AccessKey] = true
			}
		}
		knownKeys["membership"] = true
		knownKeys["dashboard"] = true
		knownKeys["settings"] = true

		for _, mi := range dbMenuItems {
			if (mi.ParentID == nil || mi.Type == "module") && mi.ModuleKey != "" {
				if !knownKeys[mi.ModuleKey] {
					knownKeys[mi.ModuleKey] = true
					label := mi.Title
					if mi.TitleEN != "" {
						label = fmt.Sprintf("%s (%s)", mi.Title, mi.TitleEN)
					}
					icon := mi.Icon
					if icon == "" {
						icon = "LuFolder"
					}
					groups = append(groups, models.PermissionGroup{
						Key:   mi.ModuleKey,
						Label: label,
						Icon:  icon,
						Items: []models.PermissionItem{
							{
								Key:       mi.ModuleKey,
								Label:     mi.Title,
								AccessKey: mi.ModuleKey,
								Actions: map[string]models.PermissionAction{
									"read":   {Key: fmt.Sprintf("%s_read", mi.ModuleKey), Label: fmt.Sprintf("មើល %s", mi.Title)},
									"create": {Key: fmt.Sprintf("%s_create", mi.ModuleKey), Label: fmt.Sprintf("បង្កើត %s", mi.Title)},
									"update": {Key: fmt.Sprintf("%s_update", mi.ModuleKey), Label: fmt.Sprintf("កែប្រែ %s", mi.Title)},
									"delete": {Key: fmt.Sprintf("%s_delete", mi.ModuleKey), Label: fmt.Sprintf("លុប %s", mi.Title)},
								},
							},
						},
					})
					moduleIcons[mi.ModuleKey] = icon
					humanLabels[mi.ModuleKey] = label
				}
			}
		}
	}

	utils.JSON(c, http.StatusOK, gin.H{
		"modules":      groups,
		"module_icons": moduleIcons,
		"human_labels": humanLabels,
	})
}

func (h *PermissionHandler) ListRoles(c *gin.Context) {
	list, err := h.repo.ListRoles()
	if err != nil {
		utils.InternalError(c, "Failed to load roles")
		return
	}
	utils.JSON(c, http.StatusOK, list)
}

func (h *PermissionHandler) CreateRole(c *gin.Context) {
	if !auth.RequireFeatureHandler(c, models.FeatureUsers) {
		return
	}
	roles, _ := auth.GetUserRoles(c)
	if len(roles) == 0 {
		if r, err := auth.GetUserRole(c); err == nil && r != "" {
			roles = []models.UserRole{r}
		}
	}
	if !h.repo.IsUserSystem(roles) {
		utils.Forbidden(c, "Only system roles (is_system = true) are allowed to create roles")
		return
	}
	var req models.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.repo.CreateRole(req.Role, req.Label); err != nil {
		msg := err.Error()
		if msg == "role already exists" {
			utils.BadRequest(c, msg)
			return
		}
		utils.InternalError(c, msg)
		return
	}
	utils.JSON(c, http.StatusCreated, gin.H{"message": "Role created"})
}

func (h *PermissionHandler) UpdateRole(c *gin.Context) {
	if !auth.RequireFeatureHandler(c, models.FeatureUsers) {
		return
	}
	role := c.Param("role")
	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if err := h.repo.UpdateRole(role, req.Label); err != nil {
		utils.InternalError(c, "Failed to update role")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Role updated"})
}

func (h *PermissionHandler) DeleteRole(c *gin.Context) {
	if !auth.RequireFeatureHandler(c, models.FeatureUsers) {
		return
	}
	role := c.Param("role")
	if err := h.repo.DeleteRole(role); err != nil {
		utils.InternalError(c, "Failed to delete role")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Role deleted"})
}
