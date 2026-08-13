package repository

import (
	"fmt"
	"time"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListSystemSettings() ([]models.SystemSetting, error) {
	var settings []models.SystemSetting
	_, err := r.AdminClient.From("system_settings").
		Select("*", "exact", false).
		ExecuteTo(&settings)
	if err != nil {
		return nil, fmt.Errorf("list system settings: %w", err)
	}
	return settings, nil
}

func (r *Repository) GetSystemSetting(key string) (*models.SystemSetting, error) {
	var settings []models.SystemSetting
	_, err := r.AdminClient.From("system_settings").
		Select("*", "exact", false).
		Eq("key", key).
		ExecuteTo(&settings)
	if err != nil {
		return nil, fmt.Errorf("get system setting %s: %w", key, err)
	}
	if len(settings) == 0 {
		return nil, nil
	}
	return &settings[0], nil
}

func (r *Repository) UpsertSystemSetting(key string, value any, description string) error {
	payload := map[string]any{
		"key":        key,
		"value":      value,
		"updated_at": time.Now(),
	}
	if description != "" {
		payload["description"] = description
	}
	_, _, err := r.AdminClient.From("system_settings").
		Upsert(payload, "", "representation", "").
		Execute()
	if err != nil {
		return fmt.Errorf("upsert system setting %s: %w", key, err)
	}
	return nil
}
