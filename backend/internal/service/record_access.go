package service

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

type RecordAccessContext struct {
	UserID    uuid.UUID
	Role      models.UserRole
	CommuneID *uuid.UUID
	VillageID *uuid.UUID
}

func RecordAccessFromProfile(userID uuid.UUID, profile *models.Profile) RecordAccessContext {
	ctx := RecordAccessContext{UserID: userID, Role: models.RoleRegularUser}
	if profile != nil {
		ctx.Role = profile.Role
		if ctx.Role == "" {
			ctx.Role = models.RoleRegularUser
		}
		ctx.CommuneID = profile.CommuneID
		ctx.VillageID = profile.VillageID
	}
	return ctx
}

func (s *RecordService) CanCreateRecord(ctx RecordAccessContext) bool {
	switch ctx.Role {
	case models.RoleSuperAdmin, models.RoleAdmin,
		models.RoleDistrictChief, models.RoleCommuneChief, models.RoleCommuneClerk,
		models.RoleVillageChief, models.RoleRecorder:
		return true
	default:
		return false
	}
}

func (s *RecordService) CanAccessRecord(ctx RecordAccessContext, record *models.Record, write bool) bool {
	if record == nil {
		return false
	}
	switch ctx.Role {
	case models.RoleSuperAdmin, models.RoleAdmin:
		return true
	case models.RoleDistrictChief:
		if ctx.CommuneID == nil || record.CommuneID == nil {
			return false
		}
		return s.recordInUserDistrict(ctx, *record.CommuneID)
	case models.RoleCommuneChief, models.RoleCommuneClerk:
		return ctx.CommuneID != nil && record.CommuneID != nil && *record.CommuneID == *ctx.CommuneID
	case models.RoleVillageChief:
		if ctx.VillageID != nil && record.VillageID != nil && *record.VillageID == *ctx.VillageID {
			return true
		}
		return ctx.CommuneID != nil && record.CommuneID != nil && *record.CommuneID == *ctx.CommuneID
	case models.RoleRecorder:
		if write {
			return record.CreatedBy == ctx.UserID
		}
		return record.CreatedBy == ctx.UserID
	default:
		return record.CreatedBy == ctx.UserID
	}
}

func (s *RecordService) recordInUserDistrict(ctx RecordAccessContext, recordCommuneID uuid.UUID) bool {
	if ctx.CommuneID == nil {
		return false
	}
	userCommune, err := s.repo.GetCommuneByID(*ctx.CommuneID)
	if err != nil || userCommune == nil {
		return false
	}
	recordCommune, err := s.repo.GetCommuneByID(recordCommuneID)
	if err != nil || recordCommune == nil {
		return false
	}
	return userCommune.DistrictID == recordCommune.DistrictID
}

func (s *RecordService) GetRecords(ctx RecordAccessContext) ([]models.Record, error) {
	switch ctx.Role {
	case models.RoleSuperAdmin, models.RoleAdmin:
		return s.repo.GetAllRecords()
	case models.RoleDistrictChief:
		if ctx.CommuneID == nil {
			return []models.Record{}, nil
		}
		userCommune, err := s.repo.GetCommuneByID(*ctx.CommuneID)
		if err != nil || userCommune == nil {
			return nil, fmt.Errorf("get user commune: %w", err)
		}
		return s.repo.GetRecordsByDistrict(userCommune.DistrictID)
	case models.RoleCommuneChief, models.RoleCommuneClerk:
		if ctx.CommuneID == nil {
			return []models.Record{}, nil
		}
		return s.repo.GetRecordsByCommune(*ctx.CommuneID)
	case models.RoleVillageChief:
		if ctx.VillageID != nil {
			return s.repo.GetRecordsByVillage(*ctx.VillageID)
		}
		if ctx.CommuneID != nil {
			return s.repo.GetRecordsByCommune(*ctx.CommuneID)
		}
		return []models.Record{}, nil
	default:
		if models.RoleHierarchy[ctx.Role] < models.RoleHierarchy[models.RoleRecorder] {
			return []models.Record{}, nil
		}
		return s.repo.GetRecordsByUser(ctx.UserID)
	}
}
