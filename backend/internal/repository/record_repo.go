package repository

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) CreateRecord(record *models.Record) error {
	_, _, err := r.AdminClient.From("records").
		Insert(record, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetRecordsByUser(userID uuid.UUID) ([]models.Record, error) {
	var records []models.Record
	_, err := r.AdminClient.From("records").
		Select("*", "exact", false).
		Eq("created_by", userID.String()).
		ExecuteTo(&records)
	if err != nil {
		return nil, fmt.Errorf("get user records: %w", err)
	}
	return records, nil
}

func (r *Repository) GetRecordsByCommune(communeID uuid.UUID) ([]models.Record, error) {
	var records []models.Record
	_, err := r.AdminClient.From("records").
		Select("*", "exact", false).
		Eq("commune_id", communeID.String()).
		ExecuteTo(&records)
	if err != nil {
		return nil, fmt.Errorf("get commune records: %w", err)
	}
	return records, nil
}

func (r *Repository) GetRecordsByVillage(villageID uuid.UUID) ([]models.Record, error) {
	var records []models.Record
	_, err := r.AdminClient.From("records").
		Select("*", "exact", false).
		Eq("village_id", villageID.String()).
		ExecuteTo(&records)
	if err != nil {
		return nil, fmt.Errorf("get village records: %w", err)
	}
	return records, nil
}

func (r *Repository) GetRecordsByDistrict(districtID uuid.UUID) ([]models.Record, error) {
	communes, err := r.GetCommunesByDistrict(districtID)
	if err != nil {
		return nil, err
	}
	if len(communes) == 0 {
		return []models.Record{}, nil
	}
	ids := make([]string, len(communes))
	for i, c := range communes {
		ids[i] = c.ID.String()
	}
	var records []models.Record
	_, err = r.AdminClient.From("records").
		Select("*", "exact", false).
		In("commune_id", ids).
		ExecuteTo(&records)
	if err != nil {
		return nil, fmt.Errorf("get district records: %w", err)
	}
	return records, nil
}

func (r *Repository) GetRecordByID(id uuid.UUID) (*models.Record, error) {
	var records []models.Record
	_, err := r.AdminClient.From("records").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&records)
	if err != nil {
		return nil, fmt.Errorf("get record: %w", err)
	}
	if len(records) == 0 {
		return nil, nil
	}
	return &records[0], nil
}

func (r *Repository) UpdateRecord(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("records").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteRecord(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("records").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetAllRecords() ([]models.Record, error) {
	var records []models.Record
	_, err := r.AdminClient.From("records").
		Select("*", "exact", false).
		ExecuteTo(&records)
	return records, err
}
