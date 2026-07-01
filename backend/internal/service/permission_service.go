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
	return nil
}
