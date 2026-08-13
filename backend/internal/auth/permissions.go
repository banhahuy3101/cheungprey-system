package auth

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

func GetPermissions(c *gin.Context) (models.PermissionSet, error) {
	perms, exists := c.Get(ContextKeyPermissions)
	if !exists {
		return nil, nil
	}
	return perms.(models.PermissionSet), nil
}

func GetUserRoles(c *gin.Context) ([]models.UserRole, error) {
	roles, exists := c.Get(ContextKeyRoles)
	if !exists {
		return nil, nil
	}
	return roles.([]models.UserRole), nil
}

func HasFeature(c *gin.Context, feature models.Feature) bool {
	perms, err := GetPermissions(c)
	if err != nil || perms == nil {
		return false
	}
	if perms[feature] {
		return true
	}
	// legacy alias: "fms" permission key grants finances access
	if feature == models.FeatureFinances && perms["fms"] {
		return true
	}
	return false
}

// HasFeatureAction requires both the module and one explicit CRUD action.
// Missing action keys fall back to the module permission for legacy data.
func HasFeatureAction(c *gin.Context, feature models.Feature, action string) bool {
	perms, err := GetPermissions(c)
	if err != nil || perms == nil {
		return false
	}

	// 1. Explicit granular action key check (e.g. performance_read)
	key := models.Feature(fmt.Sprintf("%s_%s", feature, action))
	if value, exists := perms[key]; exists && value {
		return true
	}

	// 2. Base feature key check (e.g. performance)
	if value, exists := perms[feature]; exists && value {
		return true
	}

	// 3. Admin feature key check (e.g. performance_admin when feature == performance)
	adminKey := models.Feature(fmt.Sprintf("%s_admin", feature))
	if value, exists := perms[adminKey]; exists && value {
		return true
	}

	return false
}

func RequireFeatureAction(feature models.Feature, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !HasFeatureAction(c, feature, action) {
			utils.Forbidden(c, "Insufficient permissions")
			c.Abort()
			return
		}
		c.Next()
	}
}

func HasAnyFeature(c *gin.Context, features ...models.Feature) bool {
	for _, feature := range features {
		if HasFeature(c, feature) {
			return true
		}
	}
	return false
}

func RequireAnyFeature(features ...models.Feature) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !HasAnyFeature(c, features...) {
			utils.Forbidden(c, "Insufficient permissions")
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireFeature(feature models.Feature) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !HasFeature(c, feature) {
			utils.Forbidden(c, "Insufficient permissions")
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireFeatureHandler(c *gin.Context, feature models.Feature) bool {
	if !HasFeature(c, feature) {
		utils.Forbidden(c, "Insufficient permissions")
		return false
	}
	return true
}

func CanManageUsers(c *gin.Context) bool {
	return HasFeature(c, models.FeatureUsers)
}

func RequireAdminHandler(c *gin.Context) bool {
	return RequireFeatureHandler(c, models.FeatureUsers)
}

func RequireStaffHandler(c *gin.Context) bool {
	// Any operational data feature grants staff-level API access for legacy handlers.
	for _, f := range []models.Feature{
		models.FeatureMembers, models.FeatureRecords, models.FeatureReports, models.FeaturePerformance,
	} {
		if HasFeature(c, f) {
			return true
		}
	}
	utils.Forbidden(c, "Insufficient permissions")
	return false
}
