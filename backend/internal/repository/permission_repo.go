package repository

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

type userRoleRow struct {
	Role models.UserRole `json:"role"`
}

type rolePermissionRow struct {
	Role        models.UserRole `json:"role"`
	Permissions json.RawMessage `json:"permissions"`
}

func (r *Repository) GetUserRoles(userID uuid.UUID) ([]models.UserRole, error) {
	var rows []userRoleRow
	_, err := r.AdminClient.From("user_roles").
		Select("role", "exact", false).
		Eq("user_id", userID.String()).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	roles := make([]models.UserRole, len(rows))
	for i, row := range rows {
		roles[i] = row.Role
	}
	return roles, nil
}

func (r *Repository) SetUserRoles(userID uuid.UUID, roles []models.UserRole) error {
	_, _, err := r.AdminClient.From("user_roles").
		Delete("", "").
		Eq("user_id", userID.String()).
		Execute()
	if err != nil {
		return fmt.Errorf("clear user roles: %w", err)
	}
	if len(roles) == 0 {
		return nil
	}
	payload := make([]map[string]any, len(roles))
	for i, role := range roles {
		payload[i] = map[string]any{
			"user_id": userID.String(),
			"role":    role,
		}
	}
	_, _, err = r.AdminClient.From("user_roles").
		Insert(payload, false, "", "", "").
		Execute()
	if err != nil {
		return fmt.Errorf("set user roles: %w", err)
	}
	primary := models.PrimaryRole(roles)
	profileRole := primary
	if _, ok := models.RoleHierarchy[primary]; !ok {
		profileRole = models.RoleRegularUser
	}
	_, _, err = r.AdminClient.From("profiles").
		Update(map[string]any{"role": profileRole, "updated_at": "now()"}, "", "").
		Eq("id", userID.String()).
		Execute()
	return err
}

func (r *Repository) ListRolePermissions() ([]models.RolePermissions, error) {
	var rows []rolePermissionRow
	_, err := r.AdminClient.From("role_permissions").
		Select("role,permissions", "exact", false).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("list role permissions: %w", err)
	}
	result := make([]models.RolePermissions, 0, len(rows))
	for _, row := range rows {
		perms := decodePermissions(row.Permissions, row.Role)
		result = append(result, models.RolePermissions{
			Role:        row.Role,
			Permissions: perms,
		})
	}
	return result, nil
}

func (r *Repository) GetRolePermissions(role models.UserRole) (models.PermissionSet, error) {
	var rows []rolePermissionRow
	_, err := r.AdminClient.From("role_permissions").
		Select("role,permissions", "exact", false).
		Eq("role", string(role)).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("get role permissions: %w", err)
	}
	if len(rows) == 0 {
		return models.DefaultPermissionsForRole(role), nil
	}
	return decodePermissions(rows[0].Permissions, role), nil
}

func (r *Repository) GetAllRolePermissionsMap() (map[models.UserRole]models.PermissionSet, error) {
	list, err := r.ListRolePermissions()
	if err != nil {
		return nil, err
	}
	m := make(map[models.UserRole]models.PermissionSet, len(list))
	for _, item := range list {
		m[item.Role] = item.Permissions
	}
	for _, role := range []models.UserRole{
		models.RoleSuperAdmin, models.RoleAdmin, models.RoleDistrictChief,
		models.RoleCommuneChief, models.RoleCommuneClerk, models.RoleVillageChief,
		models.RoleRecorder, models.RoleRegularUser,
	} {
		if _, ok := m[role]; !ok {
			m[role] = models.DefaultPermissionsForRole(role)
		}
	}
	if roleList, err := r.ListRoles(); err == nil {
		for _, row := range roleList {
			role := models.UserRole(row.Role)
			if _, ok := m[role]; !ok {
				m[role] = models.DefaultPermissionsForRole(role)
			}
		}
	}
	return m, nil
}

func (r *Repository) UpdateRolePermissions(role models.UserRole, perms models.PermissionSet) error {
	normalized := normalizePermissions(perms)
	raw, err := json.Marshal(normalized)
	if err != nil {
		return err
	}
	var data any
	json.Unmarshal(raw, &data)
	_, _, err = r.AdminClient.From("role_permissions").
		Upsert(map[string]any{
			"role":        role,
			"permissions": data,
			"updated_at":  "now()",
		}, "", "", "").
		Execute()
	if err != nil {
		return fmt.Errorf("update role permissions: %w", err)
	}
	return nil
}

func decodePermissions(raw json.RawMessage, role models.UserRole) models.PermissionSet {
	defaults := models.DefaultPermissionsForRole(role)
	if len(raw) == 0 {
		return defaults
	}
	var m map[string]bool
	if err := json.Unmarshal(raw, &m); err != nil {
		return defaults
	}
	result := make(models.PermissionSet, len(models.AllFeatures))
	for _, f := range models.AllFeatures {
		if v, ok := m[string(f)]; ok {
			result[f] = v
		} else {
			result[f] = defaults[f]
		}
	}
	return result
}

func normalizePermissions(perms models.PermissionSet) map[string]bool {
	out := make(map[string]bool, len(models.AllFeatures))
	for _, f := range models.AllFeatures {
		out[string(f)] = perms[f]
	}
	return out
}

func (r *Repository) ListRoles() ([]models.Role, error) {
	byKey := make(map[string]models.Role, 16)
	for _, row := range builtinRoles() {
		byKey[row.Role] = row
	}

	var rows []models.Role
	if _, err := r.AdminClient.From("roles").
		Select("role,label,is_system", "exact", false).
		Order("is_system", nil).
		Order("role", nil).
		ExecuteTo(&rows); err == nil {
		for _, row := range rows {
			byKey[row.Role] = row
		}
	}

	if perms, err := r.ListRolePermissions(); err == nil {
		for _, item := range perms {
			key := string(item.Role)
			if _, ok := byKey[key]; !ok {
				byKey[key] = models.Role{Role: key, Label: key, IsSystem: false}
			}
		}
	}

	result := make([]models.Role, 0, len(byKey))
	for _, row := range byKey {
		result = append(result, row)
	}
	sortRoles(result)
	return result, nil
}

func sortRoles(rows []models.Role) {
	for i := 0; i < len(rows); i++ {
		for j := i + 1; j < len(rows); j++ {
			if rows[j].Role < rows[i].Role {
				rows[i], rows[j] = rows[j], rows[i]
			}
		}
	}
}

func builtinRoles() []models.Role {
	return []models.Role{
		{Role: "super_admin", Label: "Super Admin", IsSystem: true},
		{Role: "admin", Label: "Admin", IsSystem: true},
		{Role: "district_chief", Label: "District Chief", IsSystem: true},
		{Role: "commune_chief", Label: "Commune Chief", IsSystem: true},
		{Role: "commune_clerk", Label: "Commune Clerk", IsSystem: true},
		{Role: "village_chief", Label: "Village Chief", IsSystem: true},
		{Role: "recorder", Label: "Recorder", IsSystem: true},
		{Role: "regular_user", Label: "Regular User", IsSystem: true},
	}
}

func (r *Repository) CreateRole(role, label string) error {
	userRole := models.UserRole(role)
	if exists, err := r.roleExists(role); err != nil {
		return fmt.Errorf("check role: %w", err)
	} else if exists {
		return fmt.Errorf("role already exists")
	}

	_, _, catalogErr := r.AdminClient.From("roles").
		Insert(map[string]any{"role": role, "label": label, "is_system": false}, false, "", "", "").
		Execute()

	if err := r.UpdateRolePermissions(userRole, models.DefaultPermissionsForRole(userRole)); err != nil {
		if catalogErr != nil {
			return fmt.Errorf("create role permissions (apply migration 019_custom_roles.sql): %w", err)
		}
		return fmt.Errorf("seed role permissions: %w", err)
	}
	return nil
}

func (r *Repository) roleExists(role string) (bool, error) {
	list, err := r.ListRolePermissions()
	if err != nil {
		return false, err
	}
	for _, row := range list {
		if string(row.Role) == role {
			return true, nil
		}
	}
	return false, nil
}

func (r *Repository) UpdateRole(role, label string) error {
	_, _, err := r.AdminClient.From("roles").
		Update(map[string]any{"label": label, "updated_at": "now()"}, "", "").
		Eq("role", role).
		Execute()
	if err != nil {
		return fmt.Errorf("update role: %w", err)
	}
	return nil
}

func (r *Repository) DeleteRole(role string) error {
	if isSystemRole(role) {
		return fmt.Errorf("cannot delete system role")
	}
	_, _, _ = r.AdminClient.From("roles").
		Delete("", "").
		Eq("role", role).
		Eq("is_system", "false").
		Execute()
	_, _, err := r.AdminClient.From("role_permissions").
		Delete("", "").
		Eq("role", role).
		Execute()
	if err != nil {
		return fmt.Errorf("delete role permissions: %w", err)
	}
	return nil
}

func isSystemRole(role string) bool {
	switch models.UserRole(role) {
	case models.RoleSuperAdmin, models.RoleAdmin, models.RoleDistrictChief,
		models.RoleCommuneChief, models.RoleCommuneClerk, models.RoleVillageChief,
		models.RoleRecorder, models.RoleRegularUser:
		return true
	default:
		return false
	}
}

func (r *Repository) SeedRolePermissionsIfEmpty() error {
	list, err := r.ListRolePermissions()
	if err != nil {
		return err
	}
	if len(list) > 0 {
		return nil
	}
	for _, role := range []models.UserRole{
		models.RoleSuperAdmin, models.RoleAdmin, models.RoleDistrictChief,
		models.RoleCommuneChief, models.RoleCommuneClerk, models.RoleVillageChief,
		models.RoleRecorder, models.RoleRegularUser,
	} {
		if err := r.UpdateRolePermissions(role, models.DefaultPermissionsForRole(role)); err != nil {
			return err
		}
	}
	return nil
}
