package cron

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

// JobStatus holds the result of a single cron job execution.
type JobStatus struct {
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	LastRun   time.Time `json:"last_run"`
	NextRun   time.Time `json:"next_run"`
	Duration  string    `json:"duration"`
	Error     string    `json:"error,omitempty"`
	Details   []string  `json:"details,omitempty"`
}

// SchedulerStatus holds the overall scheduler state for the API.
type SchedulerStatus struct {
	Running   bool        `json:"running"`
	Timezone  string      `json:"timezone"`
	NextRun   string      `json:"next_run"`
	LastRun   string      `json:"last_run"`
	Jobs      []JobStatus `json:"jobs"`
}

// Scheduler runs background cron jobs to keep Supabase alive and perform
// nightly maintenance across all modules.
type Scheduler struct {
	repo     *repository.Repository
	timezone *time.Location
	stopCh   chan struct{}
	running  bool

	tgToken  string
	tgChatID string

	mu        sync.RWMutex
	lastRun   time.Time
	nextRun   time.Time
	jobLogs   []JobStatus
}

// New creates a new Scheduler targeting Asia/Phnom_Penh timezone (UTC+7).
func New(repo *repository.Repository) *Scheduler {
	tz, err := time.LoadLocation("Asia/Phnom_Penh")
	if err != nil {
		tz = time.FixedZone("ICT", 7*3600) // fallback UTC+7
	}
	return &Scheduler{
		repo:     repo,
		timezone: tz,
		tgToken:  os.Getenv("TELEGRAM_BOT_TOKEN"),
		tgChatID: os.Getenv("TELEGRAM_CHAT_ID"),
		stopCh:   make(chan struct{}),
	}
}

// Start launches the nightly cron scheduler in a goroutine.
func (s *Scheduler) Start() {
	s.mu.Lock()
	s.running = true
	s.mu.Unlock()

	go func() {
		log.Printf("[CRON] Scheduler started (timezone: %s)", s.timezone)
		for {
			now := time.Now().In(s.timezone)
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, s.timezone)
			wait := next.Sub(now)

			s.mu.Lock()
			s.nextRun = next
			s.mu.Unlock()

			log.Printf("[CRON] Next run scheduled at %s (in %s)", next.Format("2006-01-02 15:04:05"), wait.Round(time.Second))

			select {
			case <-time.After(wait):
				s.runAll()
			case <-s.stopCh:
				s.mu.Lock()
				s.running = false
				s.mu.Unlock()
				log.Println("[CRON] Scheduler stopped")
				return
			}
		}
	}()
}

// Stop gracefully stops the scheduler.
func (s *Scheduler) Stop() {
	close(s.stopCh)
}

// RunNow triggers all jobs immediately (for manual trigger via API).
func (s *Scheduler) RunNow() {
	go s.runAll()
}

// Status returns the current scheduler status for API response.
func (s *Scheduler) Status() SchedulerStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	lastRunStr := ""
	if !s.lastRun.IsZero() {
		lastRunStr = s.lastRun.In(s.timezone).Format("2006-01-02 15:04:05")
	}
	nextRunStr := ""
	if !s.nextRun.IsZero() {
		nextRunStr = s.nextRun.In(s.timezone).Format("2006-01-02 15:04:05")
	}

	jobs := make([]JobStatus, len(s.jobLogs))
	copy(jobs, s.jobLogs)

	return SchedulerStatus{
		Running:  s.running,
		Timezone: s.timezone.String(),
		NextRun:  nextRunStr,
		LastRun:  lastRunStr,
		Jobs:     jobs,
	}
}

// runAll executes all nightly maintenance jobs.
func (s *Scheduler) runAll() {
	start := time.Now()
	log.Println("[CRON] ===== Nightly maintenance started =====")

	var jobs []JobStatus

	jobs = append(jobs, s.pingSupabase())
	jobs = append(jobs, s.logModuleCounts())

	elapsed := time.Since(start).Round(time.Millisecond)
	log.Printf("[CRON] ===== Nightly maintenance completed in %s =====", elapsed)

	s.mu.Lock()
	s.lastRun = time.Now()
	s.jobLogs = jobs
	s.mu.Unlock()

	s.notifyTelegram(jobs, elapsed)
}

// pingSupabase performs a lightweight SELECT on core tables to keep
// the Supabase database active and prevent free-tier pausing.
func (s *Scheduler) pingSupabase() JobStatus {
	start := time.Now()
	tables := []string{
		"profiles",
		"role_permissions",
		"report_documents",
		"performance_domains",
		"performance_periods",
		"fms_chart_of_accounts",
		"zones",
	}

	var details []string
	var lastErr string

	for _, table := range tables {
		var result []map[string]any
		_, err := s.repo.AdminClient.From(table).
			Select("id", "exact", false).
			Limit(1, "").
			ExecuteTo(&result)
		if err != nil {
			msg := table + ": ERROR - " + err.Error()
			log.Printf("[CRON] Ping %s: ERROR - %v", table, err)
			details = append(details, msg)
			lastErr = msg
		} else {
			msg := table + ": OK"
			log.Printf("[CRON] Ping %s: OK (%d rows)", table, len(result))
			details = append(details, msg)
		}
	}

	status := "success"
	if lastErr != "" {
		status = "partial_error"
	}

	return JobStatus{
		Name:     "Ping Supabase",
		Status:   status,
		LastRun:  start,
		Duration: time.Since(start).Round(time.Millisecond).String(),
		Error:    lastErr,
		Details:  details,
	}
}

// logModuleCounts queries row counts from key tables for nightly monitoring.
func (s *Scheduler) logModuleCounts() JobStatus {
	start := time.Now()
	counts := []struct {
		table string
		label string
	}{
		{"profiles", "Users"},
		{"report_documents", "Report Documents"},
		{"performance_data", "Performance Data"},
		{"zones", "Zones"},
		{"fms_transactions", "FMS Transactions"},
		{"records", "Records"},
		{"members", "Members"},
	}

	var details []string
	var lastErr string

	for _, c := range counts {
		var rows []map[string]any
		_, err := s.repo.AdminClient.From(c.table).
			Select("id", "exact", false).
			ExecuteTo(&rows)
		if err != nil {
			msg := c.label + ": ERROR - " + err.Error()
			log.Printf("[CRON] Count %s: ERROR - %v", c.label, err)
			details = append(details, msg)
			lastErr = msg
		} else {
			log.Printf("[CRON] Count %s: %d", c.label, len(rows))
			details = append(details, fmt.Sprintf("%s: %d", c.label, len(rows)))
		}
	}

	status := "success"
	if lastErr != "" {
		status = "partial_error"
	}

	return JobStatus{
		Name:     "Module Counts",
		Status:   status,
		LastRun:  start,
		Duration: time.Since(start).Round(time.Millisecond).String(),
		Error:    lastErr,
		Details:  details,
	}
}

func (s *Scheduler) notifyTelegram(jobs []JobStatus, elapsed time.Duration) {
	if s.tgToken == "" || s.tgChatID == "" {
		return
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("\xf0\x9f\x95\x9b <b>Nightly Maintenance</b> — %s\n", time.Now().In(s.timezone).Format("2006-01-02 15:04")))
	sb.WriteString(fmt.Sprintf("Completed in <b>%s</b>\n", elapsed.Round(time.Millisecond)))

	for _, job := range jobs {
		emoji := "\xe2\x9c\x85"
		if job.Status != "success" {
			emoji = "\xe2\x9a\xa0\xef\xb8\x8f"
		}
		sb.WriteString(fmt.Sprintf("\n%s <b>%s</b> (%s)\n", emoji, job.Name, job.Duration))
		for _, d := range job.Details {
			sb.WriteString(fmt.Sprintf("  \xe2\x80\xa2 %s\n", escapeTelegram(d)))
		}
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", s.tgToken)
	body := url.Values{
		"chat_id":                  {s.tgChatID},
		"text":                     {sb.String()},
		"parse_mode":               {"HTML"},
		"disable_web_page_preview": {"true"},
	}

	resp, err := http.Post(apiURL, "application/x-www-form-urlencoded", bytes.NewBufferString(body.Encode()))
	if err != nil {
		log.Printf("[CRON] Telegram notify failed: %v", err)
		return
	}
	resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("[CRON] Telegram API returned %d", resp.StatusCode)
	}
}

func escapeTelegram(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}

