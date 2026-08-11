# Business Requirements Document — Cheung Prey District Management System

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)
**Version:** 3.0
**Last updated:** August 2026
**Audience:** Ministry of Economy, district/commune administrators, developers, QA

---

## 1. System Overview & Architecture

The platform serves Cheung Prey District with data scoped by commune/village zone using strict row-level security (RLS). It is a single-tenant, zone-scoped system built with a React (Vite) frontend, Go REST API backend, and Supabase (PostgreSQL + Auth).

### 1.1 Roles & Hierarchical Permissions (RBAC)

The system mirrors the administrative hierarchy of local government with 8 roles:

| Role | Level | Description |
|------|-------|-------------|
| **Super Admin** | 7 | Ministry of Economy / National Treasury. Full access to all features and data. |
| **Admin** | 6 | District-level administrator. Full access to all features. |
| **District Chief** | 5 | Monitors and approves within their district boundary. |
| **Commune Chief** | 4 | Approver: digitally signs budgets, expense requests, and reports within their commune. |
| **Commune Clerk** | 3 | Data entry: drafts budgets, inputs revenues, initiates expense requests, creates records. |
| **Village Chief** | 2 | Village-scoped data entry and viewing. |
| **Recorder** | 1 | Creates and manages own records only. |
| **Regular User** | 0 | Dashboard and personal settings access only. |

Users may be assigned **multiple roles**; permissions are merged (union), and the primary role is the highest-level role.

### 1.2 Feature Permissions

Access to each module is gated by a feature flag assigned per role:

| Feature Key | Module | Khmer Label |
|-------------|--------|-------------|
| `dashboard` | Dashboard / Home | ទំព័រដើម |
| `members` | Party Member Management | សមាជិក |
| `voters` | Voter Insights | អ្នកបោះឆ្នោត |
| `files` | File Management | ឯកសារ |
| `records` | Records Management | កំណត់ត្រា |
| `reports` | Report Documents & Templates | របាយការណ៍ |
| `performance` | Performance Indicator Data Entry | លទ្ធផលការងារ |
| `performance_admin` | Performance Configuration (CRUD) | គ្រប់គ្រង Performance |
| `settings` | Personal Settings | ការកំណត់ |
| `users` | User & Role Administration | គ្រប់គ្រងអ្នកប្រើ |
| `technical` | System / Technical Settings | Technical |
| `finances` | Financial Management System (FMS) | ហិរញ្ញវត្ថុ |
| `membership_write` | Membership Create/Edit | សរសេរសមាជិក |
| `membership_dues` | Membership Dues | តារាងសមាជិក |
| `membership_admin` | Membership Administration | គ្រប់គ្រងសមាជិក |
| `membership_cards` | Membership Cards | កាតសមាជិក |

---

## 2. Authentication & Authorization

| ID | Requirement |
|----|-------------|
| BR-AUTH-01 | Users shall authenticate with email and password (Supabase Auth / GoTrue). |
| BR-AUTH-02 | System shall issue JWT access tokens and refresh tokens. |
| BR-AUTH-03 | Expired access tokens shall be refreshed automatically when a valid refresh token exists. |
| BR-AUTH-04 | All business API endpoints shall require a valid JWT; unauthenticated requests shall receive HTTP 401. |
| BR-AUTH-05 | Requests to features the user lacks permission for shall receive HTTP 403. |
| BR-AUTH-06 | JWT shall be verified against Supabase JWKS endpoint, cached for 15 minutes. |
| BR-AUTH-07 | Users may not assign roles equal to or higher than their own role level. |
| BR-AUTH-08 | The system shall support new user self-registration (default role: regular_user). |

---

## 3. Geographic Hierarchy (Zone Management)

| ID | Requirement |
|----|-------------|
| BR-GEO-01 | The system shall maintain a 4-level administrative hierarchy: Province → District → Commune → Village. |
| BR-GEO-02 | Each zone shall have a unique zone code, Khmer name, and English name. |
| BR-GEO-03 | Users shall be assigned to a commune and/or village zone code. |
| BR-GEO-04 | Data access and entry shall be scoped by zone based on the user's assigned administrative unit. |
| BR-GEO-05 | The system shall expose a full zone tree for cascading dropdown selectors in the UI. |
| BR-GEO-06 | Zones shall be filterable by type (Province/District/Commune/Village) and parent code. |
| BR-GEO-07 | For financial operations, village-level zone codes (8 chars) shall be rolled up to commune-level codes (6 chars). |

---

## 4. Party Member & Membership Management

### 4.1 Core Member CRUD

| ID | Requirement |
|----|-------------|
| BR-MEM-01 | System shall support CRUD operations for party members. |
| BR-MEM-02 | Each member shall have: membership card number (unique), national ID (unique), Khmer and English names (last/first), gender, date of birth, phone number, email, Telegram username, registered village, address, party structure, party role, join date, membership type, membership tier, and status. |
| BR-MEM-03 | Member status shall be one of: Pending, Active, Suspended, Resigned, Expelled, Deceased. |
| BR-MEM-04 | Members shall be filterable by status. |
| BR-MEM-05 | The system shall provide a list view with search and pagination. |
| BR-MEM-06 | The system shall provide an organizational chart view showing hierarchical party structures. |
| BR-MEM-07 | The system shall export a member list as a PDF report (landscape A4, Khmer font support). |

### 4.2 Membership Management

The Membership module (`/api/membership`) extends core member CRUD with full lifecycle management. Refer to `docs/business-requirements-membership.md` for the complete specification.

| ID | Requirement |
|----|-------------|
| BR-MS-01 | System shall support extended demographics: marital status, occupation, education, ethnicity, religion, emergency contact, blood type. |
| BR-MS-02 | Status changes shall be audited with old/new status, reason, and changed-by tracking in `member_status_history`. |
| BR-MS-03 | Dues payments shall be tracked: amount, payment method, date, status, reference number. |
| BR-MS-04 | Member activities shall be logged: meetings, events, training, volunteer hours, donations, check-ins. |
| BR-MS-05 | Position assignments shall be recorded: party role, title, committee, rank, structure, start/end dates. |
| BR-MS-06 | Membership cards shall be issued and tracked through Pending → Issued → Delivered → Expired/Replaced lifecycle. |
| BR-MS-07 | A full member profile endpoint shall aggregate: core data, demographics, current position, dues summary, cards, and recent activities. |
| BR-MS-08 | The system shall support bulk member import with duplicate detection and batch error reporting. |
| BR-MS-09 | Member search shall support multi-field filtering: status, zone, role, gender, text search, date ranges, with pagination and sorting. |

---

## 5. Voter Insights

| ID | Requirement |
|----|-------------|
| BR-VOT-01 | System shall support CRUD for voter insight records. |
| BR-VOT-02 | Each voter record shall include: Khmer name (last/first), gender, commune code, polling station code, voter sentiment, and last contacted date. |
| BR-VOT-03 | Voter sentiment shall be one of: Strong Support, Leaning Support, Undecided, Opposed. |
| BR-VOT-04 | Voter records shall be filterable by commune code and sentiment. |
| BR-VOT-05 | The system shall provide list view with search and pagination. |

---

## 6. File Management

| ID | Requirement |
|----|-------------|
| BR-FIL-01 | System shall support file upload, download, listing, and deletion. |
| BR-FIL-02 | Files shall be stored as base64-encoded content in the database. |
| BR-FIL-03 | Each file shall have metadata: file name, MIME type, file size, associated member ID (optional), uploaded by, and description. |
| BR-FIL-04 | Files shall be filterable by member ID. |
| BR-FIL-05 | The system shall provide a list view with search and pagination. |

---

## 7. Records Management

| ID | Requirement |
|----|-------------|
| BR-REC-01 | System shall support CRUD operations for records. |
| BR-REC-02 | Each record shall include: title, description, JSON data payload, associated commune and village, status, and timestamps. |
| BR-REC-03 | Records shall be automatically associated with the creating user's commune/village. |
| BR-REC-04 | Record access shall be role-scoped: Super Admin and Admin see all records; District Chief sees district-scoped; Commune Chief/Clerk sees commune-scoped; Village Chief sees village-scoped (fallback to commune); Recorder and Regular User see only own records. |
| BR-REC-05 | The system shall provide a list view with search and pagination. |

---

## 8. Report Documents & Templates

### 8.1 Report Documents

| ID | Requirement |
|----|-------------|
| BR-RPT-01 | System shall support CRUD for report documents. |
| BR-RPT-02 | Simple reports shall have: title, description, and rich-text content (HTML). |
| BR-RPT-03 | Full (party/political) reports shall additionally include: party name, province/district names, document reference number, generation date (Khmer), report month/year, political situation summary, crime statistics (total, homicide, suicide, misdemeanor, human fatalities), and property damage description. |
| BR-RPT-04 | Report status shall follow the workflow: Draft → Published (confirmed by district chief). |
| BR-RPT-05 | Reports shall be downloadable as PDF with Khmer font rendering (headless Chrome/Chromedp rendering pipeline). |
| BR-RPT-06 | Users shall be able to duplicate an existing report to create a new draft. |
| BR-RPT-07 | The report list view shall display KPI stats (total, published, draft) with view/edit/duplicate/delete/confirm/PDF-download actions. |
| BR-RPT-08 | The system shall provide a Word-like rich text editor (TipTap) with: font family (Khmer and Latin), font size, bold/italic/underline/strikethrough, subscript/superscript, text and highlight colors, alignment, bullet/ordered lists, blockquote, links, image insertion, tables (with row/column add/delete, merge/split cells, border styling), indent/outdent, line height, clear formatting, and Khmer-text toolbar labels. |

### 8.2 Report Templates

| ID | Requirement |
|----|-------------|
| BR-TPL-01 | System shall support upload of DOCX and HTML report templates. |
| BR-TPL-02 | Templates shall be stored in Supabase Storage (`report-templates` bucket). |
| BR-TPL-03 | The system shall automatically extract `{{placeholder}}` keys from uploaded DOCX (by parsing `word/document.xml`) and HTML templates. |
| BR-TPL-04 | Users shall be able to manually add placeholder keys to a template. |
| BR-TPL-05 | The system shall support template filling: simple string substitution, `{{#each}}...{{/each}}` loop blocks, and `{{index}}` auto-increment within loops. |
| BR-TPL-06 | Filled DOCX templates shall preserve WordprocessingML formatting and embedded images. |
| BR-TPL-07 | Users shall be able to download both the original template file and the filled document. |

---

## 9. Performance Management

### 9.1 Performance Data Entry

| ID | Requirement |
|----|-------------|
| BR-PRF-01 | The system shall maintain a 3-level performance hierarchy: Domain → Sub-Domain → Indicator. |
| BR-PRF-02 | Domains shall have: code, Khmer/English names, and sort order. |
| BR-PRF-03 | Sub-domains shall belong to a domain with: code (unique per domain), Khmer/English names, and sort order. |
| BR-PRF-04 | Indicators shall belong to a sub-domain with: code (unique per sub-domain), Khmer/English names, data type (number / percentage / binary), unit labels, and sort order. |
| BR-PRF-05 | Performance data entry shall be scoped by zone and reporting period. |
| BR-PRF-06 | Indicator values shall be single (create/update) or bulk (upsert) per zone + period. |
| BR-PRF-07 | Binary indicators shall be entered as Yes/No toggles; percentage indicators shall cap at 100. |
| BR-PRF-08 | The system shall provide a list of performance submissions filterable by commune and period. |
| BR-PRF-09 | Performance reports shall be exportable as PDF with landscape A4 layout and Khmer fonts. |

### 9.2 Reporting Periods

| ID | Requirement |
|----|-------------|
| BR-PRD-01 | Reporting periods shall have: Khmer/English labels, start date, end date, and sort order. |
| BR-PRD-02 | Period labels shall render in Khmer format with Khmer digit numerals. |

### 9.3 Performance Admin Configuration

| ID | Requirement |
|----|-------------|
| BR-PAD-01 | Admin users with `performance_admin` feature shall manage domains, sub-domains, indicators, and periods. |
| BR-PAD-02 | CRUD operations shall be available for all four performance entity types. |
| BR-PAD-03 | The full domain tree (domains → sub-domains → indicators) shall be retrievable in a single API call for the data entry form. |

---

## 10. Financial Management System (FMS)

### 10.1 Chart of Accounts (CoA)

| ID | Requirement |
|----|-------------|
| BR-COA-01 | The system shall maintain a hierarchical chart of accounts with: account code (PK), Khmer/English name, account type (asset / liability / revenue / expense), optional parent code (self-referencing), and active status. |
| BR-COA-02 | Standard economic classification codes shall be seeded (e.g., 6001 Office Stationery, 6101 Road Construction, 7001 Commune Fund Transfer). |

### 10.2 Budget Formulation (Annual Planning)

| ID | Requirement |
|----|-------------|
| BR-BUD-01 | The system shall support budget creation per zone code and fiscal year. |
| BR-BUD-02 | Budgets shall be tied to a specific chart-of-accounts line item. |
| BR-BUD-03 | Each budget shall track: allocated amount, spent amount, and reserved amount. |
| BR-BUD-04 | Budget status workflow: Draft → Pending Review → Approved → Active. |
| BR-BUD-05 | Approved budgets shall set the hard spending limit for the fiscal year. |

### 10.3 Income & Expense Transactions

| ID | Requirement |
|----|-------------|
| BR-TXN-01 | The system shall support creation of income and expense transactions. |
| BR-TXN-02 | Transactions shall include: zone code, account code, type (income/expense), amounts in USD and KHR (dual-currency), description, and document references. |
| BR-TXN-03 | Transaction status workflow: Draft → Pending Approval → Executed (or Rejected). |

### 10.4 Approval Workflow

| ID | Requirement |
|----|-------------|
| BR-APR-01 | Transactions shall be submitted for approval before execution. |
| BR-APR-02 | On approval, the system shall check budget ceiling: `requested_amount > allocated_amount - spent_amount - reserved_amount` shall block with "Insufficient Budget Allocation" error. |
| BR-APR-03 | On approval, the budget's spent amount shall be incremented. |
| BR-APR-04 | Rejection shall require a reason. |
| BR-APR-05 | Role-based approvers: Admin, District Chief, and Commune Chief may approve transactions. |

### 10.5 Immutability & Reversal

| ID | Requirement |
|----|-------------|
| BR-IMM-01 | No hard deletes: executed transactions shall only be corrected via reversal entries. |
| BR-IMM-02 | A reversal shall create a counter-entry transaction (opposite type) linked to the original via `reversal_of` reference. |
| BR-IMM-03 | Reversal shall automatically adjust the associated budget spent amount. |

### 10.6 Audit Trail

| ID | Requirement |
|----|-------------|
| BR-AUD-01 | Every state-altering action on FMS tables shall be logged: table name, record ID, action (insert/update/delete), user ID, IP address, old data (JSONB), new data (JSONB), and timestamp. |
| BR-AUD-02 | The audit log shall be queryable with pagination and filters. |

### 10.7 Financial Dashboard

| ID | Requirement |
|----|-------------|
| BR-DSH-01 | The dashboard shall display real-time financial summary: total income, total expenses, and net balance in both USD and KHR. |
| BR-DSH-02 | Budget vs. actual comparison shall be shown per budget line item with spent percentage. |
| BR-DSH-03 | Monthly income/expense breakdown shall be displayed. |
| BR-DSH-04 | By-account summary shall show spending distribution across accounts. |
| BR-DSH-05 | Dashboard shall be filterable by zone and fiscal year. |

### 10.8 FMIS Readiness

| ID | Requirement |
|----|-------------|
| BR-FMIS-01 | The system shall expose a modular API layer enabling future connectivity to the national FMIS infrastructure. |
| BR-FMIS-02 | The FMS data model shall be built with adapter-pattern extensibility for sync contracts with external financial systems. |

---

## 11. User & Role Administration

| ID | Requirement |
|----|-------------|
| BR-USR-01 | Admin users shall be able to list, view, create, update, and delete users. |
| BR-USR-02 | User creation shall auto-generate a profile with default password (configurable in system settings). |
| BR-USR-03 | Admin shall be able to assign multiple roles to a user. |
| BR-USR-04 | Admin shall be able to reset any user's password. |
| BR-USR-05 | Role permissions shall be editable per role: each of the 12 feature flags toggled on/off. |
| BR-USR-06 | Custom roles (non-system) shall be creatable, updatable, and deletable. |
| BR-USR-07 | System roles (Super Admin through Regular User) shall be undeletable. |
| BR-USR-08 | The admin dashboard shall display user statistics: total users and breakdown by role. |

---

## 12. Dashboard (Home)

| ID | Requirement |
|----|-------------|
| BR-HOM-01 | The home dashboard shall display greeting with user's full name. |
| BR-HOM-02 | Stats cards shall show: total members, total voters, total income (if finance feature), total expenses (if finance feature), net balance (if finance feature), and total files. |
| BR-HOM-03 | Admin users shall see a "Users by Role" summary table. |

---

## 13. PDF Report Generation

| ID | Requirement |
|----|-------------|
| BR-PDF-01 | PDF generation shall use headless Chrome/Chromium via Chromedp. |
| BR-PDF-02 | All PDFs shall support Khmer Unicode font rendering (Kantumruy Pro, Battambang). |
| BR-PDF-03 | Supported layouts: portrait A4 (reports, documents) and landscape A4 (member lists, performance tables). |
| BR-PDF-04 | Optional page numbers in Khmer format ("ទំព័រ X") shall be supported. |
| BR-PDF-05 | Fonts shall be embedded via `@font-face` with local TTF files accessible to the Chromium renderer. |

---

## 14. Security & Cross-Cutting Requirements

| ID | Requirement |
|----|-------------|
| BR-SEC-01 | All business APIs shall require valid JWT except: login, register, token refresh, and health check. |
| BR-SEC-02 | Row-Level Security (RLS) shall enforce data isolation at the database layer per zone. |
| BR-SEC-03 | CORS shall allow only configured frontend origins. |
| BR-SEC-04 | Secrets (Supabase service role key) shall never be exposed to the browser. |
| BR-SEC-05 | API layer shall enforce feature permissions on every protected route via middleware. |
| BR-SEC-06 | Startup tasks shall seed default role permissions and create required Supabase Storage buckets if missing. |

---

## 15. Traceability — API Route Mapping

| Module | Backend Route Group | Feature Required |
|--------|---------------------|-----------------|
| Auth | `/api/auth/*` | None |
| Profile | `/api/profile` | None |
| Geographic Hierarchy | `/api/hierarchy/*` | None (public) |
| Party Structures & Zones | `/api/party/structures`, `/api/party/zones*` | None |
| Party Members | `/api/party/members*` | `members` |
| Voter Insights | `/api/party/voters*` | `voters` |
| Files | `/api/party/files*` | `files` |
| Membership | `/api/membership/*` | `members` (read) / `membership_write` / `membership_dues` / `membership_admin` / `membership_cards` |
| Records | `/api/records*` | `records` |
| Report Documents | `/api/report-documents*` | `reports` |
| Report Templates | `/api/report-templates*` | `reports` |
| Member PDF Report | `/api/reports/members` | `reports` |
| Performance PDF Report | `/api/reports/performance/:zone/:period` | `performance` |
| Performance Data Entry | `/api/performance/data*`, `/api/performance/domains/full`, `/api/performance/periods`, `/api/performance/indicators` | `performance` |
| Performance Admin | `/api/performance/domains*`, `/api/performance/sub-domains*`, `/api/performance/indicators*`, `/api/performance/periods*` (POST/PUT/DELETE) | `performance_admin` |
| Finance (FMS) | `/api/fms/*` | `finances` |
| User Management | `/api/admin/users*`, `/api/admin/statistics`, `/api/admin/settings` | `users` |
| Role & Permissions | `/api/admin/roles*`, `/api/admin/role-permissions*` | `users` |
| Feature Flags | `/api/permissions/features` | None |

---

## 16. Frontend Page — Route Mapping

| Page | Route | Feature Required |
|------|-------|-----------------|
| Login | `/login` | None |
| Register | `/register` | None |
| Dashboard | `/` | `dashboard` |
| Profile | `/profile` | None |
| Members List | `/members` | `members` |
| Create Member | `/members/create` | `members` |
| Org Chart | `/members/org` | `members` |
| View/Edit Member | `/members/:id`, `/members/:id/edit` | `members` |
| Membership Search | `/membership` | `members` |
| Membership Profile | `/membership/:id` | `members` |
| Membership Dues | `/membership/:id/dues` | `members` |
| Membership Activity | `/membership/:id/activity` | `members` |
| Membership Positions | `/membership/:id/positions` | `members` |
| Membership Cards | `/membership/:id/cards` | `membership_cards` |
| Membership Import | `/membership/import` | `membership_write` |
| Membership Stats | `/membership/stats` | `members` |
| Voters | `/voters` | `voters` |
| Files | `/files` | `files` |
| Records | `/records` | `records` |
| Reports List | `/reports` | `reports` |
| Create Report | `/reports/create` | `reports` |
| Create from Template | `/reports/create-template` | `reports` |
| View/Edit Report | `/reports/:id`, `/reports/:id/edit` | `reports` |
| Performance List | `/performance` | `performance` |
| Create Performance | `/performance/create` | `performance` |
| Edit Performance | `/performance/edit` | `performance` |
| View Performance | `/performance/:id` | `performance` |
| Finance Dashboard | `/finances/dashboard` | `finances` |
| Income Transactions | `/finances/income` | `finances` |
| Expense Transactions | `/finances/expense` | `finances` |
| Chart of Accounts | `/finances/coa` | `finances` |
| Budgets | `/finances/budgets` | `finances` |
| Settings | `/settings` | `settings` |
| User Management | `/settings/users` | `users` |
| Role Permissions | `/settings/role-permissions` | `users` |
| Report Templates | `/settings/report-templates` | `reports` |
| Performance Periods | `/settings/performance_period*` | `performance_admin` |
| Performance Config | `/settings/performance` | `performance_admin` |
| Technical Settings | `/settings/technical` | `technical` |
| System Settings | `/settings/technical/system` | `technical` |

---

## 17. Glossary

| Term | Definition |
|------|------------|
| **Chart of Accounts (CoA)** | Standardized economic classification codes for all financial transactions |
| **FMIS** | Financial Management Information System — national government financial infrastructure |
| **Budget Ceiling** | Maximum allocation per budget line item; hard limit enforced by the system |
| **Reversal Entry** | Offsetting transaction used to correct errors (no hard deletes) |
| **Commune Fund / មូលនិធិឃុំ-សង្កាត់** | Annual national fund allocation to each commune |
| **RLS** | Row-Level Security — database-level enforcement of data access per user's zone |
| **Zone Code** | Unique identifier for a geographic administrative unit |
| **Performance Indicator** | Measurable metric within a sub-domain for evaluating commune/district performance |
| **RBAC** | Role-Based Access Control — permissions assigned per role, merged for multi-role users |
| **JWT** | JSON Web Token — stateless authentication token verified against Supabase JWKS |
| **Chromedp** | Headless Chrome driver used for server-side HTML-to-PDF rendering |
| **Membership Lifecycle** | Full member journey: Pending → Active → Suspended/Resigned/Expelled/Deceased with audit trail |
| **Membership Card** | Physical or digital card issued to a member, tracked through Issued → Delivered → Expired/Replaced |

---

## 18. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | — | Initial party administration BRD |
| 2.0 | Jul 2026 | Migration to regulated FMS focus |
| 3.0 | Aug 2026 | Comprehensive BRD covering all modules from actual codebase feature audit; added membership module with demographics, dues, status workflow, activity, positions, cards |
