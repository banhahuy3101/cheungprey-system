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
	ctx := RecordAccessContext{UserID: userID}
	if profile != nil {
		ctx.Role = profile.Role
		ctx.CommuneID = profile.CommuneID
		ctx.VillageID = profile.VillageID
	}
	return ctx
}

func (s *RecordService) CanCreateRecord(ctx RecordAccessContext) bool {
	return ctx.Role != ""
}

func (s *RecordService) CanAccessRecord(ctx RecordAccessContext, record *models.Record, write bool) bool {
	if record == nil {
		return false
	}
	r := string(ctx.Role)
	switch r {
	case "super_admin", "admin":
		return true
	case "district_chief":
		if ctx.CommuneID == nil || record.CommuneID == nil {
			return false
		}
		return s.recordInUserDistrict(ctx, *record.CommuneID)
	case "commune_chief", "commune_clerk":
		return ctx.CommuneID != nil && record.CommuneID != nil && *record.CommuneID == *ctx.CommuneID
	case "village_chief":
		if ctx.VillageID != nil && record.VillageID != nil && *record.VillageID == *ctx.VillageID {
			return true
		}
		return ctx.CommuneID != nil && record.CommuneID != nil && *record.CommuneID == *ctx.CommuneID
	case "recorder":
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
	r := string(ctx.Role)
	switch r {
	case "super_admin", "admin":
		return s.repo.GetAllRecords()
	case "district_chief":
		if ctx.CommuneID == nil {
			return []models.Record{}, nil
		}
		userCommune, err := s.repo.GetCommuneByID(*ctx.CommuneID)
		if err != nil || userCommune == nil {
			return nil, fmt.Errorf("get user commune: %w", err)
		}
		return s.repo.GetRecordsByDistrict(userCommune.DistrictID)
	case "commune_chief", "commune_clerk":
		if ctx.CommuneID == nil {
			return []models.Record{}, nil
		}
		return s.repo.GetRecordsByCommune(*ctx.CommuneID)
	case "village_chief":
		if ctx.VillageID != nil {
			return s.repo.GetRecordsByVillage(*ctx.VillageID)
		}
		if ctx.CommuneID != nil {
			return s.repo.GetRecordsByCommune(*ctx.CommuneID)
		}
		return []models.Record{}, nil
	default:
		return s.repo.GetRecordsByUser(ctx.UserID)
	}
}
