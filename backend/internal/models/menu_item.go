package models

import (
	"time"

	"github.com/google/uuid"
)

type MenuItem struct {
	ID         uuid.UUID   `json:"id"`
	ParentID   *uuid.UUID  `json:"parent_id,omitempty"`
	Title      string      `json:"title"`
	TitleEN    string      `json:"title_en"`
	ModuleKey  string      `json:"module_key"`
	SubModule  string      `json:"sub_module"`
	FeatureKey string      `json:"feature_key"`
	Path       string      `json:"path"`
	Icon       string      `json:"icon"`
	SortOrder  int         `json:"sort_order"`
	IsActive   bool        `json:"is_active"`
	IsVisible  bool        `json:"is_visible"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
	Children   []*MenuItem `json:"children,omitempty"`
}

type CreateMenuItemRequest struct {
	ParentID   *uuid.UUID `json:"parent_id,omitempty"`
	Title      string     `json:"title" binding:"required"`
	TitleEN    string     `json:"title_en"`
	ModuleKey  string     `json:"module_key"`
	SubModule  string     `json:"sub_module"`
	FeatureKey string     `json:"feature_key"`
	Path       string     `json:"path"`
	Icon       string     `json:"icon"`
	SortOrder  int        `json:"sort_order"`
	IsActive   *bool      `json:"is_active"`
	IsVisible  *bool      `json:"is_visible"`
}

type UpdateMenuItemRequest struct {
	ParentID   *uuid.UUID `json:"parent_id,omitempty"`
	Title      string     `json:"title"`
	TitleEN    string     `json:"title_en"`
	ModuleKey  string     `json:"module_key"`
	SubModule  string     `json:"sub_module"`
	FeatureKey string     `json:"feature_key"`
	Path       string     `json:"path"`
	Icon       string     `json:"icon"`
	SortOrder  *int       `json:"sort_order"`
	IsActive   *bool      `json:"is_active"`
	IsVisible  *bool      `json:"is_visible"`
}
