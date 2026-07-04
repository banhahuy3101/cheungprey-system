package service

import (
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

type PermissionService struct {
	repo *repository.Repository
}

func NewPermissionService(repo *repository.Repository) *PermissionService {
	return &PermissionService{repo: repo}
}

func (s *PermissionService) GetUserAccess(userID uuid.UUID) (*models.UserAccess, error) {
	profile, err := s.repo.GetProfileByID(userID)
	if err != nil {
		return nil, err
	}
	if profile == nil {
		return nil, nil
	}

	roles, err := s.repo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		role := profile.Role
		if role == "" {
			role = models.RoleRegularUser
		}
		roles = []models.UserRole{role}
	}

	rolePerms, err := s.repo.GetAllRolePermissionsMap()
	if err != nil {
		return nil, err
	}

	merged := models.MergePermissions(rolePerms, roles)
	primary := models.PrimaryRole(roles)

	profile.Role = primary
	profile.Roles = roles
	profile.Permissions = merged
	if profile.ZoneCode == nil || *profile.ZoneCode == "" {
		if z := s.ResolveProfileZoneCode(profile); z != "" {
			profile.ZoneCode = &z
		}
	}

	return &models.UserAccess{
		Profile:     profile,
		Roles:       roles,
		Permissions: merged,
		PrimaryRole: primary,
	}, nil
}

func (s *PermissionService) EnrichProfile(profile *models.Profile) error {
	if profile == nil {
		return nil
	}
	access, err := s.GetUserAccess(profile.ID)
	if err != nil || access == nil {
		return err
	}
	profile.Roles = access.Roles
	profile.Permissions = access.Permissions
	profile.Role = access.PrimaryRole
	if profile.ZoneCode == nil || *profile.ZoneCode == "" {
		if z := s.ResolveProfileZoneCode(profile); z != "" {
			profile.ZoneCode = &z
		}
	}
	return nil
}

// ResolveProfileZoneCode derives a finance zone from profile fields when zone_code is unset.
func (s *PermissionService) ResolveProfileZoneCode(profile *models.Profile) string {
	if profile == nil {
		return ""
	}
	if profile.ZoneCode != nil && *profile.ZoneCode != "" {
		return NormalizeFinanceZoneCode(*profile.ZoneCode)
	}
	if profile.CommuneID != nil {
		if c, err := s.repo.GetCommuneByID(*profile.CommuneID); err == nil && c != nil && c.Code != "" {
			return NormalizeFinanceZoneCode(c.Code)
		}
	}
	if profile.VillageID != nil {
		if v, err := s.repo.GetVillageByID(*profile.VillageID); err == nil && v != nil && v.Code != "" {
			return NormalizeFinanceZoneCode(v.Code)
		}
	}
	if profile.CommuneID != nil {
		if c, err := s.repo.GetCommuneByID(*profile.CommuneID); err == nil && c != nil {
			if d, err := s.repo.GetDistrictByID(c.DistrictID); err == nil && d != nil && d.Code != "" {
				if profile.Role == models.RoleDistrictChief {
					return d.Code
				}
			}
		}
	}
	if profile.Role == models.RoleDistrictChief {
		return "0303"
	}
	return ""
}
