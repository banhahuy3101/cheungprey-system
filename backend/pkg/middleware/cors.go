package middleware

import (
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	cfg := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "Accept", "Origin"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}

	allowed := strings.TrimSpace(os.Getenv("CORS_ORIGIN"))
	if allowed == "" {
		cfg.AllowOriginFunc = func(origin string) bool {
			return origin != ""
		}
	} else {
		origins := make([]string, 0)
		for part := range strings.SplitSeq(allowed, ",") {
			if o := strings.TrimSpace(part); o != "" {
				origins = append(origins, o)
			}
		}
		cfg.AllowOrigins = origins
	}

	return cors.New(cfg)
}
