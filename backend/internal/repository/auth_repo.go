package repository

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	gotrue "github.com/supabase-community/gotrue-go/types"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) GetProfileByID(id uuid.UUID) (*models.Profile, error) {
	var profiles []models.Profile
	_, err := r.AdminClient.From("profiles").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&profiles)
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	if len(profiles) == 0 {
		return nil, nil
	}
	return &profiles[0], nil
}

func (r *Repository) GetProfileByEmail(email string) (*models.Profile, error) {
	var profiles []models.Profile
	_, err := r.AdminClient.From("profiles").
		Select("*", "exact", false).
		Eq("email", email).
		ExecuteTo(&profiles)
	if err != nil {
		return nil, fmt.Errorf("get profile by email: %w", err)
	}
	if len(profiles) == 0 {
		return nil, nil
	}
	return &profiles[0], nil
}

func (r *Repository) CreateProfile(profile *models.Profile) error {
	payload := map[string]any{
		"id":           profile.ID,
		"full_name":    profile.FullName,
		"role":         profile.Role,
		"phone_number": profile.PhoneNumber,
		"commune_id":   profile.CommuneID,
		"village_id":   profile.VillageID,
	}
	if profile.Email != "" {
		payload["email"] = profile.Email
	}
	if profile.ZoneCode != nil && *profile.ZoneCode != "" {
		payload["zone_code"] = *profile.ZoneCode
	}
	var inserted []models.Profile
	_, err := r.AdminClient.From("profiles").
		Insert(payload, false, "", "*", "").
		ExecuteTo(&inserted)
	if err != nil {
		return err
	}
	if len(inserted) > 0 {
		*profile = inserted[0]
	}
	return nil
}

func (r *Repository) UpdateProfile(id uuid.UUID, req *models.UpdateProfileRequest) error {
	body := map[string]any{}
	if req.FullName != "" {
		body["full_name"] = req.FullName
	}
	if req.PhoneNumber != "" {
		body["phone_number"] = req.PhoneNumber
	}
	if req.CommuneID != "" {
		body["commune_id"] = req.CommuneID
	}
	if req.VillageID != "" {
		body["village_id"] = req.VillageID
	}
	body["updated_at"] = "now()"

	raw, _ := json.Marshal(body)
	var data any
	json.Unmarshal(raw, &data)

	_, _, err := r.AdminClient.From("profiles").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) UpdateUserRole(id uuid.UUID, role models.UserRole) error {
	_, _, err := r.AdminClient.From("profiles").
		Update(map[string]any{
			"role":       role,
			"updated_at": "now()",
		}, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) AdminUpdateProfile(id uuid.UUID, req *models.AdminUpdateUserRequest) error {
	body := map[string]any{}
	if req.FullName != "" {
		body["full_name"] = req.FullName
	}
	if req.PhoneNumber != "" {
		body["phone_number"] = req.PhoneNumber
	}
	if req.Role != "" {
		body["role"] = req.Role
	}
	if req.CommuneID != "" {
		body["commune_id"] = req.CommuneID
	}
	if req.VillageID != "" {
		body["village_id"] = req.VillageID
	}
	if req.ZoneCode != "" {
		body["zone_code"] = req.ZoneCode
	}
	body["updated_at"] = "now()"

	raw, _ := json.Marshal(body)
	var data any
	json.Unmarshal(raw, &data)

	_, _, err := r.AdminClient.From("profiles").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteProfile(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("profiles").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) ListUsers() ([]models.Profile, error) {
	var profiles []models.Profile
	_, err := r.AdminClient.From("profiles").
		Select("*", "exact", false).
		ExecuteTo(&profiles)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return profiles, nil
}

func (r *Repository) ListAdminUsers() ([]models.AdminUser, error) {
	profiles, err := r.ListUsers()
	if err != nil {
		return nil, err
	}

	emailByID := map[string]string{}
	if authResp, err := r.AdminClient.Auth.AdminListUsers(); err == nil && authResp != nil {
		for _, u := range authResp.Users {
			emailByID[u.ID.String()] = u.Email
		}
	}

	zoneNames := map[string]string{}
	var zones []struct {
		ZoneCode string `json:"zone_code"`
		NameKh   string `json:"name_kh"`
	}
	if _, err := r.AdminClient.From("geographic_zones").
		Select("zone_code,name_kh", "exact", false).
		ExecuteTo(&zones); err == nil {
		for _, z := range zones {
			zoneNames[z.ZoneCode] = z.NameKh
		}
	}

	users := make([]models.AdminUser, 0, len(profiles))
	for _, p := range profiles {
		email := p.Email
		if email == "" {
			email = emailByID[p.ID.String()]
		}
		zoneName := ""
		if p.ZoneCode != nil {
			zoneName = zoneNames[*p.ZoneCode]
		}
		roles, _ := r.GetUserRoles(p.ID)
		if len(roles) == 0 && p.Role != "" {
			roles = []models.UserRole{p.Role}
		}
		primary := models.PrimaryRole(roles)
		users = append(users, models.AdminUser{
			ID:          p.ID,
			FullName:    p.FullName,
			Email:       email,
			PhoneNumber: p.PhoneNumber,
			ZoneCode:    p.ZoneCode,
			ZoneName:    zoneName,
			CommuneID:   p.CommuneID,
			VillageID:   p.VillageID,
			Role:        primary,
			Roles:       roles,
			CreatedAt:   p.CreatedAt,
			UpdatedAt:   p.UpdatedAt,
		})
	}
	return users, nil
}

func (r *Repository) AdminResetUserPassword(id uuid.UUID, password string) error {
	_, err := r.AdminClient.Auth.AdminUpdateUser(gotrue.AdminUpdateUserRequest{
		UserID:   id,
		Password: password,
	})
	if err != nil {
		return fmt.Errorf("reset password: %w", err)
	}
	return nil
}
