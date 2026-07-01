package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleSuperAdmin    UserRole = "super_admin"
	RoleAdmin         UserRole = "admin"
	RoleDistrictChief UserRole = "district_chief"
	RoleCommuneChief  UserRole = "commune_chief"
	RoleCommuneClerk  UserRole = "commune_clerk"
	RoleVillageChief  UserRole = "village_chief"
	RoleRecorder      UserRole = "recorder"
	RoleRegularUser   UserRole = "regular_user"
)

var RoleHierarchy = map[UserRole]int{
	RoleSuperAdmin:    7,
	RoleAdmin:         6,
	RoleDistrictChief: 5,
	RoleCommuneChief:  4,
	RoleCommuneClerk:  3,
	RoleVillageChief:  2,
	RoleRecorder:      1,
	RoleRegularUser:   0,
}

func RoleLevel(role UserRole) int {
	if level, ok := RoleHierarchy[role]; ok {
		return level
	}
	return RoleHierarchy[RoleRegularUser]
}

type Profile struct {
	ID          uuid.UUID     `json:"id"`
	FullName    string        `json:"full_name"`
	Email       string        `json:"email,omitempty"`
	PhoneNumber *string       `json:"phone_number,omitempty"`
	ZoneCode    *string       `json:"zone_code,omitempty"`
	CommuneID   *uuid.UUID    `json:"commune_id,omitempty"`
	VillageID   *uuid.UUID    `json:"village_id,omitempty"`
	Role        UserRole      `json:"role"`
	Roles       []UserRole    `json:"roles,omitempty"`
	Permissions PermissionSet `json:"permissions,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// AdminUser is returned by admin user list (profile + auth email + zone label).
type AdminUser struct {
	ID          uuid.UUID     `json:"id"`
	FullName    string        `json:"full_name"`
	Email       string        `json:"email,omitempty"`
	PhoneNumber *string       `json:"phone_number,omitempty"`
	ZoneCode    *string       `json:"zone_code,omitempty"`
	ZoneName    string        `json:"zone_name,omitempty"`
	CommuneID   *uuid.UUID    `json:"commune_id,omitempty"`
	VillageID   *uuid.UUID    `json:"village_id,omitempty"`
	Role        UserRole      `json:"role"`
	Roles       []UserRole    `json:"roles,omitempty"`
	Permissions PermissionSet `json:"permissions,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Email       string   `json:"email" binding:"required,email"`
	Password    string   `json:"password" binding:"required,min=6"`
	FullName    string   `json:"full_name" binding:"required"`
	PhoneNumber string   `json:"phone_number,omitempty"`
	Role        UserRole `json:"role,omitempty"`
}

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         *Profile `json:"user"`
}

type UpdateProfileRequest struct {
	FullName    string   `json:"full_name,omitempty"`
	PhoneNumber string   `json:"phone_number,omitempty"`
	CommuneID   string   `json:"commune_id,omitempty"`
	VillageID   string   `json:"village_id,omitempty"`
}

type AdminCreateUserRequest struct {
	Email       string     `json:"email" binding:"required,email"`
	Password    string     `json:"password" binding:"required,min=6"`
	FullName    string     `json:"full_name" binding:"required"`
	PhoneNumber string     `json:"phone_number,omitempty"`
	Role        UserRole   `json:"role,omitempty"`
	Roles       []UserRole `json:"roles,omitempty"`
	ZoneCode    string     `json:"zone_code,omitempty"`
	CommuneID   string     `json:"commune_id,omitempty"`
	VillageID   string     `json:"village_id,omitempty"`
}

type AdminUpdateUserRequest struct {
	FullName    string     `json:"full_name,omitempty"`
	PhoneNumber string     `json:"phone_number,omitempty"`
	Role        UserRole   `json:"role,omitempty"`
	Roles       []UserRole `json:"roles,omitempty"`
	ZoneCode    string     `json:"zone_code,omitempty"`
	CommuneID   string     `json:"commune_id,omitempty"`
	VillageID   string     `json:"village_id,omitempty"`
}

type AdminResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

type AdminSettings struct {
	DefaultUserPassword string `json:"default_user_password"`
}
