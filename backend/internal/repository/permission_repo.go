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
	_, _, err = r.AdminClient.From("profiles").
		Update(map[string]any{"role": primary, "updated_at": "now()"}, "", "").
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
