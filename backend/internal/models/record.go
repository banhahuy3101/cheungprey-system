package models

import (
	"time"

	"github.com/google/uuid"
)

type Record struct {
	ID          uuid.UUID  `json:"id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Data        any        `json:"data,omitempty"`
	CommuneID   *uuid.UUID `json:"commune_id,omitempty"`
	VillageID   *uuid.UUID `json:"village_id,omitempty"`
	CreatedBy   uuid.UUID  `json:"created_by"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateRecordRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description,omitempty"`
	Data        any    `json:"data,omitempty"`
	CommuneID   string `json:"commune_id,omitempty"`
	VillageID   string `json:"village_id,omitempty"`
	Status      string `json:"status,omitempty"`
}

type UpdateRecordRequest struct {
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	Data        any    `json:"data,omitempty"`
	Status      string `json:"status,omitempty"`
}

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
