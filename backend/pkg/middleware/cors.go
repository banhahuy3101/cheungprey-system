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
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "Content-Disposition"},
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
		cfg.AllowOriginFunc = func(origin string) bool {
			if origin == "" {
				return true
			}
			for _, o := range origins {
				if origin == o {
					return true
				}
			}
			// Local Vite dev (localhost or 127.0.0.1).
			if strings.HasPrefix(origin, "http://localhost:") ||
				strings.HasPrefix(origin, "http://127.0.0.1:") {
				return true
			}
			// Render static sites proxy /api same-origin; browser still sends Origin.
			if strings.HasSuffix(origin, ".onrender.com") {
				return true
			}
			return false
		}
	}

	return cors.New(cfg)
}
