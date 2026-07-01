package auth

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

const (
	ContextKeyUserID      = "user_id"
	ContextKeyEmail       = "email"
	ContextKeyRole        = "role"
	ContextKeyProfile     = "profile"
	ContextKeyRoles       = "roles"
	ContextKeyPermissions = "permissions"
)

type RoleResolver func(userID uuid.UUID) (models.UserRole, error)
type ProfileResolver func(userID uuid.UUID) (*models.Profile, error)
type AccessResolver func(userID uuid.UUID) (*models.UserAccess, error)

func GetUserID(c *gin.Context) (uuid.UUID, error) {
	uid, exists := c.Get(ContextKeyUserID)
	if !exists {
		return uuid.Nil, fmt.Errorf("user not authenticated")
	}
	return uid.(uuid.UUID), nil
}

func GetUserRole(c *gin.Context) (models.UserRole, error) {
	role, exists := c.Get(ContextKeyRole)
	if !exists {
		return "", fmt.Errorf("user not authenticated")
	}
	return role.(models.UserRole), nil
}

func GetProfile(c *gin.Context) (*models.Profile, error) {
	profile, exists := c.Get(ContextKeyProfile)
	if !exists {
		return nil, fmt.Errorf("profile not loaded")
	}
	return profile.(*models.Profile), nil
}

func JWTMiddleware(resolveRole RoleResolver) gin.HandlerFunc {
	return jwtMiddleware(resolveRole, nil, nil)
}

func JWTMiddlewareWithProfile(resolveProfile ProfileResolver) gin.HandlerFunc {
	return jwtMiddleware(nil, resolveProfile, nil)
}

func JWTMiddlewareWithAccess(resolve AccessResolver) gin.HandlerFunc {
	return jwtMiddleware(nil, nil, resolve)
}

func jwtMiddleware(resolveRole RoleResolver, resolveProfile ProfileResolver, resolveAccess AccessResolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := ExtractBearerToken(c.GetHeader("Authorization"))
		if err != nil {
			utils.Unauthorized(c, err.Error())
			c.Abort()
			return
		}

		claims, err := VerifySupabaseToken(tokenString)
		if err != nil {
			utils.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		userID, err := uuid.Parse(claims.Subject)
		if err != nil {
			utils.Unauthorized(c, "Invalid user ID in token")
			c.Abort()
			return
		}

		c.Set(ContextKeyUserID, userID)
		c.Set(ContextKeyEmail, claims.Email)

		if resolveAccess != nil {
			access, err := resolveAccess(userID)
			if err == nil && access != nil && access.Profile != nil {
				c.Set(ContextKeyProfile, access.Profile)
				c.Set(ContextKeyRoles, access.Roles)
				c.Set(ContextKeyPermissions, access.Permissions)
				c.Set(ContextKeyRole, access.PrimaryRole)
			} else {
				c.Set(ContextKeyRole, models.RoleRegularUser)
				c.Set(ContextKeyRoles, []models.UserRole{models.RoleRegularUser})
				c.Set(ContextKeyPermissions, models.DefaultPermissionsForRole(models.RoleRegularUser))
			}
		} else if resolveProfile != nil {
			profile, err := resolveProfile(userID)
			if err == nil && profile != nil {
				c.Set(ContextKeyProfile, profile)
				role := profile.Role
				if role == "" {
					role = models.RoleRegularUser
				}
				c.Set(ContextKeyRole, role)
			} else {
				c.Set(ContextKeyRole, models.RoleRegularUser)
			}
		} else if resolveRole != nil {
			role, err := resolveRole(userID)
			if err == nil {
				if role == "" {
					role = models.RoleRegularUser
				}
				c.Set(ContextKeyRole, role)
			}
		}

		c.Next()
	}
}

func RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, err := GetUserRole(c)
		if err != nil {
			utils.Unauthorized(c, "Authentication required")
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			if role == allowed {
				c.Next()
				return
			}
		}

		utils.Forbidden(c, "Insufficient permissions")
		c.Abort()
	}
}

func ValidateRoleAssignment(assignerRole, targetRole models.UserRole) error {
	if assignerRole == models.RoleSuperAdmin {
		return nil
	}
	if models.RoleLevel(assignerRole) <= models.RoleLevel(targetRole) {
		return fmt.Errorf("cannot assign role equal to or higher than your own")
	}
	return nil
}
