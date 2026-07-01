package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

type RecordService struct {
	repo *repository.Repository
}

func NewRecordService(repo *repository.Repository) *RecordService {
	return &RecordService{repo: repo}
}

func (s *RecordService) CreateRecord(userID uuid.UUID, profile *models.Profile, req *models.CreateRecordRequest) (*models.Record, error) {
	access := RecordAccessFromProfile(userID, profile)
	if !s.CanCreateRecord(access) {
		return nil, fmt.Errorf("forbidden")
	}

	record := &models.Record{
		ID:        uuid.New(),
		Title:     req.Title,
		CreatedBy: userID,
		Status:    "draft",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if req.Description != "" {
		record.Description = &req.Description
	}
	if req.Data != nil {
		record.Data = req.Data
	}
	if req.Status != "" {
		record.Status = req.Status
	}

	if req.CommuneID != "" {
		cid, err := uuid.Parse(req.CommuneID)
		if err == nil {
			record.CommuneID = &cid
		}
	} else if access.CommuneID != nil {
		record.CommuneID = access.CommuneID
	}
	if req.VillageID != "" {
		vid, err := uuid.Parse(req.VillageID)
		if err == nil {
			record.VillageID = &vid
		}
	} else if access.VillageID != nil {
		record.VillageID = access.VillageID
	}

	if err := s.repo.CreateRecord(record); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *RecordService) GetRecordByID(ctx RecordAccessContext, id uuid.UUID) (*models.Record, error) {
	record, err := s.repo.GetRecordByID(id)
	if err != nil || record == nil {
		return record, err
	}
	if !s.CanAccessRecord(ctx, record, false) {
		return nil, fmt.Errorf("forbidden")
	}
	return record, nil
}

func (s *RecordService) UpdateRecord(ctx RecordAccessContext, id uuid.UUID, req *models.UpdateRecordRequest) error {
	record, err := s.repo.GetRecordByID(id)
	if err != nil {
		return err
	}
	if record == nil || !s.CanAccessRecord(ctx, record, true) {
		return fmt.Errorf("forbidden")
	}
	data := map[string]any{}
	if req.Title != "" {
		data["title"] = req.Title
	}
	if req.Description != "" {
		data["description"] = req.Description
	}
	if req.Data != nil {
		data["data"] = req.Data
	}
	if req.Status != "" {
		data["status"] = req.Status
	}
	data["updated_at"] = time.Now()

	return s.repo.UpdateRecord(id, data)
}

func (s *RecordService) DeleteRecord(ctx RecordAccessContext, id uuid.UUID) error {
	record, err := s.repo.GetRecordByID(id)
	if err != nil {
		return err
	}
	if record == nil || !s.CanAccessRecord(ctx, record, true) {
		return fmt.Errorf("forbidden")
	}
	return s.repo.DeleteRecord(id)
}
