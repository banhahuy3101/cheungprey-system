# Module Configuration & Approval Workflow — Requirements Document

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)
**Version:** 2.0
**Last updated:** August 2026
**Audience:** Developers, QA
**Feature:** `configuration_workflow` + `module_management`

---

## 1. Overview

### 1.1 Two Systems, One Page

This document covers two integrated systems controlled from a single admin page at `/settings/modules`:

| System | Purpose | Key Concepts |
|--------|---------|-------------|
| **Module Management** | Enable/disable + configure modules | Toggle, approval on/off, step chain |
| **Approval Workflow** | Multi-step review before items go live | Steps → Approvers → Accept/Reject |

### 1.2 Problem

Currently, the system has 12 modules but no centralized place to:
- Turn modules on/off
- Configure whether items need approval
- Define WHO approves and HOW MANY steps

Admins hardcode flows. Non-admin users have no visibility into approval status. Finance module had to be manually ripped out of frontend because there's no toggle.

### 1.3 Solution

A **Module Settings** page (`/settings/modules`) where super_admin/admin can:

| Action | Example |
|--------|---------|
| Enable/disable modules | Turn off Finance → hidden from sidebar, routes return 404 |
| Set approval requirement | Membership → approval ON, Reports → approval OFF |
| Define approval chain | Membership: Step 1=commune_chief → Step 2=district_chief |
| View pending queue per step | 5 items waiting at Step 1, 3 at Step 2 |

---

## 2. Data Model

### 2.1 Module Configuration

```sql
CREATE TABLE module_configs (
    module_key    TEXT PRIMARY KEY,              -- 'membership', 'finance', 'reports', etc.
    enabled       BOOLEAN NOT NULL DEFAULT true,
    need_approval BOOLEAN NOT NULL DEFAULT false,
    settings      JSONB DEFAULT '{}',            -- module-specific settings
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Approval Workflow Steps

```sql
CREATE TABLE workflow_steps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL,                 -- FK → module_configs
    step_order    INT NOT NULL,                  -- 1, 2, 3...
    approver_role TEXT NOT NULL,                 -- 'commune_chief', 'district_chief', 'admin'
    can_reject    BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, step_order)
);
```

### 2.3 Approval Records (per item)

```sql
CREATE TABLE workflow_approvals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL,                 -- 'membership', 'reports'
    item_id       UUID NOT NULL,                 -- the member.id, report.id etc.
    step_order    INT NOT NULL DEFAULT 1,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by   UUID REFERENCES profiles(id),
    approved_at   TIMESTAMPTZ,
    notes         TEXT,                          -- reason for approval/rejection
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, item_id, step_order)
);

CREATE INDEX idx_wf_approvals_pending ON workflow_approvals(module_key, step_order, status);
CREATE INDEX idx_wf_approvals_item ON workflow_approvals(module_key, item_id);
```

### 2.4 Module Lifecycle State

```sql
-- Tracks overall module readiness (unchanged from v1)
CREATE TABLE config_workflow_module_state (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL,
    zone_code     VARCHAR(8),                    -- NULL = global
    state         TEXT NOT NULL DEFAULT 'not_configured'
                  CHECK (state IN ('not_configured', 'in_progress', 'configured', 'active')),
    activated_by  UUID REFERENCES profiles(id),
    activated_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, zone_code)
);
```

---

## 3. Module State Machine (Combined)

A module can be in one of two independent dimensions:

### 3.1 Operational State (Module Management)

```
         ┌──────────┐
    ┌───→│ enabled  │────┐
    │    └──────────┘    │  (admin toggles)
    │                    │
    │    ┌──────────┐    │
    └────│ disabled │←───┘
         └──────────┘
```

**Rules:**
- `disabled`: Module hidden from sidebar. API routes return 503 (Service Unavailable).
- `enabled`: Module visible. API routes work normally.

### 3.2 Setup State (Configuration Workflow)

```
┌─────────────────┐
│  not_configured  │  ← 0% steps done
└────────┬────────┘
         │ (first step completed)
         ▼
┌─────────────────┐
│   in_progress    │  ← 1-99% steps done
└────────┬────────┘
         │ (100% required steps completed)
         ▼
┌─────────────────┐
│   configured     │  ← All steps done, awaiting admin activation
└────────┬────────┘
         │ (admin clicks "Activate")
         ▼
┌─────────────────┐
│     active       │  ← Live + operational
└─────────────────┘
```

### 3.3 Approval State (per item)

When `module_configs.need_approval = true`:

```
Item created → status = "Pending"
  │
  ├─ Step 1 (pending) → approver reviews
  │     ├─ approve → Step 2 (pending)
  │     └─ reject  → status = "Suspended" / "Rejected"  [workflow ends]
  │
  ├─ Step 2 (pending) → approver reviews
  │     ├─ approve → ...continue...
  │     └─ reject  → status = "Suspended" [workflow ends]
  │
  └─ Step N (last step) → approver reviews
        ├─ approve → status = "Active" [workflow complete, item is live]
        └─ reject  → status = "Suspended" [workflow ends]
```

### 3.4 State Interaction Matrix

| Module Enabled | Setup State | need_approval | What happens on create |
|:---:|:---:|:---:|---|
| ✅ | active | ❌ | Item created with status="Active" |
| ✅ | active | ✅ | Item created with status="Pending", flows through steps |
| ✅ | configured | ❌ | Warning banner: "Module not activated yet" |
| ❌ | any | any | Module hidden, routes return 503 |

---

## 4. Business Requirements

### 4.1 Module Management

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-MOD-01** | Admin shall view all modules on one page with enable/disable toggle, approval toggle, and step configuration. | P0 |
| **BR-MOD-02** | Disabling a module shall hide it from sidebar navigation for all users. | P0 |
| **BR-MOD-03** | Disabling a module shall make its API routes return 503 for non-super_admin users. | P0 |
| **BR-MOD-04** | Enabling a module after being disabled shall restore all functionality. | P0 |
| **BR-MOD-05** | Modules: `dashboard` and `settings` are always enabled (cannot be toggled). | P0 |

### 4.2 Approval Workflow Configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-APR-01** | Admin shall define 1..N approval steps per module with role per step. | P0 |
| **BR-APR-02** | Each step shall have a `can_reject` flag (default: true). When false, approver can only approve or return for revision. | P1 |
| **BR-APR-03** | Steps are executed in order. Step N+1 is not accessible until Step N is approved. | P0 |
| **BR-APR-04** | Rejection at any step ends the workflow. Item status becomes "Suspended" with rejection notes. | P0 |
| **BR-APR-05** | Admin can reorder, add, or remove steps. Existing in-flight items keep their current step. | P1 |
| **BR-APR-06** | If `need_approval` is toggled OFF, all pending items are auto-approved (status → Active). | P1 |

### 4.3 Approval Actions

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-ACT-01** | Approver sees pending items filtered to their role and zone scope. | P0 |
| **BR-ACT-02** | Approve: advances item to next step (or to Active if last step). Records who, when, notes. | P0 |
| **BR-ACT-03** | Reject: ends workflow with reason. Item status → Suspended. Records who, when, reason. | P0 |
| **BR-ACT-04** | User who submitted the item sees its approval progress (current step, history). | P1 |
| **BR-ACT-05** | Self-approval is blocked: approver cannot approve an item they created. | P1 |
| **BR-ACT-06** | A super_admin or admin can override any step (skip, force approve/reject). | P1 |

### 4.4 Approval Queue

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-QUE-01** | Approver sees a queue of items waiting at THEIR step, scoped to THEIR zone. | P0 |
| **BR-QUE-02** | Queue shows: item type, name, created date, current step, creator. | P0 |
| **BR-QUE-03** | Badge count on sidebar icon showing pending items for the current user. | P1 |

---

## 5. Approval Workflow — User Stories

### 5.1 Membership (3 steps)

| Step | Approver | Can Reject? | Action |
|------|----------|:----------:|--------|
| 1 | `commune_chief` | ✅ | Reviews member in their commune |
| 2 | `district_chief` | ✅ | Reviews member in their district |
| 3 | `admin` / `super_admin` | ✅ | Final approval → Member goes Active |

**Story:** Commune clerk creates member → Member = Pending → Commune chief reviews, approves → District chief reviews, approves → Admin final approves → Member = Active.

### 5.2 Reports (1 step)

| Step | Approver | Can Reject? | Action |
|------|----------|:----------:|--------|
| 1 | `district_chief` | ✅ | Reviews and approves monthly report |

**Story:** Commune clerk submits monthly report → Report = Pending → District chief reviews → Approve → Report published.

### 5.3 No Approval (Direct)

If `need_approval = false`, items are created directly as Active. No workflow steps run.

---

## 6. API Endpoints

### 6.1 Module Management

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/modules` | List all modules with config | `technical` |
| `PUT` | `/api/modules/:key` | Update module config (enable, need_approval, settings) | `technical` |

### 6.2 Workflow Steps CRUD

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/modules/:key/steps` | List steps for a module | `technical` |
| `POST` | `/api/modules/:key/steps` | Add a step | `technical` |
| `PUT` | `/api/modules/:key/steps/:id` | Update a step (role, can_reject) | `technical` |
| `DELETE` | `/api/modules/:key/steps/:id` | Remove a step | `technical` |
| `PUT` | `/api/modules/:key/steps/reorder` | Batch reorder steps | `technical` |

### 6.3 Approval Actions

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/approvals/queue` | Items pending at user's step | `members` / `reports` etc. |
| `POST` | `/api/approvals/:id/approve` | Approve current step | Role-based |
| `POST` | `/api/approvals/:id/reject` | Reject with reason | Role-based |
| `GET` | `/api/approvals/:module/:itemId` | Get approval history for an item | Module feature |
| `POST` | `/api/approvals/:id/override` | Admin override (force approve/reject) | `membership_admin` |

### 6.4 Module State (unchanged from v1)

| Method | Path | Description | Feature |
|--------|------|-------------|---------|
| `GET` | `/api/config-workflow/steps?module=X` | Config steps for module | `technical` |
| `POST` | `/api/config-workflow/seed-defaults` | Seed default config steps | `technical` |

---

## 7. Frontend — Module Settings Page

**Route:** `/settings/modules`
**Feature:** `technical`

### 7.1 Layout

```
┌─ Module Settings ────────────────────────────────────────────┐
│                                                               │
│  ┌─ សមាជិក (Membership) ────────────────────────────────────┐ │
│  │  Operational: [Enabled ☑]                                 │ │
│  │  Setup State:  ● Active  (3 of 3 steps done)              │ │
│  │                                                           │ │
│  │  Approval Workflow: [☑ Required]                          │ │
│  │                                                           │ │
│  │  Steps:                                                   │ │
│  │    Step 1: [commune_chief  ▼]  Can Reject: [☑]  [✕]     │ │
│  │    Step 2: [district_chief ▼]  Can Reject: [☑]  [✕]     │ │
│  │    Step 3: [admin          ▼]  Can Reject: [☑]  [✕]     │ │
│  │    [+ Add Step]                                           │ │
│  │                                     [Save] [Reset to Default] │
│  └───────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ របាយការណ៍ (Reports) ──────────────────────────────────┐ │
│  │  Operational: [Enabled ☑]                                 │ │
│  │  Setup State:  ○ Configured  (4 of 4 steps done)          │ │
│  │  Approval: [☐ Not Required]  (items created directly)     │ │
│  │                                     [Activate] [Save]     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ ហិរញ្ញវត្ថុ (Finance) ─────────────────────────────────┐ │
│  │  Operational: [Disabled ☐]                                │ │
│  │  Module hidden from all users. Routes return 503.         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ តារាងគ្រប់គ្រង (Dashboard) ───────────────────────────┐ │
│  │  Operational: [Enabled]  (cannot disable)                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 Approval Queue Widget (Sidebar)

```
┌─ Sidebar ──────────────────────────┐
│                                     │
│  សមាជិក                      [3]   │  ← badge: 3 pending at my step
│  របាយការណ៍                  [1]   │  ← badge: 1 pending at my step
│  ...                                │
└─────────────────────────────────────┘
```

---

## 8. Frontend — File Inventory

| File | Purpose |
|------|---------|
| `src/pages/settings/ModuleSettings.jsx` | Main module management page |
| `src/components/modules/ModuleCard.jsx` | Per-module card with toggles + step editor |
| `src/components/modules/StepEditor.jsx` | Step list with drag-reorder |
| `src/components/modules/ApprovalQueue.jsx` | Pending items queue for approver |
| `src/api/modules.js` | API client for module management |
| `src/api/approvals.js` | API client for approval actions |

---

## 9. Backend — File Inventory

| Layer | File | Purpose |
|-------|------|---------|
| Models | `internal/models/module_config.go` | ModuleConfig, WorkflowStep, WorkflowApproval structs |
| Repository | `internal/repository/module_config_repo.go` | CRUD for module configs, steps, approvals |
| Handler | `internal/handlers/module_config.go` | HTTP handlers |
| Middleware | `pkg/middleware/module_enabled.go` | Check module enabled before routes |
| Migration | `supabase/migrations/XXX_module_config.sql` | DDL |
| Seed | `internal/handlers/module_config.go` → SeedDefaults | Default config for all modules |

---

## 10. Module Enabled Middleware

```go
func RequireModuleEnabled(moduleKey string) gin.HandlerFunc {
    return func(c *gin.Context) {
        cfg, err := repo.GetModuleConfig(moduleKey)
        if err != nil || !cfg.Enabled {
            utils.JSON(c, 503, gin.H{"error": "Module disabled"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

Route wiring example:
```go
membership := protected.Group("/membership")
membership.Use(middleware.RequireModuleEnabled("membership"))
membership.Use(auth.RequireFeature(models.FeatureMembers))
// ... routes
```

---

## 11. Default Module Configuration

| Module | Enabled | need_approval | Steps |
|--------|:------:|:------------:|-------|
| `dashboard` | ✅ | ❌ | — (always-on) |
| `settings` | ✅ | ❌ | — (always-on) |
| `membership` | ✅ | ✅ | 1=commune_chief, 2=district_chief |
| `voters` | ✅ | ❌ | — |
| `finances` | ❌ | ✅ | 1=district_chief |
| `files` | ✅ | ❌ | — |
| `records` | ✅ | ❌ | — |
| `reports` | ✅ | ✅ | 1=district_chief |
| `performance` | ✅ | ❌ | — |

---

## 12. Migration

```sql
BEGIN;

CREATE TABLE module_configs (
    module_key    TEXT PRIMARY KEY,
    enabled       BOOLEAN NOT NULL DEFAULT true,
    need_approval BOOLEAN NOT NULL DEFAULT false,
    settings      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_steps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL REFERENCES module_configs(module_key) ON DELETE CASCADE,
    step_order    INT NOT NULL,
    approver_role TEXT NOT NULL,
    can_reject    BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, step_order)
);

CREATE TABLE workflow_approvals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key    TEXT NOT NULL,
    item_id       UUID NOT NULL,
    step_order    INT NOT NULL DEFAULT 1,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by   UUID REFERENCES profiles(id),
    approved_at   TIMESTAMPTZ,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_key, item_id, step_order)
);

CREATE INDEX idx_wf_approvals_pending ON workflow_approvals(module_key, step_order, status);
CREATE INDEX idx_wf_approvals_item ON workflow_approvals(module_key, item_id);

-- Seed default module configs
INSERT INTO module_configs (module_key, enabled, need_approval) VALUES
    ('dashboard', true, false),
    ('settings', true, false),
    ('membership', true, true),
    ('voters', true, false),
    ('finances', false, true),
    ('files', true, false),
    ('records', true, false),
    ('reports', true, true),
    ('performance', true, false)
ON CONFLICT (module_key) DO NOTHING;

-- Seed default workflow steps (membership)
INSERT INTO workflow_steps (module_key, step_order, approver_role, can_reject) VALUES
    ('membership', 1, 'commune_chief', true),
    ('membership', 2, 'district_chief', true)
ON CONFLICT (module_key, step_order) DO NOTHING;

-- Seed default workflow steps (reports)
INSERT INTO workflow_steps (module_key, step_order, approver_role, can_reject) VALUES
    ('reports', 1, 'district_chief', true)
ON CONFLICT (module_key, step_order) DO NOTHING;

COMMIT;
```

---

## 13. Acceptance Criteria

| ID | Criteria |
|----|----------|
| **AC-01** | Admin can enable/disable any module from `/settings/modules`. Dashboard + Settings cannot be disabled. |
| **AC-02** | Disabled modules are hidden from sidebar. API routes return 503. |
| **AC-03** | Admin can set `need_approval` per module. |
| **AC-04** | Admin can define 1..N approval steps per module with approver role per step. |
| **AC-05** | When approval is ON, created items go to status="Pending" and enter workflow. |
| **AC-06** | When approval is OFF, created items go directly to status="Active". |
| **AC-07** | Approver sees pending items filtered to their role and zone. |
| **AC-08** | Approve advances to next step or sets Active if last step. |
| **AC-09** | Reject ends workflow with reason in approval history. |
| **AC-10** | Approval history is viewable per item showing all steps + outcomes. |
| **AC-11** | Sidebar shows badge count of pending items for the current user's role. |

---

## 14. Out of Scope (Future)

| Item | Reason |
|------|--------|
| Item revision (reject → resubmit by creator) | Adds complexity; Phase 2 |
| Email/push notifications on approval | No notification infra yet |
| Timeout/auto-approve after N days | Phase 2 |
| Conditional steps (if amount > $1000, add extra step) | Phase 3 |
| Delegation (temporarily assign approval to someone else) | Phase 2 |

---

## 15. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2026 | Initial: configuration workflow steps, module setup wizard |
| 2.0 | Aug 2026 | Merged: module management (enable/disable) + multi-step approval workflow |
