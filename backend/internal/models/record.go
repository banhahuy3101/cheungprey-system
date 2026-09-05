package models

import (
	"time"

	"github.com/google/uuid"
)


type Province struct {
	ID        uuid.UUID `json:"id"`
	NameKh    string    `json:"name_kh"`
	NameEn    string    `json:"name_en"`
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
}

type District struct {
	ID         uuid.UUID `json:"id"`
	ProvinceID uuid.UUID `json:"province_id"`
	NameKh     string    `json:"name_kh"`
	NameEn     string    `json:"name_en"`
	Code       string    `json:"code"`
	CreatedAt  time.Time `json:"created_at"`
}

type Commune struct {
	ID         uuid.UUID `json:"id"`
	DistrictID uuid.UUID `json:"district_id"`
	NameKh     string    `json:"name_kh"`
	NameEn     string    `json:"name_en"`
	Code       string    `json:"code"`
	CreatedAt  time.Time `json:"created_at"`
}

type Village struct {
	ID        uuid.UUID `json:"id"`
	CommuneID uuid.UUID `json:"commune_id"`
	NameKh    string    `json:"name_kh"`
	NameEn    string    `json:"name_en"`
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
}

type UpdateUserRoleRequest struct {
	Role UserRole `json:"role" binding:"required"`
}

type Statistics struct {
	TotalUsers    int            `json:"total_users"`
	TotalRecords  int            `json:"total_records"`
	RecordsByRole map[string]int `json:"records_by_role,omitempty"`
}
