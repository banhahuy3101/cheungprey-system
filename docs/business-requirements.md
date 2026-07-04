# Business Requirements Document — Finance Management System (FMS)

**Project:** Cheung Prey System — FMS  
**Version:** 2.0  
**Last updated:** July 2026  
**Audience:** Ministry of Economy, district/commune administrators, developers, QA

---

## 1. System Architecture

The platform serves a single district (Cheung Prey) with data scoped by commune/village zone using strict row-level security (RLS).

### 1.1 User Roles & Hierarchical Permissions (RBAC)

The system mirrors the administrative hierarchy of local government:

| Role | Description |
|------|-------------|
| **Super Admin** (Ministry of Economy / National Treasury) | Full read access to nationwide financial data; manages annual national budget ceilings allocated to each district and commune |
| **District Admin / Auditor** (District Administration) | Monitors financial allocations and reports for the district; read/verify rights over communes in their district boundaries |
| **Commune Clerk** (Data Entry) | Drafts budgets, inputs daily administrative revenues, initiates expense requests |
| **Commune Chief** (Approver) | Digitally signs and approves budget drafts and financial disbursement requests |

---

## 2. Core Functional Modules & Workflows

### 2.1 Budget Formulation Module (Annual Planning)

Local authorities define fiscal boundaries based on the **National Budget Ceiling**.

```
[Clerk Drafts Budget] ➔ [Commune Council Approves] ➔ [District/Province Verifies] ➔ [Status: Active Budget]
```

| ID | Requirement |
|----|-------------|
| BR-BUD-01 | System shall automatically reflect the official annual fund allocation (Commune Fund / មូលនិធិឃុំ-សង្កាត់) assigned to each commune |
| BR-BUD-02 | Clerk maps projected expenses into specific economic classifications (e.g., Chapter 60: Administrative Goods, Chapter 61: Capital Investments/Infrastructure) |
| BR-BUD-03 | Budget status workflow: `Draft` → `Pending Review` → `Approved/Active` |
| BR-BUD-04 | Approved amounts set the hard spending limit for the fiscal year |

### 2.2 Income & Revenue Management Module

Revenue is split between direct national transfers and locally collected administrative fees.

| ID | Requirement |
|----|-------------|
| BR-INC-01 | Automated Treasury Transfers: central government tranches logged as automated `Income Transaction` linked to the Central Treasury sub-account |
| BR-INC-02 | Own-Source Revenue Billing: clerk inputs service type (birth certificates, land title validations, marriage certificates) |
| BR-INC-03 | System generates a **Digital Receipt** with a unique Transaction ID for each revenue collection |
| BR-INC-04 | Localized cash-on-hand ledger updates in real-time |
| BR-INC-05 | Optional integration with local banking APIs (Bakong, commercial bank QR codes) for digital citizen payments |

### 2.3 Expense & Disbursement Module (Core Control Loop)

Primary gatekeeper to prevent overspending and unauthorized fund diversion.

| ID | Requirement |
|----|-------------|
| BR-EXP-01 | Clerk creates expense ticket (office supplies, community police, infrastructure contracts) |
| BR-EXP-02 | System **forces** upload of supporting documentation (invoices, receipts, bidding papers) |
| BR-EXP-03 | **Automated Ceiling Validation**: system blocks request if `Requested Amount > Allocated Budget Line Item − Total Spent To Date` |
| BR-EXP-04 | Insufficient budget returns an immediate alert to the user |
| BR-EXP-05 | Commune Chief reviews digital attachments and digitally signs off on the expense |
| BR-EXP-06 | Approved request generates a payment order sent electronically to the **Provincial/District Treasury Account** for cash release or direct bank transfer |

---

## 3. Database Schema Design Strategy

### 3.1 Essential Entities

| Entity | Description |
|--------|-------------|
| **`Chart_of_Accounts`** (CoA) | Standardizes economic codes: `account_code` (PK) (e.g., `6001` Office Stationery, `6102` Road Construction), `account_name`, `type` (Asset, Liability, Revenue, Expense) |
| **`Budgets`** | Stores approved annual financial limits: `budget_id` (PK), `zone_code` (FK), `fiscal_year`, `account_code` (FK), `allocated_amount`, `spent_amount`, `reserved_amount` |
| **`Transactions`** | Absolute ledger of all financial activity: `transaction_id` (PK), `zone_code` (FK), `account_code` (FK), `type` (Income/Expense), `amount`, `status` (Draft/Pending_Approval/Executed/Rejected), `created_by` (FK), `approved_by` (FK), `timestamp` |

### 3.2 Double-Entry Bookkeeping

Every transaction follows double-entry principles with debits and credits recorded against the Chart of Accounts, ensuring ledger integrity.

---

## 4. Mission-Critical System Requirements

### 4.1 Immutability & Audit Trail

| ID | Requirement |
|----|-------------|
| BR-SEC-01 | **No Hard Deletes**: `DELETE` operations disabled on `Transactions` table; mistakes corrected via offsetting/reversal entries only |
| BR-SEC-02 | Every state-altering action logged to a separate read-only audit table: `{Timestamp, User ID, Action, IP Address, Old Value, New Value}` |
| BR-SEC-03 | All business APIs require valid JWT except login, register, refresh, health |
| BR-SEC-04 | Row Level Security (RLS) enforces data isolation at database layer per zone |
| BR-SEC-05 | API layer enforces feature permissions on every protected route |
| BR-SEC-06 | CORS shall allow configured frontend origins |
| BR-SEC-07 | Secrets (Supabase service key) shall not be exposed to the browser |

### 4.2 Budget-vs-Actual Dashboards

| ID | Requirement |
|----|-------------|
| BR-DSH-01 | Landing page features real-time budget vs actual comparison engine |
| BR-DSH-02 | Tracks consumed vs remaining annual budget to prevent end-of-year deficits |

### 4.3 FMIS Readiness

| ID | Requirement |
|----|-------------|
| BR-FMIS-01 | Modular API layer enables direct connectivity to national **FMIS** infrastructure |
| BR-FMIS-02 | Secure REST web services or webhooks for data sync without complete system rewrite |

---

## 5. Cross-Cutting Requirements

### 5.1 Authentication & Session

| ID | Requirement |
|----|-------------|
| BR-AUTH-01 | Users log in with email and password |
| BR-AUTH-02 | System issues JWT access and refresh tokens (Supabase Auth) |
| BR-AUTH-03 | Expired access tokens refreshed automatically with valid refresh token |
| BR-AUTH-04 | Unauthenticated API requests receive HTTP 401 |
| BR-AUTH-05 | Unauthorized feature access receives HTTP 403 |

### 5.2 Geographic Hierarchy

| ID | Requirement |
|----|-------------|
| BR-GEO-01 | Administrative zones: province → district → commune → village |
| BR-GEO-02 | Users assigned to a commune and/or village (zone code) |
| BR-GEO-03 | Data entry scoped by zone where applicable |

---

## 6. Traceability

| Module | Backend Route Group |
|--------|---------------------|
| Budget Formulation | `/api/fms/budgets` |
| Income & Revenue | `/api/fms/revenues` |
| Expense & Disbursement | `/api/fms/expenses` |
| Chart of Accounts | `/api/fms/coa` |
| Dashboard | `/api/fms/dashboard` |
| Audit Log | `/api/fms/audit` |
| FMIS Sync | `/api/fms/fmis` |

---

## 7. Glossary

| Term | Definition |
|------|------------|
| **Chart of Accounts (CoA)** | Standardized economic classification codes for all financial transactions |
| **FMIS** | Financial Management Information System — national government financial infrastructure |
| **Budget Ceiling** | Maximum allocation per budget line item; hard limit enforced by the system |
| **Reversal Entry** | Offsetting transaction used to correct errors (no hard deletes) |
| **Commune Fund / មូលនិធិឃុំ-សង្កាត់** | Annual national fund allocation to each commune |

---

## 8. Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jul 2026 | Full rewrite: migrated from party administration system to regulated FMS |
