package service

import (
	"strings"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

type FinanceAccessContext struct {
	UserID   uuid.UUID
	Role     models.UserRole
	ZoneCode string
}

func FinanceAccessFromProfile(userID uuid.UUID, profile *models.Profile) FinanceAccessContext {
	ctx := FinanceAccessContext{UserID: userID, Role: models.RoleRegularUser}
	if profile != nil {
		ctx.Role = profile.Role
		if ctx.Role == "" {
			ctx.Role = models.RoleRegularUser
		}
		if profile.ZoneCode != nil {
			ctx.ZoneCode = *profile.ZoneCode
		}
	}
	return ctx
}

func (ctx FinanceAccessContext) IsAdmin() bool {
	return ctx.Role == models.RoleSuperAdmin || ctx.Role == models.RoleAdmin
}

// NormalizeFinanceZoneCode rolls village-level codes up to commune (finance has no village scope).
func NormalizeFinanceZoneCode(code string) string {
	if len(code) > 6 {
		return code[:6]
	}
	return code
}

func ZoneUnderScope(userZone, targetZone string) bool {
	if userZone == "" || targetZone == "" {
		return false
	}
	if targetZone == userZone {
		return true
	}
	return strings.HasPrefix(targetZone, userZone)
}

func (ctx FinanceAccessContext) CanAccessZone(targetZone string) bool {
	if ctx.IsAdmin() {
		return true
	}
	if ctx.ZoneCode == "" || targetZone == "" {
		return false
	}
	switch ctx.Role {
	case models.RoleVillageChief, models.RoleRecorder:
		if len(ctx.ZoneCode) >= 8 {
			return targetZone == ctx.ZoneCode
		}
		return targetZone == ctx.ZoneCode ||
			(len(targetZone) == 8 && strings.HasPrefix(targetZone, ctx.ZoneCode))
	default:
		return ZoneUnderScope(ctx.ZoneCode, targetZone)
	}
}

func (ctx FinanceAccessContext) CanCreateFinance() bool {
	switch ctx.Role {
	case models.RoleSuperAdmin, models.RoleAdmin,
		models.RoleDistrictChief, models.RoleCommuneChief, models.RoleCommuneClerk,
		models.RoleVillageChief, models.RoleRecorder:
		return true
	default:
		return false
	}
}

func (ctx FinanceAccessContext) CanAssignZone(targetZone string) bool {
	if !ctx.CanCreateFinance() {
		return false
	}
	return ctx.CanAccessZone(targetZone)
}

func (ctx FinanceAccessContext) DefaultZoneCode(requested string) string {
	if requested != "" && ctx.CanAssignZone(requested) {
		return requested
	}
	if ctx.ZoneCode != "" && ctx.CanAssignZone(ctx.ZoneCode) {
		return ctx.ZoneCode
	}
	return ""
}

func (ctx FinanceAccessContext) CanApprove() bool {
	switch ctx.Role {
	case models.RoleSuperAdmin, models.RoleAdmin,
		models.RoleDistrictChief, models.RoleCommuneChief:
		return true
	default:
		return false
	}
}

func (ctx FinanceAccessContext) DefaultCreateStatus() string {
	if ctx.CanApprove() {
		return models.FinanceStatusApproved
	}
	return models.FinanceStatusDraft
}

func (ctx FinanceAccessContext) CanSubmit(finance *models.PartyFinance) bool {
	if finance == nil || finance.CreatedBy == nil {
		return false
	}
	if *finance.CreatedBy != ctx.UserID && !ctx.IsAdmin() {
		return false
	}
	return finance.Status == models.FinanceStatusDraft || finance.Status == models.FinanceStatusRejected
}

func (ctx FinanceAccessContext) CanApproveFinance(finance *models.PartyFinance) bool {
	if !ctx.CanApprove() || finance == nil {
		return false
	}
	if finance.Status != models.FinanceStatusSubmitted {
		return false
	}
	return ctx.CanAccessZone(finance.ZoneCode)
}

func (ctx FinanceAccessContext) CanModifyFinance(finance *models.PartyFinance) bool {
	if finance == nil || !ctx.CanAccessZone(finance.ZoneCode) {
		return false
	}
	switch finance.Status {
	case models.FinanceStatusApproved, models.FinanceStatusSubmitted:
		return ctx.CanApprove()
	default:
		if ctx.IsAdmin() {
			return true
		}
		if finance.CreatedBy != nil && *finance.CreatedBy == ctx.UserID {
			return true
		}
		return ctx.CanApprove()
	}
}
