# Zone Chief Configuration Master — BRD

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)
**Feature:** `zone_chiefs` — Configuration Master for Geographic Zone Chief Assignment
**Version:** 1.0
**Last updated:** August 2026
**Audience:** Developers, QA
**Status:** Implemented

---

## 1. Overview

### 1.1 Problem

The system has geographic zones (Province → District → Commune → Village) but no structured way
to designate which user serves as chief for each zone. Chiefs are assigned roles like `district_chief`,
`commune_chief`, `village_chief` but there is no master configuration screen that maps
zone_code → chief user for the entire administrative hierarchy at a glance.

### 1.2 Solution

A **Zone Chief Configuration Master** — a dedicated admin settings page that:

1. Displays the full geographic zone tree (lazy-loaded per level)
2. Shows which zones have chiefs assigned vs. vacant
3. Allows admin to assign/remove chiefs per zone in a single unified view
4. Tracks assignment statistics per zone type
5. Integrates with the module workflow system for enable/disable toggling

---

## 2. Database Changes

### 2.1 New Role: `province_chief`

Added to `user_role` enum alongside existing roles:

| Role | Level | Description |
|------|-------|-------------|
| super_admin | 8 | Ministry-level full access |
| admin | 7 | District-level full access |
| **province_chief** | **6** | **Province-scoped oversight (NEW)** |
| district_chief | 5 | District-scoped |
| commune_chief | 4 | Commune-scoped |
| commune_clerk | 3 | Data entry |
| village_chief | 2 | Village-scoped |
| recorder | 1 | Own records |
| regular_user | 0 | Dashboard only |

Permissions for `province_chief` match other staff roles: all features except `users`, `technical`,
and `performance_admin`.

### 2.2 New Table: `zone_chief_assignments`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto-generated |
| zone_code | VARCHAR(8) NOT NULL UNIQUE | FK → `geographic_zones.zone_code` |
| user_id | UUID NOT NULL | FK → `auth.users.id` |
| assigned_by | UUID | FK → `auth.users.id` |
| assigned_at | TIMESTAMPTZ | Default NOW() |
| updated_at | TIMESTAMPTZ | Default NOW() |

- One chief per zone (UNIQUE on zone_code)
- RLS: anyone authenticated can read; only super_admin/admin can write
- Deleting a geographic zone cascade-deletes its assignment

### 2.3 New RPC Function: `get_zone_counts()`

```sql
CREATE OR REPLACE FUNCTION public.get_zone_counts()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_object_agg(zone_type, cnt)
  FROM (
    SELECT zone_type, count(*) AS cnt
    FROM public.geographic_zones
    GROUP BY zone_type
  ) t;
$$;
```

Returns counts like `{"Province":25,"District":210,"Commune":1662,"Village":14522}` —
bypasses the PostgREST 1000-row limit.

### 2.4 Module Registration

```
module_configs: zone_chiefs (enabled: true, need_approval: false)
```

---

## 3. API Endpoints

All endpoints under `/api/admin/zone-chiefs`, gated by `FEATURE.users`.

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/admin/zone-chiefs` | `ListAssignments` | Returns all zone chief assignments with user names and zone type labels |
| GET | `/api/admin/zone-chiefs/:zoneCode` | `GetAssignment` | Returns assignment for a single zone code |
| POST | `/api/admin/zone-chiefs` | `Assign` | Creates or updates a zone chief assignment |
| DELETE | `/api/admin/zone-chiefs` | `Remove` | Removes assignment for given `zone_code` |
| GET | `/api/party/zones/counts` | `GetZoneCounts` | Returns zone counts by type (via RPC) |

### 3.1 Assign Side Effects

When a user is assigned as zone chief, the handler also:

1. Adds the corresponding role to `user_roles` (e.g., `province_chief` for Province zones)
2. Sets the user's `profiles.zone_code` if not already set
3. Does NOT remove existing roles — users keep their current roles plus the new chief role

---

## 4. Frontend: SettingsZoneChief page

**Route:** `/settings/zone-chiefs`
**Access:** super_admin / admin only (`adminOnly` route guard)

### 4.1 UI Components

| Component | Description |
|-----------|-------------|
| **Stats cards** | 4 cards (Province/District/Commune/Village) showing assigned/total with progress bars. Click to filter tree by zone type. |
| **Zone tree** | Lazy-loaded hierarchy. Initially shows 25 provinces. Click chevron to load children per level via `GET /party/zones?parent_code=XX`. |
| **Assignment row** | Each zone row shows: zone type badge (icon + label), zone name + code, assign button or assigned user badge with remove button. |
| **Assign modal** | Shows selected zone info card + scrollable user list with search, avatar initials, selected indicator. |

### 4.2 Lazy Loading Flow

```
Load page → GET /party/zones?type=Province           [25 rows, under limit]
Click expand province → GET /party/zones?parent_code=01 [districts]
Click expand district → GET /party/zones?parent_code=0102 [communes]
Click expand commune → GET /party/zones?parent_code=010201 [villages]
```

This avoids the PostgREST 1000-row limit that affected the old `GetZoneTree` approach.

### 4.3 Zone Type Visuals

| Type | Icon | Badge Color | Border Color |
|------|------|-------------|--------------|
| Province | LuMapPin | #e8eaf6 / #283593 | #5c6bc0 |
| District | LuBuilding2 | #e0f2f1 / #00695c | #26a69a |
| Commune | LuHouse | #e8f5e9 / #2e7d32 | #66bb6a |
| Village | LuTreePine | #fff3e0 / #e65100 | #ff9800 |

---

## 5. Files Changed

### Backend

| File | Change |
|------|--------|
| `internal/models/user.go` | Added `RoleProvinceChief`, adjusted hierarchy levels (8/7/6...) |
| `internal/models/permissions.go` | Added `province_chief` to default staff permissions |
| `internal/models/zone_chief.go` | **New**: `ZoneChiefAssignment`, `AssignZoneChiefRequest`, `RemoveZoneChiefRequest` |
| `internal/repository/zone_chief_repo.go` | **New**: CRUD for `zone_chief_assignments` + `fetchZoneInfo`, `fetchUserNames`, `GetZoneType` |
| `internal/repository/party_repo.go` | Added `CountZonesByType` (calls RPC `get_zone_counts`) |
| `internal/repository/permission_repo.go` | Added `province_chief` to `builtinRoles`, `isSystemRole`, seed lists |
| `internal/handlers/zone_chief.go` | **New**: `ListAssignments`, `GetAssignment`, `Assign`, `Remove` |
| `internal/handlers/party.go` | Added `GetZoneCounts` handler |
| `cmd/api/main.go` | Registered routes, added `zoneChiefHandler`, added `RoleProvinceChief` to membership approval middleware |

### Frontend

| File | Change |
|------|--------|
| `api/zoneChief.js` | **New**: `zoneChiefAPI` client (list, get, assign, remove) |
| `api/party.js` | Added `getZoneCounts` |
| `pages/settings/SettingsZoneChief.jsx` | **New**: Full page with lazy tree, stats, assign modal |
| `pages/Settings.jsx` | Added zone chief card in settings grid |
| `App.jsx` | Added route `/settings/zone-chiefs` |
| `hooks/useRoleOptions.js` | Added `province_chief` to fallback roles |
| `pages/admin/Admin.jsx` | Added `province_chief` to role options + badge style |
| `index.css` | Added `.zone-chief-row` styles (flex row with hover) |

### Migrations

| File | Change |
|------|--------|
| `028_province_chief_and_assignments.sql` | Enum value, roles seed, permissions seed, `zone_chief_assignments` table + RLS |
| `20260812120000_province_chief_and_assignments.sql` | Supabase copy |
| `20260812130000_zone_counts_rpc.sql` | `get_zone_counts()` RPC function |
| `20260812140000_zone_chiefs_module.sql` | Module registration in `module_configs` |

---

## 6. Technical Notes

### 6.1 PostgREST Row Limit

The geographic_zones table has ~16,400 rows. PostgREST defaults to `max-rows=1000`.
Solutions applied:
- Zone tree: lazy-loaded per level (max 200 children per parent)
- Zone counts: PostgreSQL RPC function bypasses limit
- fetchZoneInfo/fetchUserNames: filtered `.In()` queries instead of full table scans

### 6.2 Module Integration

The feature is linked to the Configuration Workflow system via `module_configs`.zone_chiefs.
Future enhancement: wire `RequireModuleEnabled` middleware on admin routes to return 503
when `zone_chiefs` module is disabled, and hide the settings card based on module state.
