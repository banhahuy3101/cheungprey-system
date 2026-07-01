package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    any         `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func JSON(c *gin.Context, status int, data any) {
	c.JSON(status, APIResponse{Success: status < 400, Data: data})
}

func Error(c *gin.Context, status int, msg string) {
	c.JSON(status, APIResponse{Success: false, Error: msg})
}

func BadRequest(c *gin.Context, msg string) { Error(c, http.StatusBadRequest, msg) }
func Unauthorized(c *gin.Context, msg string) { Error(c, http.StatusUnauthorized, msg) }
func Forbidden(c *gin.Context, msg string) { Error(c, http.StatusForbidden, msg) }
func InternalError(c *gin.Context, msg string) { Error(c, http.StatusInternalServerError, msg) }
