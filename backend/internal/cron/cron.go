package cron

import (
	"bytes"
	"encoding/json"
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
	Key        string    `json:"key"`
	Name       string    `json:"name"`
	Status     string    `json:"status"`
	LastRun    time.Time `json:"last_run"`
	NextRun    time.Time `json:"next_run,omitempty"`
	Duration   string    `json:"duration"`
	Error      string    `json:"error,omitempty"`
	Details    []string  `json:"details,omitempty"`
	RetryCount int       `json:"retry_count"`
	MaxRetries int       `json:"max_retries"`
}

type TelegramInfo struct {
	Enabled     bool   `json:"enabled"`
	ChatID      string `json:"chat_id,omitempty"`
	BotUsername string `json:"bot_username,omitempty"`
	Link        string `json:"link,omitempty"`
}

// SchedulerStatus holds the overall scheduler state for the API.
type SchedulerStatus struct {
	Running  bool         `json:"running"`
	Timezone string       `json:"timezone"`
	NextRun  string       `json:"next_run"`
	LastRun  string       `json:"last_run"`
	Jobs     []JobStatus  `json:"jobs"`
	Telegram TelegramInfo `json:"telegram"`
}

// Scheduler runs background cron jobs to keep Supabase alive and perform
// nightly maintenance across all modules.
type Scheduler struct {
	repo     *repository.Repository
	timezone *time.Location
	stopCh   chan struct{}
	running  bool

	tgToken       string
	tgChatID      string
	tgBotUsername string

	mu      sync.RWMutex
	lastRun time.Time
	nextRun time.Time
	jobLogs []JobStatus
}

// New creates a new Scheduler targeting Asia/Phnom_Penh timezone (UTC+7).
func New(repo *repository.Repository) *Scheduler {
	tz, err := time.LoadLocation("Asia/Phnom_Penh")
	if err != nil {
		tz = time.FixedZone("ICT", 7*3600) // fallback UTC+7
	}
	s := &Scheduler{
		repo:     repo,
		timezone: tz,
		tgToken:  os.Getenv("TELEGRAM_BOT_TOKEN"),
		tgChatID: os.Getenv("TELEGRAM_CHAT_ID"),
		stopCh:   make(chan struct{}),
	}
	go s.fetchBotUsername()
	s.loadLogsFromDB()
	return s
}

func (s *Scheduler) fetchBotUsername() {
	botUsername := os.Getenv("TELEGRAM_BOT_USERNAME")
	if botUsername != "" {
		s.tgBotUsername = strings.TrimPrefix(botUsername, "@")
		return
	}

	if s.tgToken != "" {
		apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/getMe", s.tgToken)
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get(apiURL)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				var result struct {
					OK     bool `json:"ok"`
					Result struct {
						Username string `json:"username"`
					} `json:"result"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && result.OK && result.Result.Username != "" {
					s.tgBotUsername = result.Result.Username
					log.Printf("[CRON] Telegram bot username resolved: @%s", s.tgBotUsername)
					return
				}
			}
		}
	}

	// Default fallback
	s.tgBotUsername = "cheungprey_system_bot"
}

func (s *Scheduler) loadLogsFromDB() {
	if s.repo == nil {
		s.initDefaultJobTemplates()
		return
	}
	logs, err := s.repo.GetRecentCronLogs(30)
	if err != nil || len(logs) == 0 {
		s.initDefaultJobTemplates()
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	latestJobs := make(map[string]JobStatus)
	for _, l := range logs {
		if _, exists := latestJobs[l.JobKey]; !exists {
			latestJobs[l.JobKey] = JobStatus{
				Key:        l.JobKey,
				Name:       l.JobName,
				Status:     l.Status,
				LastRun:    l.LastRun,
				Duration:   l.Duration,
				Error:      l.Error,
				Details:    l.Details,
				RetryCount: l.RetryCount,
				MaxRetries: l.MaxRetries,
			}
			if s.lastRun.Before(l.LastRun) {
				s.lastRun = l.LastRun
			}
		}
	}
	jobList := make([]JobStatus, 0, len(latestJobs))
	for _, j := range latestJobs {
		jobList = append(jobList, j)
	}
	s.jobLogs = jobList
	if len(s.jobLogs) == 0 {
		s.initDefaultJobTemplates()
	}
}

func (s *Scheduler) initDefaultJobTemplates() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.jobLogs) == 0 {
		s.jobLogs = []JobStatus{
			{
				Key:        "ping_supabase",
				Name:       "Ping Supabase (រក្សាទុក DB ឲ្យនៅសកម្ម)",
				Status:     "idle",
				MaxRetries: 3,
				Details:    []string{"សួរទិន្នន័យពី profiles, role_permissions, report_documents, fms_chart_of_accounts, zones"},
			},
			{
				Key:        "log_module_counts",
				Name:       "Module Counts (ត្រួតពិនិត្យទិន្នន័យតាម Module)",
				Status:     "idle",
				MaxRetries: 3,
				Details:    []string{"រាប់ចំនួនជួរទិន្នន័យក្នុង profiles, records, members, zones, fms_transactions"},
			},
		}
	}
}

func (s *Scheduler) persistJobLog(st JobStatus) {
	if s.repo == nil {
		return
	}
	rec := repository.CronLogRecord{
		JobKey:     st.Key,
		JobName:    st.Name,
		Status:     st.Status,
		LastRun:    st.LastRun,
		Duration:   st.Duration,
		Error:      st.Error,
		Details:    st.Details,
		RetryCount: st.RetryCount,
		MaxRetries: st.MaxRetries,
	}
	if err := s.repo.SaveCronLog(rec); err != nil {
		log.Printf("[CRON] Failed to save cron log to DB: %v", err)
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

// RetryJob executes a retry for a specific feature job by key.
func (s *Scheduler) RetryJob(jobKey string) (*JobStatus, error) {
	jobKeyLower := strings.ToLower(strings.TrimSpace(jobKey))
	var runFn func() JobStatus
	var keyName string
	var displayName string

	switch jobKeyLower {
	case "ping_supabase", "ping supabase", "ping":
		keyName = "ping_supabase"
		displayName = "Ping Supabase"
		runFn = s.pingSupabase
	case "log_module_counts", "log module counts", "module_counts", "counts":
		keyName = "log_module_counts"
		displayName = "Module Counts"
		runFn = s.logModuleCounts
	default:
		return nil, fmt.Errorf("unknown job feature: %s", jobKey)
	}

	log.Printf("[CRON] Retry requested for job feature: %s", displayName)
	jobRes := s.runJobWithRetry(keyName, 3, runFn)

	s.mu.Lock()
	found := false
	for i, j := range s.jobLogs {
		if j.Key == keyName || strings.EqualFold(j.Name, displayName) {
			s.jobLogs[i] = jobRes
			found = true
			break
		}
	}
	if !found {
		s.jobLogs = append(s.jobLogs, jobRes)
	}
	s.mu.Unlock()

	go s.notifyTelegram([]JobStatus{jobRes}, 0)

	return &jobRes, nil
}

// runJobWithRetry executes jobFn and retries up to maxRetries if it fails.
func (s *Scheduler) runJobWithRetry(key string, maxRetries int, jobFn func() JobStatus) JobStatus {
	var lastStatus JobStatus
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			log.Printf("[CRON] Retrying job %s (attempt %d/%d)...", key, attempt, maxRetries)
			time.Sleep(time.Duration(attempt) * 1 * time.Second)
		}

		lastStatus = jobFn()
		lastStatus.Key = key
		lastStatus.RetryCount = attempt
		lastStatus.MaxRetries = maxRetries

		if lastStatus.Status == "success" {
			go s.persistJobLog(lastStatus)
			return lastStatus
		}
	}
	go s.persistJobLog(lastStatus)
	return lastStatus
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

	tgLink := os.Getenv("TELEGRAM_LINK")
	if tgLink == "" {
		if s.tgBotUsername != "" {
			tgLink = "https://t.me/" + s.tgBotUsername
		} else if strings.HasPrefix(s.tgChatID, "@") {
			tgLink = "https://t.me/" + strings.TrimPrefix(s.tgChatID, "@")
		}
	}

	return SchedulerStatus{
		Running:  s.running,
		Timezone: s.timezone.String(),
		NextRun:  nextRunStr,
		LastRun:  lastRunStr,
		Jobs:     jobs,
		Telegram: TelegramInfo{
			Enabled:     s.tgToken != "" && s.tgChatID != "",
			ChatID:      s.tgChatID,
			BotUsername: s.tgBotUsername,
			Link:        tgLink,
		},
	}
}

// runAll executes all nightly maintenance jobs with automatic retry.
func (s *Scheduler) runAll() {
	start := time.Now()
	log.Println("[CRON] ===== Nightly maintenance started =====")

	var jobs []JobStatus

	jobs = append(jobs, s.runJobWithRetry("ping_supabase", 3, s.pingSupabase))
	jobs = append(jobs, s.runJobWithRetry("log_module_counts", 3, s.logModuleCounts))

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
		"chart_of_accounts",
		"geographic_zones",
	}

	var details []string
	var lastErr string

	for _, table := range tables {
		var result []map[string]any
		_, err := s.repo.AdminClient.From(table).
			Select("*", "exact", false).
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
		Key:      "ping_supabase",
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
		{"geographic_zones", "Zones"},
		{"fms_transactions", "FMS Transactions"},
		{"members", "Members"},
	}

	var details []string
	var lastErr string

	for _, c := range counts {
		var rows []map[string]any
		_, err := s.repo.AdminClient.From(c.table).
			Select("*", "exact", false).
			ExecuteTo(&rows)
		if err != nil {
			msg := c.label + ": ERROR - " + err.Error()
			log.Printf("[CRON] Count %s: ERROR - %v", c.label, err)
			details = append(details, msg)
			lastErr = msg
		} else {
			msg := fmt.Sprintf("%s: %d", c.label, len(rows))
			log.Printf("[CRON] Count %s: %d", c.label, len(rows))
			details = append(details, msg)
		}
	}

	status := "success"
	if lastErr != "" {
		status = "partial_error"
	}

	return JobStatus{
		Key:      "log_module_counts",
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
