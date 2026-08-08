package utils

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type APIResponse struct {
	Success bool           `json:"success"`
	Data    any            `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
	Errors  map[string]string `json:"errors,omitempty"`
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

var validationLabels = map[string]string{
	"Title":       "title",
	"Description": "description",
	"Content":     "content",
	"Category":    "category",
	"ProvinceName":    "province_name",
	"DistrictName":    "district_name",
	"ReportMonth":     "report_month",
	"ReportYear":      "report_year",
	"PartyName":       "party_name",
}

func ValidationErrors(c *gin.Context, err error) {
	fieldErrors := make(map[string]string)

	if ve, ok := err.(validator.ValidationErrors); ok {
		for _, fe := range ve {
			label := camelToSnake(fe.Field())
			if l, ok := validationLabels[fe.Field()]; ok {
				label = l
			}
			fieldErrors[label] = fmt.Sprintf("%s is required", label)
		}
	}

	c.JSON(http.StatusBadRequest, APIResponse{
		Success: false,
		Error:   "validation failed",
		Errors:  fieldErrors,
	})
}

func camelToSnake(s string) string {
	var buf strings.Builder
	for i, c := range s {
		if c >= 'A' && c <= 'Z' {
			if i > 0 {
				buf.WriteByte('_')
			}
			buf.WriteRune(c + 32)
		} else {
			buf.WriteRune(c)
		}
	}
	return buf.String()
}
