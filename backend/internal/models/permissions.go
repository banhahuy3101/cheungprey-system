package models

import "fmt"

// Feature keys used in role_permissions JSON and API responses.
type Feature string

const (
	FeatureDashboard        Feature = "dashboard"
	FeatureMembers          Feature = "members"
	FeatureVoters           Feature = "voters"
	FeatureFiles            Feature = "files"
	FeatureReports          Feature = "reports"
	FeaturePerformance      Feature = "performance"
	FeaturePerformanceAdmin Feature = "performance_admin"
	FeatureSettings         Feature = "settings"
	FeatureUsers            Feature = "users"
	FeatureTechnical        Feature = "technical"
	FeatureFinances         Feature = "finances"
	FeatureMembershipWrite  Feature = "membership_write"
	FeatureMembershipDues   Feature = "membership_dues"
	FeatureMembershipAdmin  Feature = "membership_admin"
	FeatureMembershipCards  Feature = "membership_cards"
	FeatureMembershipDelete Feature = "membership_delete"

	// Sponsorship / Appendix Feature Keys
	FeatureSponsorships        Feature = "sponsorships"
	FeatureSponsorshipsCreate  Feature = "sponsorships_create"
	FeatureSponsorshipsRead    Feature = "sponsorships_read"
	FeatureSponsorshipsUpdate  Feature = "sponsorships_update"
	FeatureSponsorshipsDelete  Feature = "sponsorships_delete"
	FeatureSponsorshipsReview  Feature = "sponsorships_review"
	FeatureSponsorshipsApprove Feature = "sponsorships_approve"

	// CRUD Granular Permissions
	FeatureReportsCreate Feature = "reports_create"
	FeatureReportsRead   Feature = "reports_read"
	FeatureReportsUpdate Feature = "reports_update"
	FeatureReportsDelete Feature = "reports_delete"

	FeatureFilesCreate Feature = "files_create"
	FeatureFilesRead   Feature = "files_read"
	FeatureFilesUpdate Feature = "files_update"
	FeatureFilesDelete Feature = "files_delete"

	FeatureMembersCreate     Feature = "members_create"
	FeatureMembersRead       Feature = "members_read"
	FeatureMembersUpdate     Feature = "members_update"
	FeatureMembersDelete     Feature = "members_delete"
	FeatureVotersCreate      Feature = "voters_create"
	FeatureVotersRead        Feature = "voters_read"
	FeatureVotersUpdate      Feature = "voters_update"
	FeatureVotersDelete      Feature = "voters_delete"
	FeaturePerformanceCreate Feature = "performance_create"
	FeaturePerformanceRead   Feature = "performance_read"
	FeaturePerformanceUpdate Feature = "performance_update"
	FeaturePerformanceDelete Feature = "performance_delete"
	FeatureUsersCreate       Feature = "users_create"
	FeatureUsersRead         Feature = "users_read"
	FeatureUsersUpdate       Feature = "users_update"
	FeatureUsersDelete       Feature = "users_delete"
)

var AllFeatures = []Feature{
	FeatureDashboard,
	FeatureMembers,
	FeatureMembersCreate,
	FeatureMembersRead,
	FeatureMembersUpdate,
	FeatureMembersDelete,
	FeatureVoters,
	FeatureVotersCreate,
	FeatureVotersRead,
	FeatureVotersUpdate,
	FeatureVotersDelete,
	FeatureFiles,
	FeatureFilesCreate,
	FeatureFilesRead,
	FeatureFilesUpdate,
	FeatureFilesDelete,
	FeatureReports,
	FeatureReportsCreate,
	FeatureReportsRead,
	FeatureReportsUpdate,
	FeatureReportsDelete,
	FeaturePerformance,
	FeaturePerformanceCreate,
	FeaturePerformanceRead,
	FeaturePerformanceUpdate,
	FeaturePerformanceDelete,
	FeaturePerformanceAdmin,
	FeatureSponsorships,
	FeatureSponsorshipsCreate,
	FeatureSponsorshipsRead,
	FeatureSponsorshipsUpdate,
	FeatureSponsorshipsDelete,
	FeatureSponsorshipsReview,
	FeatureSponsorshipsApprove,
	FeatureSettings,
	FeatureUsers,
	FeatureUsersCreate,
	FeatureUsersRead,
	FeatureUsersUpdate,
	FeatureUsersDelete,
	FeatureTechnical,
	FeatureMembershipWrite,
	FeatureMembershipDues,
	FeatureMembershipAdmin,
	FeatureMembershipCards,
	FeatureMembershipDelete,
}

var FeatureLabels = map[Feature]string{
	FeatureDashboard:           "ទំព័រដើម",
	FeatureMembers:             "សមាជិក",
	FeatureMembersCreate:       "បង្កើតសមាជិក (Create)",
	FeatureMembersRead:         "មើលសមាជិក (Read)",
	FeatureMembersUpdate:       "កែប្រែសមាជិក (Update)",
	FeatureMembersDelete:       "លុបសមាជិក (Delete)",
	FeatureVoters:              "អ្នកបោះឆ្នោត",
	FeatureVotersCreate:        "បង្កើតអ្នកបោះឆ្នោត (Create)",
	FeatureVotersRead:          "មើលអ្នកបោះឆ្នោត (Read)",
	FeatureVotersUpdate:        "កែប្រែអ្នកបោះឆ្នោត (Update)",
	FeatureVotersDelete:        "លុបអ្នកបោះឆ្នោត (Delete)",
	FeatureFiles:               "ឯកសារ",
	FeatureFilesCreate:         "បង្កើតឯកសារ (Create)",
	FeatureFilesRead:           "មើលឯកសារ (Read)",
	FeatureFilesUpdate:         "កែប្រែឯកសារ (Update)",
	FeatureFilesDelete:         "លុបឯកសារ (Delete)",
	FeatureReports:             "របាយការណ៍",
	FeatureReportsCreate:       "បង្កើតរបាយការណ៍ (Create)",
	FeatureReportsRead:         "មើលរបាយការណ៍ (Read)",
	FeatureReportsUpdate:       "កែប្រែរបាយការណ៍ (Update)",
	FeatureReportsDelete:       "លុបរបាយការណ៍ (Delete)",
	FeaturePerformance:         "លទ្ធផលការងារ",
	FeaturePerformanceCreate:   "បង្កើតលទ្ធផលការងារ (Create)",
	FeaturePerformanceRead:     "មើលលទ្ធផលការងារ (Read)",
	FeaturePerformanceUpdate:   "កែប្រែលទ្ធផលការងារ (Update)",
	FeaturePerformanceDelete:   "លុបលទ្ធផលការងារ (Delete)",
	FeaturePerformanceAdmin:    "គ្រប់គ្រង Performance",
	FeatureSponsorships:        "តារាងឧបសម្ព័ន្ធ ថវិកា សម្ភារ",
	FeatureSponsorshipsCreate:  "បង្កើតតារាងឧបសម្ព័ន្ធ (Create)",
	FeatureSponsorshipsRead:    "មើលតារាងឧបសម្ព័ន្ធ (Read)",
	FeatureSponsorshipsUpdate:  "កែប្រែតារាងឧបសម្ព័ន្ធ (Update)",
	FeatureSponsorshipsDelete:  "លុបតារាងឧបសម្ព័ន្ធ (Delete)",
	FeatureSponsorshipsReview:  "ពិនិត្យតារាងឧបសម្ព័ន្ធ (Review)",
	FeatureSponsorshipsApprove: "អនុម័តតារាងឧបសម្ព័ន្ធ (Approve)",
	FeatureSettings:            "ការកំណត់",
	FeatureUsers:               "គ្រប់គ្រងអ្នកប្រើ",
	FeatureUsersCreate:         "បង្កើតអ្នកប្រើប្រាស់ (Create)",
	FeatureUsersRead:           "មើលអ្នកប្រើប្រាស់ (Read)",
	FeatureUsersUpdate:         "កែប្រែអ្នកប្រើប្រាស់ (Update)",
	FeatureUsersDelete:         "លុបអ្នកប្រើប្រាស់ (Delete)",
	FeatureTechnical:           "Technical",
	FeatureMembershipWrite:     "សរសេរសមាជិក",
	FeatureMembershipDues:      "តារាងសមាជិក",
	FeatureMembershipAdmin:     "គ្រប់គ្រងសមាជិក",
	FeatureMembershipCards:     "កាតសមាជិក",
	FeatureMembershipDelete:    "លុបសមាជិក",
}

type PermissionSet map[Feature]bool

// CompleteCRUDDefaults preserves the old module-level permission behavior for
// roles whose stored JSON predates granular CRUD keys.
func CompleteCRUDDefaults(perms PermissionSet) PermissionSet {
	for _, module := range []Feature{
		FeatureMembers, FeatureVoters, FeatureFiles,
		FeatureReports, FeaturePerformance, FeatureFinances, FeatureUsers, FeatureSponsorships,
	} {
		if !perms[module] {
			continue
		}
		for _, action := range []string{"create", "read", "update", "delete", "review", "approve"} {
			key := Feature(string(module) + "_" + action)
			perms[key] = true
		}
	}
	return perms
}

type RolePermissions struct {
	Role        UserRole      `json:"role"`
	Permissions PermissionSet `json:"permissions"`
}

type UpdateRolePermissionsRequest struct {
	Permissions PermissionSet `json:"permissions" binding:"required"`
}

type Role struct {
	Role     string `json:"role"`
	Label    string `json:"label"`
	IsSystem bool   `json:"is_system"`
}

type CreateRoleRequest struct {
	Role  string `json:"role" binding:"required"`
	Label string `json:"label" binding:"required"`
}

type UpdateRoleRequest struct {
	Label string `json:"label" binding:"required"`
}

type UpdateUserRolesRequest struct {
	Roles []UserRole `json:"roles" binding:"required,min=1"`
}

type UserAccess struct {
	Profile     *Profile      `json:"profile"`
	Roles       []UserRole    `json:"roles"`
	Permissions PermissionSet `json:"permissions"`
	PrimaryRole UserRole      `json:"primary_role"`
}

func PrimaryRole(roles []UserRole) UserRole {
	if len(roles) == 0 {
		return ""
	}
	primary := roles[0]
	for _, r := range roles {
		if RoleLevel(r) > RoleLevel(primary) {
			primary = r
		}
	}
	return primary
}

func MergePermissions(rolePerms map[UserRole]PermissionSet, roles []UserRole) PermissionSet {
	merged := make(PermissionSet)
	for _, role := range roles {
		if perms, ok := rolePerms[role]; ok {
			for f, allowed := range perms {
				if allowed {
					merged[f] = true
				}
			}
		}
	}

	// Auto-infer base module permissions if any granular CRUD action key is true
	featuresWithCrud := []string{"reports", "members", "voters", "files", "performance", "users", "sponsorships"}
	for _, mod := range featuresWithCrud {
		for _, act := range []string{"read", "create", "update", "delete", "review", "approve"} {
			if merged[Feature(fmt.Sprintf("%s_%s", mod, act))] {
				merged[Feature(mod)] = true
				break
			}
		}
	}

	return merged
}

func FeatureModule(f Feature) string {
	switch f {
	case FeatureMembers, FeatureMembersCreate, FeatureMembersRead, FeatureMembersUpdate, FeatureMembersDelete,
		FeatureMembershipWrite, FeatureMembershipDues, FeatureMembershipAdmin, FeatureMembershipCards, FeatureMembershipDelete:
		return "membership"
	case FeatureVoters, FeatureVotersCreate, FeatureVotersRead, FeatureVotersUpdate, FeatureVotersDelete:
		return "voters"
	case FeatureFiles, FeatureFilesCreate, FeatureFilesRead, FeatureFilesUpdate, FeatureFilesDelete:
		return "files"
	case FeatureReports, FeatureReportsCreate, FeatureReportsRead, FeatureReportsUpdate, FeatureReportsDelete:
		return "reports"
	case FeaturePerformance, FeaturePerformanceCreate, FeaturePerformanceRead, FeaturePerformanceUpdate, FeaturePerformanceDelete, FeaturePerformanceAdmin:
		return "performance"
	case FeatureFinances:
		return "finances"
	case FeatureSponsorships, FeatureSponsorshipsCreate, FeatureSponsorshipsRead, FeatureSponsorshipsUpdate, FeatureSponsorshipsDelete, FeatureSponsorshipsReview, FeatureSponsorshipsApprove:
		return "sponsorships"
	default:
		return ""
	}
}

func DefaultPermissionsForRole(role UserRole) PermissionSet {
	p := make(PermissionSet, len(AllFeatures))
	if role == RoleSuperAdmin {
		for _, f := range AllFeatures {
			p[f] = true
		}
	}
	return p
}
