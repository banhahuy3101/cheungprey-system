package models

import (
	"encoding/json"
	"time"
)

type SystemSetting struct {
	Key         string          `json:"key"`
	Value       json.RawMessage `json:"value"`
	Description string          `json:"description,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type UpdateSystemSettingRequest struct {
	Value any `json:"value" binding:"required"`
}
