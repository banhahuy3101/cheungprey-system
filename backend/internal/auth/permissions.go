package auth

import (
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
	return perms[feature]
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
