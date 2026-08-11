package models

// Feature keys used in role_permissions JSON and API responses.
type Feature string

const (
	FeatureDashboard          Feature = "dashboard"
	FeatureMembers            Feature = "members"
	FeatureVoters             Feature = "voters"
	FeatureFiles              Feature = "files"
	FeatureRecords            Feature = "records"
	FeatureReports            Feature = "reports"
	FeaturePerformance        Feature = "performance"
	FeaturePerformanceAdmin   Feature = "performance_admin"
	FeatureSettings           Feature = "settings"
	FeatureUsers              Feature = "users"
	FeatureTechnical          Feature = "technical"
	FeatureFinances           Feature = "finances"
	FeatureMembershipWrite    Feature = "membership_write"
	FeatureMembershipDues     Feature = "membership_dues"
	FeatureMembershipAdmin    Feature = "membership_admin"
	FeatureMembershipCards    Feature = "membership_cards"
	FeatureMembershipDelete   Feature = "membership_delete"
)

var AllFeatures = []Feature{
	FeatureDashboard,
	FeatureMembers,
	FeatureVoters,
	FeatureFiles,
	FeatureRecords,
	FeatureReports,
	FeaturePerformance,
	FeaturePerformanceAdmin,
	FeatureSettings,
	FeatureUsers,
	FeatureTechnical,
	FeatureFinances,
	FeatureMembershipWrite,
	FeatureMembershipDues,
	FeatureMembershipAdmin,
	FeatureMembershipCards,
	FeatureMembershipDelete,
}

var FeatureLabels = map[Feature]string{
	FeatureDashboard:        "ទំព័រដើម",
	FeatureMembers:          "សមាជិក",
	FeatureVoters:           "អ្នកបោះឆ្នោត",
	FeatureFiles:            "ឯកសារ",
	FeatureRecords:          "កំណត់ត្រា",
	FeatureReports:          "របាយការណ៍",
	FeaturePerformance:      "លទ្ធផលការងារ",
	FeaturePerformanceAdmin: "គ្រប់គ្រង Performance",
	FeatureSettings:         "ការកំណត់",
	FeatureUsers:            "គ្រប់គ្រងអ្នកប្រើ",
	FeatureTechnical:        "Technical",
	FeatureFinances:         "ហិរញ្ញវត្ថុ",
	FeatureMembershipWrite:  "សរសេរសមាជិក",
	FeatureMembershipDues:   "តារាងសមាជិក",
	FeatureMembershipAdmin:  "គ្រប់គ្រងសមាជិក",
	FeatureMembershipCards:  "កាតសមាជិក",
	FeatureMembershipDelete: "លុបសមាជិក",
}

type PermissionSet map[Feature]bool

type RolePermissions struct {
	Role        UserRole      `json:"role"`
	Permissions PermissionSet `json:"permissions"`
}

type UpdateRolePermissionsRequest struct {
	Permissions PermissionSet `json:"permissions" binding:"required"`
}

type Role struct {
	Role      string `json:"role"`
	Label     string `json:"label"`
	IsSystem  bool   `json:"is_system"`
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
	primary := RoleRegularUser
	for _, r := range roles {
		if RoleLevel(r) > RoleLevel(primary) {
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
	// all features on
	allOn := func() PermissionSet {
		p := make(PermissionSet, len(AllFeatures))
		for _, f := range AllFeatures {
			p[f] = true
		}
		return p
	}
	// all features off
	none := func() PermissionSet {
		return make(PermissionSet, len(AllFeatures))
	}
	// set specific features to true
	set := func(p PermissionSet, features ...Feature) PermissionSet {
		for _, f := range features {
			p[f] = true
		}
		return p
	}
	// copy a permission set
	copy := func(src PermissionSet) PermissionSet {
		p := make(PermissionSet, len(AllFeatures))
		for k, v := range src {
			p[k] = v
		}
		return p
	}

	// ----- ROLE-BASED PERMISSIONS -----

	// recorder: view members, files, voters + basic write
	recorderPerms := set(none(),
		FeatureDashboard,
		FeatureMembers,
		FeatureVoters,
		FeatureFiles,
		FeatureSettings,
		FeatureMembershipWrite,
		FeatureMembershipDues,
	)

	// village_chief: recorder + records + cards
	villageChiefPerms := set(copy(recorderPerms),
		FeatureRecords,
		FeatureMembershipCards,
	)

	// commune_clerk: village_chief + reports + performance + finances
	communeClerkPerms := set(copy(villageChiefPerms),
		FeatureReports,
		FeaturePerformance,
		FeatureFinances,
	)

	// commune_chief: commune_clerk + admin powers
	communeChiefPerms := set(copy(communeClerkPerms),
		FeaturePerformanceAdmin,
		FeatureMembershipAdmin,
	)

	// district_chief: commune_chief + user management + technical + delete
	districtChiefPerms := set(copy(communeChiefPerms),
		FeatureUsers,
		FeatureTechnical,
		FeatureMembershipDelete,
	)

	// province_chief: same as district_chief
	provinceChiefPerms := copy(districtChiefPerms)

	// admin: everything except maybe some destructive ops (but currently all)
	adminPerms := allOn()

	// super_admin: everything
	superAdminPerms := allOn()

	switch role {
	case RoleSuperAdmin:
		return superAdminPerms
	case RoleAdmin:
		return adminPerms
	case RoleProvinceChief:
		return provinceChiefPerms
	case RoleDistrictChief:
		return districtChiefPerms
	case RoleCommuneChief:
		return communeChiefPerms
	case RoleCommuneClerk:
		return communeClerkPerms
	case RoleVillageChief:
		return villageChiefPerms
	case RoleRecorder:
		return recorderPerms
	default:
		p := none()
		p[FeatureDashboard] = true
		p[FeatureSettings] = true
		return p
	}
}
