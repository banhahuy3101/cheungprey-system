package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

var addressCache = sync.Map{}

func resolveFullAddress(lat, lng, clientIP string) string {
	cacheKey := fmt.Sprintf("%s_%s_%s", lat, lng, clientIP)
	if val, ok := addressCache.Load(cacheKey); ok {
		return val.(string)
	}

	address := ""

	// 1. Reverse Geocode Lat/Lng via Nominatim OpenStreetMap API
	if lat != "" && lng != "" {
		apiURL := fmt.Sprintf("https://nominatim.openstreetmap.org/reverse?lat=%s&lon=%s&format=json", url.QueryEscape(lat), url.QueryEscape(lng))
		req, err := http.NewRequest("GET", apiURL, nil)
		if err == nil {
			req.Header.Set("User-Agent", "CheungPreySystem/1.0 (admin@cheungprey.org.kh)")
			client := &http.Client{Timeout: 3 * time.Second}
			resp, err := client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == 200 {
					var res struct {
						DisplayName string `json:"display_name"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.DisplayName != "" {
						address = fmt.Sprintf("%s (%s, %s)", res.DisplayName, lat, lng)
					}
				}
			}
		}
	}

	// 2. Fallback to IP geolocation if client IP is public
	if address == "" && clientIP != "" && clientIP != "127.0.0.1" && clientIP != "::1" && !strings.HasPrefix(clientIP, "192.168.") && !strings.HasPrefix(clientIP, "10.") {
		apiURL := fmt.Sprintf("http://ip-api.com/json/%s", url.QueryEscape(clientIP))
		client := &http.Client{Timeout: 3 * time.Second}
		resp, err := client.Get(apiURL)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				var res struct {
					City    string  `json:"city"`
					Country string  `json:"country"`
					Lat     float64 `json:"lat"`
					Lon     float64 `json:"lon"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.Country != "" {
					if res.City != "" {
						address = fmt.Sprintf("%s, %s (%.4f, %.4f)", res.City, res.Country, res.Lat, res.Lon)
					} else {
						address = fmt.Sprintf("%s (%.4f, %.4f)", res.Country, res.Lat, res.Lon)
					}
				}
			}
		}
	}

	// 3. Fallback for Local / Dev environment (Phnom Penh, Cambodia)
	if address == "" {
		if lat != "" && lng != "" {
			address = fmt.Sprintf("Phnom Penh, Cambodia (%s, %s)", lat, lng)
		} else {
			address = "Phnom Penh, Cambodia (11.556400, 104.928200)"
		}
	}

	addressCache.Store(cacheKey, address)
	return address
}

const (
	maxConcurrentTelegram = 5
	maxBodyLen            = 2000
	tgMaxMsgLen           = 3500
)

var sem = make(chan struct{}, maxConcurrentTelegram)

var putPathTableMap = map[string]string{
	"records":                 "records",
	"members":                 "members",
	"admin/users":             "profiles",
	"report-documents":        "report_documents",
	"report-templates":        "report_templates",
	"fms/budgets":             "fms_budgets",
	"fms/coa":                 "fms_chart_of_accounts",
	"performance/domains":     "performance_domains",
	"performance/sub-domains": "performance_sub_domains",
	"performance/indicators":  "performance_indicators",
	"performance/periods":     "performance_periods",
	"performance/submissions": "performance_submissions",
	"admin/role-permissions":  "role_permissions",
	"admin/roles":             "roles",
}

type responseCapture struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseCapture) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseCapture) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

type logEntry struct {
	method     string
	path       string
	url        string
	statusCode int
	latency    time.Duration
	clientIP   string
	latLng     string
	reqBody    string
	respBody   string
	before     string
	errMsg     string
	user       string
	device     string
	version    string
	timestamp  string
}

func Telegram(repo *repository.Repository) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := os.Getenv("TELEGRAM_BOT_TOKEN")
		chatID := os.Getenv("TELEGRAM_CHAT_ID")
		if token == "" || chatID == "" {
			c.Next()
			return
		}

		start := time.Now()

		reqBody := captureRequestBody(c)

		var before string
		if c.Request.Method == http.MethodPut || c.Request.Method == http.MethodPatch {
			before = captureBeforeState(repo, c.Request.URL.Path)
		}

		rc := &responseCapture{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = rc

		c.Next()

		path := c.Request.URL.Path
		if path == "/health" || path == "/api/health" {
			return
		}

		user := "guest"
		if email, ok := c.Get(auth.ContextKeyEmail); ok {
			if s, ok := email.(string); ok && s != "" {
				user = s
			}
		}

		device := c.Request.Header.Get("User-Agent")
		version := c.Request.Header.Get("X-App-Version")
		if version == "" {
			version = c.Request.Header.Get("App-Version")
		}

		lat := c.Request.Header.Get("X-Latitude")
		if lat == "" {
			lat = c.Request.Header.Get("X-Lat")
		}
		lng := c.Request.Header.Get("X-Longitude")
		if lng == "" {
			lng = c.Request.Header.Get("X-Lng")
		}
		if lat == "" || lng == "" {
			lat = c.Query("lat")
			lng = c.Query("lng")
		}

		fullAddress := resolveFullAddress(lat, lng, c.ClientIP())

		entry := logEntry{
			method:     c.Request.Method,
			path:       path,
			url:        fullURL(c.Request),
			statusCode: c.Writer.Status(),
			latency:    time.Since(start),
			clientIP:   c.ClientIP(),
			latLng:     fullAddress,
			reqBody:    truncate(reqBody, maxBodyLen),
			respBody:   truncate(rc.body.String(), maxBodyLen),
			before:     before,
			user:       user,
			device:     truncate(device, 120),
			version:    truncate(version, 60),
			timestamp:  time.Now().Format("2006-01-02 15:04:05"),
		}

		if len(c.Errors) > 0 {
			entry.errMsg = c.Errors.Last().Err.Error()
		}

		select {
		case sem <- struct{}{}:
			go func(e logEntry) {
				defer func() { <-sem }()
				sendToTelegram(token, chatID, e)
			}(entry)
		default:
			log.Printf("[TELEGRAM] rate limited, dropped log for %s %s", entry.method, entry.path)
		}
	}
}

func sendToTelegram(token, chatID string, e logEntry) {
	var sb strings.Builder

	sb.WriteString("\xF0\x9F\x93\xA5 <b>Response Log</b>\n")

	if e.user != "" {
		sb.WriteString(fmt.Sprintf("\xF0\x9F\x91\xA4 <b>User:</b> %s\n", htmlEscape(e.user)))
	}
	if e.latLng != "" {
		sb.WriteString(fmt.Sprintf("\xF0\x9F\x93\x8D <b>Address:</b> %s\n", htmlEscape(e.latLng)))
	}
	if e.version != "" {
		sb.WriteString(fmt.Sprintf("\xF0\x9F\x93\xA6 <b>Version:</b> %s\n", htmlEscape(e.version)))
	}

	sb.WriteString(fmt.Sprintf("\xF0\x9F\x93\x8C <code>%s</code> %s\n", e.method, htmlEscape(e.url)))
	sb.WriteString(fmt.Sprintf("\xE2\x8F\xB0 %s\n", e.timestamp))

	statusEmoji := "\xE2\x9C\x85"
	if e.statusCode >= 500 {
		statusEmoji = "\xF0\x9F\x94\xA5"
	} else if e.statusCode >= 400 {
		statusEmoji = "\xE2\x9A\xA0\xEF\xB8\x8F"
	}
	sb.WriteString(fmt.Sprintf("\n%s <b>Status:</b> %d %s | <b>Latency:</b> %s\n",
		statusEmoji, e.statusCode, http.StatusText(e.statusCode), e.latency.Round(time.Microsecond)))

	if e.before != "" && (e.method == http.MethodPut || e.method == http.MethodPatch) {
		sb.WriteString(fmt.Sprintf("\n\xF0\x9F\x94\x99 <b>Before:</b>\n<pre>%s</pre>\n", htmlEscape(e.before)))
	}
	if e.reqBody != "" {
		sb.WriteString(fmt.Sprintf("\n\xF0\x9F\x93\xA4 <b>Request Body</b>\n<pre>%s</pre>\n", htmlEscape(e.reqBody)))
	}
	if e.respBody != "" {
		sb.WriteString(fmt.Sprintf("\n\xF0\x9F\x93\x96 <b>Response Body</b>\n<pre>%s</pre>\n", htmlEscape(e.respBody)))
	}
	if e.errMsg != "" {
		sb.WriteString(fmt.Sprintf("\n\xF0\x9F\x9B\x91 <b>Error:</b>\n<pre>%s</pre>\n", htmlEscape(e.errMsg)))
	}

	text := sb.String()
	if len(text) > tgMaxMsgLen {
		text = text[:tgMaxMsgLen-3] + "..."
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	body := url.Values{
		"chat_id":                  {chatID},
		"text":                     {text},
		"parse_mode":               {"HTML"},
		"disable_web_page_preview": {"true"},
	}

	resp, err := http.Post(apiURL, "application/x-www-form-urlencoded", bytes.NewBufferString(body.Encode()))
	if err != nil {
		log.Printf("[TELEGRAM] send failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		errBody, _ := io.ReadAll(resp.Body)
		log.Printf("[TELEGRAM] API %d: %s", resp.StatusCode, string(errBody))
	}
}

func captureBeforeState(repo *repository.Repository, path string) string {
	table, id := extractTableAndID(path)
	if table == "" || id == "" {
		return ""
	}

	var result []map[string]any
	_, err := repo.AdminClient.From(table).
		Select("*", "exact", false).
		Eq("id", id).
		Single().
		ExecuteTo(&result)
	if err != nil || len(result) == 0 {
		return ""
	}

	cleaned := make(map[string]interface{}, len(result[0]))
	for k, v := range result[0] {
		if isSensitive(k) {
			cleaned[k] = "***"
		} else if s, ok := v.(string); ok && len(s) > 80 {
			cleaned[k] = s[:80] + "..."
		} else {
			cleaned[k] = v
		}
	}

	out, err := json.Marshal(cleaned)
	if err != nil {
		return ""
	}
	return truncate(string(out), maxBodyLen)
}

func extractTableAndID(path string) (string, string) {
	path = strings.TrimPrefix(path, "/api/")
	if path == "" {
		return "", ""
	}

	prefix, id := splitLastSegment(path)
	if prefix == "" || id == "" {
		return "", ""
	}

	id = strings.TrimSpace(id)
	prefix = strings.TrimRight(prefix, "/")

	table, ok := putPathTableMap[prefix]
	if !ok {
		parts := strings.Split(prefix, "/")
		last := parts[len(parts)-1]
		if t, ok2 := putPathTableMap[last]; ok2 {
			table = t
		} else {
			return "", ""
		}
	}

	return table, id
}

func splitLastSegment(path string) (prefix, last string) {
	i := strings.LastIndex(path, "/")
	if i < 0 {
		return "", path
	}
	return path[:i], path[i+1:]
}

func captureRequestBody(c *gin.Context) string {
	if c.Request.Body == nil {
		return ""
	}
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return ""
	}
	c.Request.Body = io.NopCloser(bytes.NewBuffer(raw))

	if c.Request.Header.Get("Content-Type") != "application/json" {
		return string(raw)
	}

	var obj map[string]interface{}
	if json.Unmarshal(raw, &obj) != nil {
		return string(raw)
	}

	cleaned := make(map[string]interface{}, len(obj))
	for k, v := range obj {
		if isSensitive(k) {
			cleaned[k] = "***"
		} else {
			cleaned[k] = v
		}
	}
	out, _ := json.Marshal(cleaned)
	return string(out)
}

func isSensitive(key string) bool {
	k := strings.ToLower(key)
	return k == "password" || k == "token" || k == "secret" ||
		k == "authorization" || k == "access_token" || k == "refresh_token"
}

func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) > max {
		s = s[:max]
	}
	return s
}

func fullURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	} else if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	}
	return scheme + "://" + r.Host + r.URL.RequestURI()
}

func htmlEscape(s string) string {
	buf := make([]byte, 0, len(s))
	for _, c := range []byte(s) {
		switch c {
		case '&':
			buf = append(buf, "&amp;"...)
		case '<':
			buf = append(buf, "&lt;"...)
		case '>':
			buf = append(buf, "&gt;"...)
		default:
			buf = append(buf, c)
		}
	}
	return string(buf)
}
