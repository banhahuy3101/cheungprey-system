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
}

func Load() *Config {
	return &Config{
		SupabaseURL:         getEnv("SUPABASE_URL", ""),
		SupabaseKey:         getEnv("SUPABASE_PUBLISHABLE_KEY", ""),
		SupabaseServiceKey:  getEnv("SUPABASE_SECRET_KEY", ""),
		JWTSecret:           getEnv("JWT_SECRET", ""),
		Port:                getEnv("PORT", "8080"),
		DefaultUserPassword: getEnv("DEFAULT_USER_PASSWORD", "Demo123!"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return strings.TrimSpace(v)
	}
	return fallback
}
