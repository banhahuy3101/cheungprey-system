package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	postgrest "github.com/supabase-community/postgrest-go"
)

type CronLogRecord struct {
	ID         uuid.UUID `json:"id,omitempty"`
	JobKey     string    `json:"job_key"`
	JobName    string    `json:"job_name"`
	Status     string    `json:"status"`
	LastRun    time.Time `json:"last_run"`
	Duration   string    `json:"duration"`
	Error      string    `json:"error,omitempty"`
	Details    []string  `json:"details,omitempty"`
	RetryCount int       `json:"retry_count"`
	MaxRetries int       `json:"max_retries"`
	CreatedAt  time.Time `json:"created_at,omitempty"`
}

func (r *Repository) SaveCronLog(logRecord CronLogRecord) error {
	payload := map[string]any{
		"job_key":     logRecord.JobKey,
		"job_name":    logRecord.JobName,
		"status":      logRecord.Status,
		"last_run":    logRecord.LastRun,
		"duration":    logRecord.Duration,
		"error":       logRecord.Error,
		"details":     logRecord.Details,
		"retry_count": logRecord.RetryCount,
		"max_retries": logRecord.MaxRetries,
	}
	_, _, err := r.AdminClient.From("cron_logs").
		Insert(payload, false, "", "", "").
		Execute()
	if err != nil {
		return fmt.Errorf("save cron log: %w", err)
	}
	return nil
}

func (r *Repository) GetRecentCronLogs(limit int) ([]CronLogRecord, error) {
	var logs []CronLogRecord
	if limit <= 0 {
		limit = 50
	}
	_, err := r.AdminClient.From("cron_logs").
		Select("*", "exact", false).
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(limit, "").
		ExecuteTo(&logs)
	if err != nil {
		return nil, fmt.Errorf("get cron logs: %w", err)
	}
	return logs, nil
}
