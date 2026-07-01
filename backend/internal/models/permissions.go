package models

// Feature keys used in role_permissions JSON and API responses.
type Feature string

const (
	FeatureDashboard         Feature = "dashboard"
	FeatureMembers           Feature = "members"
	FeatureVoters            Feature = "voters"
	FeatureFinances          Feature = "finances"
	FeatureFiles             Feature = "files"
	FeatureRecords           Feature = "records"
	FeatureReports           Feature = "reports"
	FeatureReportTemplates   Feature = "report_templates"
	FeaturePerformance       Feature = "performance"
	FeaturePerformanceAdmin  Feature = "performance_admin"
	FeatureSettings          Feature = "settings"
	FeatureUsers             Feature = "users"
	FeatureTechnical         Feature = "technical"
)

var AllFeatures = []Feature{
	FeatureDashboard,
	FeatureMembers,
	FeatureVoters,
	FeatureFinances,
	FeatureFiles,
	FeatureRecords,
	FeatureReports,
	FeatureReportTemplates,
	FeaturePerformance,
	FeaturePerformanceAdmin,
	FeatureSettings,
	FeatureUsers,
	FeatureTechnical,
}

var FeatureLabels = map[Feature]string{
	FeatureDashboard:        "ទំព័រដើម",
	FeatureMembers:          "សមាជិក",
	FeatureVoters:           "អ្នកបោះឆ្នោត",
	FeatureFinances:         "ហិរញ្ញវត្ថុ",
	FeatureFiles:            "ឯកសារ",
	FeatureRecords:          "កំណត់ត្រា",
	FeatureReports:          "របាយការណ៍",
	FeatureReportTemplates:  "គំរូរបាយការណ៍",
	FeaturePerformance:      "លទ្ធផលការងារ",
	FeaturePerformanceAdmin: "គ្រប់គ្រង Performance",
	FeatureSettings:         "ការកំណត់",
	FeatureUsers:            "គ្រប់គ្រងអ្នកប្រើ",
	FeatureTechnical:        "Technical",
}

type PermissionSet map[Feature]bool

type RolePermissions struct {
	Role        UserRole      `json:"role"`
	Permissions PermissionSet `json:"permissions"`
}

type UpdateRolePermissionsRequest struct {
	Permissions PermissionSet `json:"permissions" binding:"required"`
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
	primary := RoleRegularUser
	for _, r := range roles {
		if RoleHierarchy[r] > RoleHierarchy[primary] {
			primary = r
		}
	}
	return primary
}

func MergePermissions(rolePerms map[UserRole]PermissionSet, roles []UserRole) PermissionSet {
	merged := make(PermissionSet, len(AllFeatures))
	for _, feature := range AllFeatures {
		for _, role := range roles {
			if perms, ok := rolePerms[role]; ok && perms[feature] {
				merged[feature] = true
				break
			}
		}
	}
	return merged
}

func DefaultPermissionsForRole(role UserRole) PermissionSet {
	all := func(on bool) PermissionSet {
		p := make(PermissionSet, len(AllFeatures))
		for _, f := range AllFeatures {
			p[f] = on
		}
		return p
	}
	staff := func() PermissionSet {
		p := all(false)
		p[FeatureDashboard] = true
		p[FeatureMembers] = true
		p[FeatureVoters] = true
		p[FeatureFinances] = true
		p[FeatureFiles] = true
		p[FeatureRecords] = true
		p[FeatureReports] = true
		p[FeaturePerformance] = true
		p[FeatureSettings] = true
		return p
	}

	switch role {
	case RoleSuperAdmin, RoleAdmin:
		return all(true)
	case RoleDistrictChief, RoleCommuneChief, RoleCommuneClerk, RoleVillageChief, RoleRecorder:
		return staff()
	default:
		p := all(false)
		p[FeatureDashboard] = true
		p[FeatureSettings] = true
		return p
	}
}
