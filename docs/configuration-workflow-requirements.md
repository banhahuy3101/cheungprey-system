# Configuration Workflow System — Requirements Document

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)
**Version:** 1.0
**Last updated:** August 2026
**Audience:** Developers, QA
**Feature:** `configuration_workflow` (new)

---

## 1. Overview

### 1.1 Problem

The system has 12 modules (feature flags). Several modules require sequential configuration before they become usable:

| Module | Prerequisite Config Steps |
|--------|--------------------------|
| `performance` | 1. Define Domains → 2. Define Sub-Domains → 3. Define Indicators → 4. Set Reporting Periods |
| `finances` | 1. Seed Chart of Accounts → 2. Create Budgets → 3. Configure Approval Rules |
| `reports` | 1. Upload DOCX/HTML Templates → 2. Map Placeholders → 3. Test Fill → 4. Publish Templates |
| `users` | 1. Define Custom Roles → 2. Set Feature Permissions → 3. Invite Users |

Currently, there is no guided process. Admins must know the correct order and manually navigate between settings pages. New administrators often miss steps, resulting in broken modules.

### 1.2 Solution

A **Configuration Workflow System** that:

1. Lets technical admins define ordered configuration steps per module from a new settings page
2. Tracks completion status of each step based on verification criteria
3. Assigns a readiness state to each module: `not_configured` → `in_progress` → `configured` → `active`
4. Provides a dashboard widget showing module readiness at a glance

---

## 2. Architecture

### 2.1 Data Model

```sql
-- Step templates define named, reusable configuration actions
CREATE TABLE config_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT NOT NULL,               -- e.g. "finances", "performance"
    sort_order INT NOT NULL DEFAULT 0,
    title_kh TEXT NOT NULL,                 -- e.g. "បង្កើតគណនី Chart of Accounts"
    title_en TEXT NOT NULL,
    description_kh TEXT,
    description_en TEXT,
    verification_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (verification_type IN ('manual', 'sql_check', 'api_check', 'count_check')),
    verification_rule JSONB,                -- config for auto-verification (see 2.2)
    action_label_kh TEXT,                   -- e.g. "បើកទំព័រ CoA"
    action_label_en TEXT,
    action_url TEXT,                        -- link to the relevant settings page
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, sort_order)
);

-- Tracks progress per step for a given zone + module
CREATE TABLE config_workflow_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES config_workflow_steps(id) ON DELETE CASCADE,
    zone_code VARCHAR(8),                   -- NULL = global (non-zone-scoped modules)
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (step_id, zone_code)
);

-- Module-level readiness state
CREATE TABLE config_workflow_module_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT NOT NULL,
    zone_code VARCHAR(8),                   -- NULL = global
    state TEXT NOT NULL DEFAULT 'not_configured'
        CHECK (state IN ('not_configured', 'in_progress', 'configured', 'active')),
    activated_by UUID REFERENCES auth.users(id),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, zone_code)
);
```

### 2.2 Verification Types

| Type | Description | `verification_rule` Example |
|------|-------------|---------------------------|
| `manual` | Admin manually marks as complete | `{}` |
| `sql_check` | Run a SQL query; step is completed if result meets condition | `{"query": "SELECT COUNT(*) FROM chart_of_accounts", "condition": "> 0"}` |
| `api_check` | Call an API endpoint; step is completed if response status is 2xx | `{"url": "/api/fms/coa", "method": "GET", "condition": "status_ok"}` |
| `count_check` | Check record count from existing API; step is completed if count meets threshold | `{"endpoint": "/api/performance/domains", "condition": ">= 1"}` |

---

## 3. Module Workflow States

```
┌─────────────────┐
│  not_configured  │  ← No steps completed
└────────┬────────┘
         │ (first step marked in_progress)
         ▼
┌─────────────────┐
│   in_progress    │  ← At least one step started, not all complete
└────────┬────────┘
         │ (all required steps completed)
         ▼
┌─────────────────┐
│   configured     │  ← All required steps verified complete
└────────┬────────┘
         │ (admin explicitly activates)
         ▼
┌─────────────────┐
│     active       │  ← Module is live and ready for end users
└─────────────────┘
```

### 3.1 State Transition Rules

| Rule ID | Rule |
|---------|------|
| TR-01 | `not_configured` → `in_progress`: automatic when any step is marked `in_progress` |
| TR-02 | `in_progress` → `configured`: automatic when all `is_required=true` steps are `completed` |
| TR-03 | `configured` → `active`: manual by admin with `technical` feature |
| TR-04 | `active` → `configured`: manual if a module needs reconfiguration |
| TR-05 | `configured` → `not_configured`: manual reset (clears all progress) |
| TR-06 | Any state → `in_progress`: if a previously completed step is unchecked |
| TR-07 | Module state is per zone for zone-scoped modules (`finances`, `performance`, `reports`, `members`, `voters`); global for system-wide modules (`users`, `technical`) |

---

## 4. API Endpoints

### 4.1 Step Template CRUD

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/config-workflow/steps?module=X` | List steps for a module | `technical` |
| `POST` | `/api/config-workflow/steps` | Create a new step | `technical` |
| `PUT` | `/api/config-workflow/steps/:id` | Update a step | `technical` |
| `DELETE` | `/api/config-workflow/steps/:id` | Delete a step | `technical` |
| `PUT` | `/api/config-workflow/steps/reorder` | Reorder steps (batch sort_order) | `technical` |

### 4.2 Progress Tracking

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/config-workflow/progress?module=X&zone_code=Y` | Get progress for a module+zone | `technical` |
| `PUT` | `/api/config-workflow/progress/:step_id` | Update a step's status (manual verify) | `technical` |
| `POST` | `/api/config-workflow/progress/verify-all` | Run auto-verification for all steps in a module+zone | `technical` |
| `POST` | `/api/config-workflow/progress/reset` | Reset all progress for a module+zone | `technical` |

### 4.3 Module State

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/config-workflow/module-states` | List all module states (for dashboard) | `dashboard` |
| `GET` | `/api/config-workflow/module-states/:module_key` | Get state for a specific module | `technical` |
| `PUT` | `/api/config-workflow/module-states/:module_key/activate` | Set module to `active` | `technical` |
| `PUT` | `/api/config-workflow/module-states/:module_key/deactivate` | Set module to `configured` | `technical` |
| `PUT` | `/api/config-workflow/module-states/:module_key/reset` | Reset to `not_configured` | `technical` |

### 4.4 Seed / Bootstrap

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `POST` | `/api/config-workflow/seed-defaults` | Seed default step templates for all modules | `technical` |

---

## 5. Default Step Templates

On `seed-defaults`, the following steps are created:

### 5.1 Finances Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | បង្កើតគណនី Chart of Accounts | Create Chart of Accounts | `/finances/coa` | `count_check` — coa count >= 1 |
| 2 | កំណត់ថវិកាប្រចាំឆ្នាំ | Set Annual Budgets | `/finances/budgets` | `count_check` — budget count >= 1 |
| 3 | កំណត់អ្នកអនុម័ត | Configure Approvers | `/settings/role-permissions` | `manual` |
| 4 | ដំណើរការម៉ូឌុលហិរញ្ញវត្ថុ | Activate Finance Module | — | `manual` |

### 5.2 Performance Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | កំណត់ដែន (Domain) | Define Domains | `/settings/performance` | `count_check` — domain count >= 1 |
| 2 | កំណត់ចំណុចរង (Sub-Domain) | Define Sub-Domains | `/settings/performance` | `count_check` — sub-domain count >= 1 |
| 3 | កំណត់សូចនាករ (Indicator) | Define Indicators | `/settings/performance` | `count_check` — indicator count >= 1 |
| 4 | កំណត់រយៈពេលរបាយការណ៍ | Set Reporting Periods | `/settings/performance_period` | `count_check` — period count >= 1 |
| 5 | ដំណើរការម៉ូឌុល Performance | Activate Performance Module | — | `manual` |

### 5.3 Reports Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | បញ្ចូលគំរូរបាយការណ៍ (.docx/.html) | Upload Report Templates | `/settings/report-templates` | `count_check` — template count >= 1 |
| 2 | ផ្ទៀងផ្ទាត់ Placeholder ក្នុងគំរូ | Verify Template Placeholders | `/settings/report-templates` | `manual` |
| 3 | សាកល្បងបំពេញគំរូ | Test Fill Template | `/reports/create-template` | `manual` |
| 4 | ដំណើរការម៉ូឌុលរបាយការណ៍ | Activate Reports Module | — | `manual` |

### 5.4 Users & Roles Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | កំណត់តួនាទីផ្ទាល់ខ្លួន (បើចាំបាច់) | Define Custom Roles | `/settings/role-permissions` | `manual` |
| 2 | កំណត់សិទ្ធិតាមតួនាទី | Set Role Permissions | `/settings/role-permissions` | `manual` |
| 3 | កំណត់ពាក្យសម្ងាត់ដើម | Set Default Password | `/settings/technical/system` | `manual` |
| 4 | អញ្ជើញអ្នកប្រើប្រាស់ | Invite Users | `/settings/users` | `count_check` — user count >= 2 |
| 5 | ដំណើរការម៉ូឌុលអ្នកប្រើប្រាស់ | Activate Users Module | — | `manual` |

### 5.5 Members Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | ផ្ទៀងផ្ទាត់ទិន្នន័យភូមិសាស្ត្រ | Verify Geographic Zones | `/members` | `count_check` — zone count >= 1 |
| 2 | បង្កើតសមាជិកគំរូ | Create Sample Members | `/members/create` | `count_check` — member count >= 1 |
| 3 | ដំណើរការម៉ូឌុលសមាជិក | Activate Members Module | — | `manual` |

### 5.6 Voters Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | បញ្ចូលទិន្នន័យអ្នកបោះឆ្នោតគំរូ | Add Sample Voter Data | `/voters` | `count_check` — voter count >= 1 |
| 2 | ដំណើរការម៉ូឌុលអ្នកបោះឆ្នោត | Activate Voters Module | — | `manual` |

### 5.7 Files Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | បញ្ចូលឯកសារគំរូ | Upload Sample Files | `/files` | `count_check` — file count >= 1 |
| 2 | ដំណើរការម៉ូឌុលឯកសារ | Activate Files Module | — | `manual` |

### 5.8 Records Module

| Order | Title (KH) | Title (EN) | Action URL | Verification |
|-------|-----------|------------|------------|-------------|
| 1 | បង្កើតកំណត់ត្រាគំរូ | Create Sample Record | `/records` | `count_check` — record count >= 1 |
| 2 | ដំណើរការម៉ូឌុលកំណត់ត្រា | Activate Records Module | — | `manual` |

> **Note:** `dashboard`, `settings` modules are always active (no configuration needed). `performance_admin` is automatically active when `performance` is active. `technical` is auto-active for super_admin/admin.

---

## 6. Frontend Pages

### 6.1 Settings Page — Configuration Workflow

**Route:** `/settings/configuration-workflow`
**Feature:** `technical`

A new card in the Settings hub:

| Icon | Title | Description | Path |
|------|-------|-------------|------|
| `LuWorkflow` | កំណត់រចនាសម្ព័ន្ធ Workflow | កំណត់ជំហានតំឡើងម៉ូឌុល និងតាមដានដំណើរការ | `/settings/configuration-workflow` |

### 6.2 Configuration Workflow Page Layout

```
┌─────────────────────────────────────────────────┐
│ ← ត្រឡប់    កំណត់រចនាសម្ព័ន្ធ Workflow          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Module Selector: [Finances ▾]  Zone: [All ▾]   │
│                                                 │
│  ┌─ Module State ─────────────────────────────┐ │
│  │  Status: ● In Progress                      │ │
│  │  Progress: 2 / 4 steps completed            │ │
│  │  [████████░░░░░░░░] 50%                      │ │
│  │                                             │ │
│  │  [Activate Module] [Reset] [Seed Defaults]  │ │
│  └─────────────────────────────────────────────┘ │
│                                                 │
│  ┌─ Steps ────────────────────────────────────┐ │
│  │                                            │ │
│  │  ✓ 1. បង្កើតគណនី Chart of Accounts      │ │
│  │     Verified by auto-check │ 2 Aug 2026    │ │
│  │     [Re-verify] [Edit Step]                │ │
│  │                                            │ │
│  │  ✓ 2. កំណត់ថវិកាប្រចាំឆ្នាំ            │ │
│  │     Marked complete by Admin A │ 3 Aug     │ │
│  │     [Re-verify] [Edit Step]                │ │
│  │                                            │ │
│  │  ○ 3. កំណត់អ្នកអនុម័ត                    │ │
│  │     [បើកទំព័រសិទ្ធិតួនាទី →]           │ │
│  │     [Mark Complete]                        │ │
│  │                                            │ │
│  │  ○ 4. ដំណើរការម៉ូឌុលហិរញ្ញវត្ថុ        │ │
│  │     (Auto after all steps complete)        │ │
│  │                                            │ │
│  │  [+ Add Step]                              │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 6.3 Step Edit Modal

```
┌─ Edit Step ───────────────────────────────────┐
│                                                │
│  Title (KH): [បង្កើតគណនី Chart of Accounts   ] │
│  Title (EN): [Create Chart of Accounts        ] │
│  Description (KH): [បង្កើតគណនីយ៉ាងហោច ១    ] │
│  Sort Order: [1]                               │
│  Required: [✓]                                 │
│                                                │
│  Verification Type: [Count Check ▾]            │
│  ───────────────────────────────────────       │
│  Endpoint: [/api/fms/coa             ]         │
│  Condition: [>= 1                    ]         │
│                                                │
│  Action Label (KH): [បើកទំព័រ CoA          ] │
│  Action URL: [/finances/coa           ]         │
│                                                │
│  [Save] [Cancel]                               │
└────────────────────────────────────────────────┘
```

### 6.4 Dashboard Widget

A new widget on the home dashboard (shown to users with `technical` or `users` feature):

```
┌─ Module Readiness ────────────────────────────┐
│                                                │
│  ● Finances       ████████░░ 75% Configured    │
│  ● Performance    ██████████ 100% Active       │
│  ○ Reports        ░░░░░░░░░░ 0% Not Started    │
│  ● Members        ██░░░░░░░░ 25% In Progress   │
│  ● Voters         ██████████ 100% Active       │
│  ○ Files          ░░░░░░░░░░ 0% Not Started    │
│  ○ Records        ░░░░░░░░░░ 0% Not Started    │
│  ● Users & Roles  ██████████ 100% Active       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 7. Backend Implementation Notes

### 7.1 New Feature Flag

Add `configuration_workflow` to feature enums:

```go
// backend/internal/models/permissions.go
FeatureConfigurationWorkflow Feature = "configuration_workflow"
```

However — since this overlaps heavily with `technical`, consider using the existing `technical` feature instead. No new feature flag needed; the workflow settings page is gated by `technical`.

### 7.2 New Files

| Layer | File | Purpose |
|-------|------|---------|
| Models | `internal/models/config_workflow.go` | Step, Progress, ModuleState structs |
| Repository | `internal/repository/config_workflow_repo.go` | CRUD + verification queries |
| Handler | `internal/handlers/config_workflow.go` | HTTP handlers |
| Migration | `migrations/023_config_workflow.sql` | DDL |

### 7.3 Route Registration

```go
// cmd/api/main.go
configWorkflow := api.Group("/api/config-workflow")
configWorkflow.Use(auth.JWTMiddlewareWithAccess(supabaseClient))
configWorkflow.Use(auth.RequireFeature(models.FeatureTechnical))
{
    // Steps
    configWorkflow.GET("/steps", configHandler.ListSteps)
    configWorkflow.POST("/steps", configHandler.CreateStep)
    configWorkflow.PUT("/steps/:id", configHandler.UpdateStep)
    configWorkflow.DELETE("/steps/:id", configHandler.DeleteStep)
    configWorkflow.PUT("/steps/reorder", configHandler.ReorderSteps)

    // Progress
    configWorkflow.GET("/progress", configHandler.GetProgress)
    configWorkflow.PUT("/progress/:stepId", configHandler.UpdateProgress)
    configWorkflow.POST("/progress/verify-all", configHandler.VerifyAll)
    configWorkflow.POST("/progress/reset", configHandler.ResetProgress)

    // Module State
    configWorkflow.GET("/module-states", configHandler.ListModuleStates)
    configWorkflow.GET("/module-states/:moduleKey", configHandler.GetModuleState)
    configWorkflow.PUT("/module-states/:moduleKey/activate", configHandler.ActivateModule)
    configWorkflow.PUT("/module-states/:moduleKey/deactivate", configHandler.DeactivateModule)
    configWorkflow.PUT("/module-states/:moduleKey/reset", configHandler.ResetModule)

    // Seed
    configWorkflow.POST("/seed-defaults", configHandler.SeedDefaults)
}
```

The `/api/config-workflow/module-states` (GET, list all) should be accessible with `dashboard` feature (not `technical`) so the dashboard widget can read it:

```go
// Separate route group for dashboard
dashboardGroup := api.Group("/api/config-workflow")
dashboardGroup.Use(auth.JWTMiddlewareWithAccess(supabaseClient))
dashboardGroup.Use(auth.RequireFeature(models.FeatureDashboard))
{
    dashboardGroup.GET("/module-states", configHandler.ListModuleStates)
}
```

### 7.4 Auto-Verification Logic

```go
func (r *ConfigWorkflowRepo) RunVerification(step *models.ConfigWorkflowStep, zoneCode string) (bool, error) {
    switch step.VerificationType {
    case "manual":
        return false, nil // manual steps never auto-verify

    case "count_check":
        rule := step.VerificationRule
        endpoint := rule["endpoint"].(string)
        condition := rule["condition"].(string) // e.g. ">= 1"
        count, err := r.fetchCount(endpoint, zoneCode)
        if err != nil {
            return false, err
        }
        return evaluateCondition(count, condition), nil

    case "sql_check":
        // Run the SQL query defined in verification_rule
        // Compare result against condition
        ...

    case "api_check":
        // Call the endpoint, check response status
        ...
    }
    return false, nil
}
```

### 7.5 Startup Task

On server startup, check if any steps exist. If table is empty, seed default step templates:

```go
// cmd/api/main.go
func SeedDefaultConfigWorkflowSteps(supabaseClient *supabase.Client) {
    count, _ := supabaseClient.From("config_workflow_steps").Select("*", "exact").Single()
    if count == 0 {
        // Insert default steps for all modules
    }
}
```

### 7.6 Module Activation Guard (Optional — Phase 2)

When a module is `not_configured` or `configured` (not `active`), consider showing a banner on the module's pages:

> "ម៉ូឌុលនេះមិនទាន់ដំណើរការពេញលេញនៅឡើយទេ។ សូមបញ្ចប់ការកំណត់រចនាសម្ព័ន្ធ។"
> (This module is not yet fully activated. Please complete configuration.)

This can be implemented as middleware that checks the module state before allowing access to the module's routes. **Deferred to Phase 2** to avoid disrupting existing functionality.

---

## 8. Frontend Implementation Notes

### 8.1 New Files

| File | Purpose |
|------|---------|
| `src/pages/settings/ConfigurationWorkflow.jsx` | Main workflow admin page |
| `src/components/ConfigurationWorkflow/StepList.jsx` | Step list with progress indicators |
| `src/components/ConfigurationWorkflow/StepEditModal.jsx` | Step create/edit modal |
| `src/components/ConfigurationWorkflow/ModuleStateCard.jsx` | Module state summary card |
| `src/components/ConfigurationWorkflow/ModuleReadinessWidget.jsx` | Dashboard widget |
| `src/api/configurationWorkflow.js` | API client |

### 8.2 API Client

```js
// src/api/configurationWorkflow.js
import api from './client';

export const configWorkflowAPI = {
  listSteps: (moduleKey) => api.get('/config-workflow/steps', { params: { module: moduleKey } }),
  createStep: (data) => api.post('/config-workflow/steps', data),
  updateStep: (id, data) => api.put(`/config-workflow/steps/${id}`, data),
  deleteStep: (id) => api.delete(`/config-workflow/steps/${id}`),
  reorderSteps: (data) => api.put('/config-workflow/steps/reorder', data),

  getProgress: (moduleKey, zoneCode) =>
    api.get('/config-workflow/progress', { params: { module: moduleKey, zone_code: zoneCode } }),
  updateProgress: (stepId, data) => api.put(`/config-workflow/progress/${stepId}`, data),
  verifyAll: (moduleKey, zoneCode) =>
    api.post('/config-workflow/progress/verify-all', { module: moduleKey, zone_code: zoneCode }),
  resetProgress: (moduleKey, zoneCode) =>
    api.post('/config-workflow/progress/reset', { module: moduleKey, zone_code: zoneCode }),

  listModuleStates: () => api.get('/config-workflow/module-states'),
  getModuleState: (moduleKey) => api.get(`/config-workflow/module-states/${moduleKey}`),
  activateModule: (moduleKey, zoneCode) =>
    api.put(`/config-workflow/module-states/${moduleKey}/activate`, { zone_code: zoneCode }),
  deactivateModule: (moduleKey, zoneCode) =>
    api.put(`/config-workflow/module-states/${moduleKey}/deactivate`, { zone_code: zoneCode }),
  resetModule: (moduleKey, zoneCode) =>
    api.put(`/config-workflow/module-states/${moduleKey}/reset`, { zone_code: zoneCode }),

  seedDefaults: () => api.post('/config-workflow/seed-defaults'),
};
```

### 8.3 Settings.jsx Integration

Add a 7th card to the existing Settings page:

```jsx
{ key: FEATURES.technical, icon: LuWorkflow, title: "កំណត់រចនាសម្ព័ន្ធ Workflow",
  desc: "កំណត់ជំហានតំឡើងម៉ូឌុល និងតាមដានដំណើរការ",
  path: "/settings/configuration-workflow" },
```

---

## 9. Database Migration

```sql
-- 023_config_workflow.sql
BEGIN;

CREATE TABLE config_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    title_kh TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_kh TEXT,
    description_en TEXT,
    verification_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (verification_type IN ('manual', 'sql_check', 'api_check', 'count_check')),
    verification_rule JSONB,
    action_label_kh TEXT,
    action_label_en TEXT,
    action_url TEXT,
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, sort_order)
);

CREATE TABLE config_workflow_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES config_workflow_steps(id) ON DELETE CASCADE,
    zone_code VARCHAR(8),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (step_id, zone_code)
);

CREATE TABLE config_workflow_module_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT NOT NULL,
    zone_code VARCHAR(8),
    state TEXT NOT NULL DEFAULT 'not_configured'
        CHECK (state IN ('not_configured', 'in_progress', 'configured', 'active')),
    activated_by UUID REFERENCES auth.users(id),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, zone_code)
);

CREATE INDEX idx_cw_steps_module ON config_workflow_steps(module_key, sort_order);
CREATE INDEX idx_cw_progress_step ON config_workflow_progress(step_id, zone_code);
CREATE INDEX idx_cw_progress_status ON config_workflow_progress(status);
CREATE INDEX idx_cw_module_state_module ON config_workflow_module_state(module_key);
CREATE INDEX idx_cw_module_state_state ON config_workflow_module_state(state);

COMMIT;
```

---

## 10. Test Cases

### 10.1 Step Template Management

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-01 | Seed default steps via API | 4 steps created for finances, 5 for performance, etc. |
| T-02 | Create custom step | Step appears with correct sort order |
| T-03 | Update step title | Title updated, reflected in progress list |
| T-04 | Delete step | Step removed; existing progress records cascade-deleted |
| T-05 | Reorder steps | `sort_order` updated for all steps in batch |
| T-06 | Duplicate sort_order | Server returns 409 conflict |

### 10.2 Progress Tracking

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-07 | Manual complete a step | Status = completed, completed_by + completed_at set |
| T-08 | Auto-verify count_check (coa >= 1) | If CoA exists, step auto-completes |
| T-09 | Auto-verify count_check (coa = 0) | Step remains pending |
| T-10 | Mark step in_progress | Module state auto-transitions to in_progress |
| T-11 | Complete all required steps | Module state auto-transitions to configured |
| T-12 | Uncheck a completed step | Module state returns to in_progress |
| T-13 | Skip a non-required step | Does not block module configured transition |

### 10.3 Module State

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-14 | Activate from configured | State = active, activated_by + activated_at set |
| T-15 | Activate from not_configured | Error: "All required steps must be completed first" |
| T-16 | Deactivate from active | State = configured |
| T-17 | Reset module | All progress cleared, state = not_configured |
| T-18 | List all module states | Returns states for all modules |

### 10.4 Dashboard Widget

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-19 | No modules configured | All show "Not Started" with 0% |
| T-20 | Finance at 75% | Shows progress bar at 75%, "In Progress" |
| T-21 | Performance active | Shows 100% progress bar, "Active" badge |
| T-22 | Non-technical user | Widget shows but cannot click through |

### 10.5 Zone-Scoped Modules

| # | Scenario | Expected Result |
|---|----------|-----------------|
| T-23 | Finances configured for zone A but not zone B | Zone A = active, Zone B = not_configured |
| T-24 | Progress tracked separately per zone | Each zone has independent step completion |
| T-25 | Users module (global) ignores zone_code | Single state for entire system |

---

## 11. Acceptance Criteria Summary

| ID | Criteria |
|----|----------|
| CW-01 | Technical admins can view, create, edit, delete, and reorder configuration steps per module from `/settings/configuration-workflow`. |
| CW-02 | Default step templates are seedable for all 8 configurable modules via one-click `Seed Defaults` button. |
| CW-03 | Each step supports manual verification (admin clicks "Mark Complete") and automatic verification (`count_check`, `sql_check`, `api_check`). |
| CW-04 | Module state automatically transitions: `not_configured` → `in_progress` → `configured` as steps are completed. |
| CW-05 | Admin must explicitly activate a module from `configured` → `active`. |
| CW-06 | Progress is tracked per zone for zone-scoped modules (`finances`, `performance`, `reports`, `members`, `voters`, `files`, `records`); globally for system modules (`users`). |
| CW-07 | A "Module Readiness" widget on the dashboard shows progress bars and states for all modules. |
| CW-08 | Step action buttons link directly to the relevant settings page (e.g., "បើកទំព័រ CoA" → `/finances/coa`). |
| CW-09 | All API endpoints are protected by `technical` feature (except module state listing which requires `dashboard`). |
| CW-10 | Module reset clears all progress and returns state to `not_configured`. |

---

## 12. Out of Scope (Future Phases)

| Item | Reason |
|------|--------|
| Module activation guard (blocking access to non-active modules) | Would disrupt existing workflows; needs phased rollout |
| Email/push notifications on step completion | Requires notification infrastructure not yet built |
| Multi-language step templates (beyond KH/EN) | Only Khmer and English are required |
| Dependency chains between modules (e.g., "finances requires users to be configured first") | Adds complexity; can be handled manually |
| Automatic module activation after configured | Keeps explicit admin control |

---

## 13. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2026 | Initial requirements document |
