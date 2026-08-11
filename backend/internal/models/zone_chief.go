package models

import (
	"time"

	"github.com/google/uuid"
)

type ZoneChiefAssignment struct {
	ID         uuid.UUID `json:"id"`
	ZoneCode   string    `json:"zone_code"`
	ZoneName   string    `json:"zone_name"`
	ZoneType   string    `json:"zone_type"`
	UserID     uuid.UUID `json:"user_id"`
	UserName   string    `json:"user_name"`
	AssignedBy *uuid.UUID `json:"assigned_by,omitempty"`
	AssignedAt time.Time  `json:"assigned_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type AssignZoneChiefRequest struct {
	ZoneCode string `json:"zone_code" binding:"required"`
	UserID   string `json:"user_id" binding:"required"`
}

type RemoveZoneChiefRequest struct {
	ZoneCode string `json:"zone_code" binding:"required"`
}
