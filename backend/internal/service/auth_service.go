package service

import (
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

type AuthService struct {
	repo *repository.Repository
}

func NewAuthService(repo *repository.Repository) *AuthService {
	return &AuthService{repo: repo}
}

func (s *AuthService) CreateProfile(userID uuid.UUID, req *models.RegisterRequest) (*models.Profile, error) {
	role := req.Role
	if role == "" {
		role = models.RoleRecorder
	}

	profile := &models.Profile{
		ID:        userID,
		FullName:  req.FullName,
		Role:      role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if req.PhoneNumber != "" {
		profile.PhoneNumber = &req.PhoneNumber
	}

	if err := s.repo.CreateProfile(profile); err != nil {
		return nil, err
	}

	roles := []models.UserRole{role}
	if err := s.repo.SetUserRoles(userID, roles); err != nil {
		return nil, err
	}

	permSvc := NewPermissionService(s.repo)
	access, err := permSvc.GetUserAccess(userID)
	if err != nil || access == nil {
		return profile, err
	}
	return access.Profile, nil
}

func (s *AuthService) GetProfile(userID uuid.UUID) (*models.Profile, error) {
	profile, err := s.repo.GetProfileByID(userID)
	if err != nil || profile == nil {
		return profile, err
	}
	permSvc := NewPermissionService(s.repo)
	if err := permSvc.EnrichProfile(profile); err != nil {
		return profile, err
	}
	return profile, nil
}
