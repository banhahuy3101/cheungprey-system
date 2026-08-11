package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
)

func RequireModuleEnabled(repo *repository.Repository, moduleKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg, err := repo.GetModuleConfig(moduleKey)
		if err != nil || cfg == nil || !cfg.Enabled {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Module is disabled"})
			return
		}
		c.Next()
	}
}
