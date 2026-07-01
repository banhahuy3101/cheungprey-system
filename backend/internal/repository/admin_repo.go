package repository

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListProvinces() ([]models.Province, error) {
	var provinces []models.Province
	_, err := r.AdminClient.From("provinces").
		Select("*", "exact", false).
		ExecuteTo(&provinces)
	if err != nil {
		return nil, fmt.Errorf("list provinces: %w", err)
	}
	return provinces, nil
}

func (r *Repository) GetDistrictsByProvince(provinceID uuid.UUID) ([]models.District, error) {
	var districts []models.District
	_, err := r.AdminClient.From("districts").
		Select("*", "exact", false).
		Eq("province_id", provinceID.String()).
		ExecuteTo(&districts)
	if err != nil {
		return nil, fmt.Errorf("get districts: %w", err)
	}
	return districts, nil
}

func (r *Repository) GetCommunesByDistrict(districtID uuid.UUID) ([]models.Commune, error) {
	var communes []models.Commune
	_, err := r.AdminClient.From("communes").
		Select("*", "exact", false).
		Eq("district_id", districtID.String()).
		ExecuteTo(&communes)
	if err != nil {
		return nil, fmt.Errorf("get communes: %w", err)
	}
	return communes, nil
}

func (r *Repository) GetCommuneByID(id uuid.UUID) (*models.Commune, error) {
	var communes []models.Commune
	_, err := r.AdminClient.From("communes").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&communes)
	if err != nil {
		return nil, fmt.Errorf("get commune: %w", err)
	}
	if len(communes) == 0 {
		return nil, nil
	}
	return &communes[0], nil
}

func (r *Repository) GetVillagesByCommune(communeID uuid.UUID) ([]models.Village, error) {
	var villages []models.Village
	_, err := r.AdminClient.From("villages").
		Select("*", "exact", false).
		Eq("commune_id", communeID.String()).
		ExecuteTo(&villages)
	if err != nil {
		return nil, fmt.Errorf("get villages: %w", err)
	}
	return villages, nil
}
