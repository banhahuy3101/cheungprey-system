package config

import (
	"os"
	"strings"
)

type Config struct {
	SupabaseURL        string
	SupabaseKey        string
	SupabaseServiceKey string
	JWTSecret          string
	Port               string
	DefaultUserPassword string
	FrontendURL        string
	TelegramBotToken    string
	TelegramChatID      string
}

func Load() *Config {
	return &Config{
		SupabaseURL:         getEnv("SUPABASE_URL", ""),
		SupabaseKey:         getEnv("SUPABASE_PUBLISHABLE_KEY", ""),
		SupabaseServiceKey:  getEnv("SUPABASE_SECRET_KEY", ""),
		JWTSecret:           getEnv("JWT_SECRET", ""),
		Port:                getEnv("PORT", "8080"),
		DefaultUserPassword: getEnv("DEFAULT_USER_PASSWORD", ""),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:5173"),
		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:      getEnv("TELEGRAM_CHAT_ID", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return strings.TrimSpace(v)
	}
	return fallback
}
