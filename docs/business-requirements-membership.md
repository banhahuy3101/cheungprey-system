# Business Requirements Document — Membership Management

**Project:** ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ (Cheung Prey District Management System)  
**Domain:** Party Member Lifecycle Management  
**Version:** 1.0  
**Last updated:** August 2026  

---

## 1. Overview

The Membership module provides comprehensive party member lifecycle management from registration through resignation/deactivation. It extends the core member CRUD with demographics, dues tracking, status workflows, activity logging, position history, and membership card issuance.

| Layer | Feature Flag | Khmer Label | Purpose |
|-------|-------------|-------------|---------|
| Read | `members` | សមាជិក | View/search members, profiles, history, activity, dues, cards |
| Write | `membership_write` | សរសេរសមាជិក | Create/edit demographics, record activities, assign positions, bulk import |
| Dues | `membership_dues` | តារាងសមាជិក | Record due payments |
| Admin | `membership_admin` | គ្រប់គ្រងសមាជិក | Change member status (lifecycle transitions) |
| Delete | `membership_delete` | លុបសមាជិក | Delete members (gate existing delete endpoint) |

---

## 2. Entity Model

### 2.1 Core Member

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Auto | Primary key |
| `membership_card_no` | Text | Yes | Unique membership card number |
| `national_id` | Text | No | Cambodian national ID (unique) |
| `last_name_kh` | Text | Yes | Surname in Khmer |
| `first_name_kh` | Text | Yes | Given name in Khmer |
| `last_name_en` | Text | Yes | Surname in Latin |
| `first_name_en` | Text | Yes | Given name in Latin |
| `gender` | Enum | Yes | Male / Female / Other |
| `date_of_birth` | Date | Yes | Date of birth |
| `phone_number` | Text | Yes | Phone number |
| `email` | Text | No | Email (unique) |
| `signature` | Text | No | Digital signature data URL |
| `registered_village_code` | FK | Yes | FK → geographic_zones |
| `current_address_details` | Text | No | Street/house address |
| `structure_id` | FK | No | FK → party_structures |
| `party_role` | Text | No | Default: "Member" |
| `join_date` | Date | Yes | Date joined the party |
| `status` | Enum | Yes | Pending → Active → Suspended → Resigned / Expelled / Deceased |
| `membership_type` | Enum | No | Full / Associate / Youth / Honorary / Probationary |
| `membership_tier` | Enum | No | Basic / Silver / Gold / Platinum |
| `exempt_from_dues` | Boolean | No | Exempt from membership dues (default: false) |
| `resignation_date` | Date | No | Auto-set when status = Resigned |
| `expulsion_reason` | Text | No | Required when status = Expelled |

### 2.2 Member Demographics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member_id` | UUID FK | Yes | FK → members(id) UNIQUE |
| `photo_url` | Text | No | Profile photo URL (Supabase Storage) |
| `marital_status` | Enum | No | Single / Married / Divorced / Widowed |
| `occupation` | Text | No | Job/profession |
| `education_level` | Enum | No | None / Primary / Secondary / HighSchool / Bachelor / Master / PhD |
| `ethnicity` | Text | No | Ethnic group |
| `religion` | Enum | No | Buddhist / Muslim / Christian / Other |
| `emergency_contact_name` | Text | No | Next of kin name |
| `emergency_contact_phone` | Text | No | Next of kin phone |
| `blood_type` | Enum | No | A / B / AB / O |

### 2.3 Member Status Lifecycle

```
[Pending] → [Active] → [Suspended] → [Active]  (re-activation)
                               ↓
                         [Resigned] / [Expelled] / [Deceased]
```

| Transition | Allowed? | Behavior |
|------------|----------|----------|
| Pending → Active | Yes | Member activated |
| Active → Suspended | Yes | Temporary deactivation |
| Suspended → Active | Yes | Reactivation |
| Active → Resigned | Yes | Sets resignation_date |
| Active → Expelled | Yes | Requires expulsion_reason |
| Active → Deceased | Yes | Terminal state |
| Resigned → Active | No | Cannot undo resignation* |
| Expelled → Active | No | Cannot undo expulsion* |
| Deceased → any | No | Terminal state |

\* Admin override possible via `membership_admin` feature.

Every status change creates an audit entry in `member_status_history`.

### 2.4 Member Dues

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member_id` | UUID FK | Yes | FK → members(id) |
| `amount` | Decimal | Yes | Payment amount in USD |
| `payment_method` | Enum | Yes | Cash / Bakong/KHQR / BankTransfer / Other |
| `payment_date` | Timestamp | Yes | Date of payment |
| `payment_status` | Enum | No | Paid / Partial / Overdue (default: Paid) |
| `reference_number` | Text | No | Transaction reference |
| `notes` | Text | No | Additional notes |
| `recorded_by` | UUID FK | No | FK → profiles(id) |

### 2.5 Member Activity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member_id` | UUID FK | Yes | FK → members(id) |
| `activity_type` | Enum | Yes | Meeting / Event / Training / Volunteer / Donation / Recruitment / CheckIn / Other |
| `title` | Text | Yes | Activity title |
| `description` | Text | No | Details |
| `activity_date` | Date | Yes | Date of activity |
| `hours` | Numeric | No | Hours contributed (for Volunteer/Training) |

### 2.6 Member Positions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member_id` | UUID FK | Yes | FK → members(id) |
| `party_role` | Text | Yes | Role in party |
| `position_title` | Text | No | Specific position title |
| `committee` | Text | No | Committee assignment (Finance, Youth, Women, Campaign, etc.) |
| `rank` | Integer | No | Numeric hierarchy level |
| `structure_id` | UUID FK | No | FK → party_structures |
| `start_date` | Date | Yes | When position started |
| `end_date` | Date | No | When position ended |
| `is_current` | Boolean | Yes | Currently active position |

### 2.7 Membership Cards

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member_id` | UUID FK | Yes | FK → members(id) |
| `card_no` | Text | Yes | Unique card number |
| `card_status` | Enum | Yes | Pending / Issued / Delivered / Expired / Replaced |
| `issued_at` | Timestamp | Yes | When card was issued |
| `delivered_at` | Timestamp | No | When card was delivered |
| `expired_at` | Timestamp | No | When card expired |
| `replaced_reason` | Text | No | Reason for replacement |

---

## 3. Business Requirements

### 3.1 Core Member CRUD

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-MEM-01** | System shall support CRUD operations for party members. | P0 |
| **BR-MEM-02** | Each member shall have: membership card number (unique), national ID (unique), Khmer and English names (last/first), gender, date of birth, phone number, email, Telegram username, registered village, address, party structure, party role, join date, membership type, membership tier, and status. | P0 |
| **BR-MEM-03** | Member status shall be one of: Pending, Active, Suspended, Resigned, Expelled, Deceased. | P0 |
| **BR-MEM-04** | Members shall be filterable by status, zone, party role, gender, search text, join date range with pagination and sorting. | P0 |
| **BR-MEM-05** | The system shall provide a list view with search and pagination (filter endpoint). | P0 |
| **BR-MEM-06** | Search results shall be auto-scoped to the user's assigned zone for non-admin roles (district chief sees district, commune chief sees commune, etc.). | P0 |
| **BR-MEM-07** | The system shall provide an organizational chart view showing hierarchical party structures. | P1 |
| **BR-MEM-07** | The system shall export a member list for download. | P1 |

### 3.2 Extended Demographics

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-DEM-01** | Members shall have extended demographics: marital status, occupation, education level, ethnicity, religion, emergency contact, blood type. | P1 |
| **BR-DEM-02** | Demographics shall be stored in a separate table linked 1:1 to the member. | P0 |
| **BR-DEM-03** | Demographics shall be created/updated via upsert (create if not exists). | P0 |
| **BR-DEM-04** | Demographics shall be included in the full member profile response. | P0 |

### 3.3 Status Lifecycle Management

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-STA-01** | Status changes shall be logged in an audit trail: old status, new status, reason, changed by, timestamp. | P0 |
| **BR-STA-02** | Valid status transitions: Pending→Active, Active→Suspended, Suspended→Active, Active→Resigned, Active→Expelled, Active→Deceased. | P0 |
| **BR-STA-03** | Resigned members shall have resignation_date auto-set. | P0 |
| **BR-STA-04** | Expelled members shall have expulsion_reason recorded. | P1 |
| **BR-STA-05** | Full status history shall be queryable per member ordered by date descending. | P0 |

### 3.4 Dues / Payment Tracking

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-DUE-01** | Each due payment shall record: amount, payment method, payment date, payment status, reference number, notes, and recording user. | P0 |
| **BR-DUE-02** | Payment methods: Cash, Bakong/KHQR, BankTransfer, Other. | P0 |
| **BR-DUE-03** | Payment status shall be: Paid, Partial, Overdue. | P1 |
| **BR-DUE-04** | Full payment ledger shall be queryable per member ordered by date descending. | P0 |
| **BR-DUE-05** | Dues summary (total paid, count, last payment) shall be computed and included in member profile. | P0 |

### 3.5 Activity Tracking

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-ACT-01** | Activities shall be recorded per member: activity type, title, description, date, hours. | P0 |
| **BR-ACT-02** | Activity types: Meeting, Event, Training, Volunteer, Donation, Recruitment, CheckIn, Other. | P0 |
| **BR-ACT-03** | Activities shall be listable per member ordered by date descending. | P0 |
| **BR-ACT-04** | A "Check-in" activity type enables quick attendance recording at events/meetings. | P1 |
| **BR-ACT-05** | Activity list shall be included in the full member profile response. | P0 |

### 3.6 Position & Role History

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-POS-01** | Position assignments shall be recorded per member: party role, position title, committee, rank, structure, start/end dates. | P0 |
| **BR-POS-02** | Assigning a new position shall deactivate all current positions (set is_current=false and end_date) for that member. | P0 |
| **BR-POS-03** | Complete position history shall be queryable per member ordered by start date descending. | P0 |
| **BR-POS-04** | Positions shall be included in the full member profile response. | P0 |

### 3.7 Membership Cards

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-CRD-01** | System shall support issuing membership cards with unique card numbers. | P1 |
| **BR-CRD-02** | Card status workflow: Pending → Issued → Delivered → Expired / Replaced. | P1 |
| **BR-CRD-03** | Card delivery date shall be auto-set when status changes to Delivered. | P1 |
| **BR-CRD-04** | Card replacement shall require a reason and auto-set expired_at. | P1 |
| **BR-CRD-05** | Multiple cards per member shall be allowed (re-issue lifecycle). | P1 |
| **BR-CRD-06** | Cards shall be listable per member ordered by issue date descending. | P1 |

### 3.8 Bulk Operations

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-BUL-01** | System shall support bulk member import via JSON array. | P1 |
| **BR-BUL-02** | Each imported member shall be assigned a UUID, default role "Member", default status "Active". | P1 |
| **BR-BUL-03** | Import response shall indicate total, created count, duplicate count, error count, list of created members, and duplicate details. | P1 |
| **BR-BUL-04** | Import shall pre-validate duplicates against existing members: card_no, phone, national_id. Duplicates are skipped with detailed error reporting. | P1 |
| **BR-BUL-05** | Member list shall be exportable with optional status and zone filters. | P1 |
| **BR-BUL-06** | Bulk status change shall allow setting status for multiple members in one request, returning per-member success/error status. | P1 |

### 3.9 Dashboard Statistics

| ID | Requirement | Priority |
|----|-------------|----------|
| **BR-STS-01** | Stats endpoint shall return: total members, active count, breakdown by gender, status, zone, membership type, membership tier. | P0 |
| **BR-STS-02** | Stats shall include total dues collected and dues collected this month. | P1 |

---

## 4. API Endpoints

### 4.1 Search & Filter

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership` | `members` | Search/filter members with pagination |

**Query Parameters:** `status`, `zone_code`, `party_role`, `gender`, `search`, `join_from`, `join_to`, `page`, `limit`, `sort_by`, `sort_order`

### 4.2 Profile

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/profile` | `members` | Full member profile (includes demographics, positions, dues summary, cards, activities) |
| `GET` | `/api/membership/stats` | `members` | Dashboard statistics |
| `GET` | `/api/membership/export` | `members` | Export member list |

### 4.3 Demographics

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/demographics` | `members` | Get demographics |
| `PUT` | `/api/membership/:id/demographics` | `members` | Update demographics (upsert) |

### 4.4 Status Management

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/history` | `members` | Status change history |
| `POST` | `/api/membership/:id/status` | `membership_admin` | Change member status |
| `POST` | `/api/membership/status/bulk` | `membership_admin` | Bulk status change |
| `DELETE` | `/api/membership/:id` | `membership_delete` | Delete member |

### 4.5 Dues

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/dues` | `members` | Payment ledger |
| `POST` | `/api/membership/:id/dues` | `membership_dues` | Record due payment |

### 4.6 Activity

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/activity` | `members` | Activity list |
| `POST` | `/api/membership/:id/activity` | `membership_write` | Record activity |
| `POST` | `/api/membership/:id/check-in` | `members` | Quick check-in (records CheckIn activity) |

### 4.7 Positions

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/positions` | `members` | Position history |
| `POST` | `/api/membership/:id/positions` | `membership_write` | Assign new position |

### 4.8 Cards

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/membership/:id/cards` | `members` | Card list |
| `POST` | `/api/membership/:id/cards` | `membership_cards` | Issue new card |
| `PUT` | `/api/membership/cards/:id` | `membership_cards` | Update card status |

### 4.9 Bulk

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `POST` | `/api/membership/import` | `membership_write` | Bulk import members |

---

## 5. Database Tables

### 5.1 Existing (Core)

`members` — Primary member table with lifecycle fields: `membership_type`, `membership_tier`, `resignation_date`, `expulsion_reason`.

### 5.2 New Tables

```sql
-- Demographics
CREATE TABLE member_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    photo_url TEXT,
    marital_status VARCHAR(20),
    occupation VARCHAR(100),
    education_level VARCHAR(30),
    ethnicity VARCHAR(50),
    religion VARCHAR(30),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    blood_type VARCHAR(3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dues
CREATE TABLE member_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_status VARCHAR(20) DEFAULT 'Paid',
    reference_number VARCHAR(100),
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status History
CREATE TABLE member_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity
CREATE TABLE member_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL,
    hours NUMERIC(5, 1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions
CREATE TABLE member_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    party_role VARCHAR(100) NOT NULL,
    position_title VARCHAR(150),
    committee VARCHAR(100),
    rank INTEGER,
    structure_id UUID REFERENCES party_structures(id),
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards
CREATE TABLE member_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    card_no VARCHAR(30) UNIQUE NOT NULL,
    card_status VARCHAR(20) DEFAULT 'Issued',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    replaced_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Feature Permissions

### 6.1 Default Permissions per Role

| Feature | Super Admin | Admin | District Chief | Commune Chief | Commune Clerk | Village Chief | Recorder | Regular User |
|---------|:-----------:|:-----:|:--------------:|:-------------:|:-------------:|:------------:|:--------:|:------------:|
| `members` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_write` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_dues` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_cards` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

### 6.2 Feature Flags

| Key | Khmer Label |
|-----|-------------|
| `members` | សមាជិក |
| `membership_write` | សរសេរសមាជិក |
| `membership_dues` | តារាងសមាជិក |
| `membership_admin` | គ្រប់គ្រងសមាជិក |
| `membership_cards` | កាតសមាជិក |
| `membership_delete` | លុបសមាជិក |

### 6.2 Feature Permissions by Role

| Feature | Super Admin | Admin | District Chief | Commune Chief | Commune Clerk | Village Chief | Recorder | Regular User |
|---------|:-----------:|:-----:|:--------------:|:-------------:|:-------------:|:------------:|:--------:|:------------:|
| `members` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_write` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_dues` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_cards` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `membership_delete` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

---

## 7. Frontend Page Mapping

| Page | Route | Feature |
|------|-------|---------|
| Member List | `/membership` | `members` |
| Member Profile | `/membership/:id` | `members` |
| Member Edit | `/membership/:id/edit` | `membership_write` |
| Address | `/membership/:id/demographics` | `membership_write` |
| Payment History | `/membership/:id/dues` | `members` |
| Record Payment | `/membership/:id/dues/new` | `membership_dues` |
| Activity Log | `/membership/:id/activity` | `members` |
| Position History | `/membership/:id/positions` | `members` |
| Card Management | `/membership/:id/cards` | `membership_cards` |
| Bulk Import | `/membership/import` | `membership_write` |
| Membership Stats | `/membership/stats` | `members` |

---

## 8. Traceability — API Route Mapping

### Existing Routes (Core CRUD — Party Module)

| Method | Path | Feature |
|--------|------|---------|
| `POST` | `/api/party/members` | `members` |
| `GET` | `/api/party/members` | `members` |
| `GET` | `/api/party/members/:id` | `members` |
| `PUT` | `/api/party/members/:id` | `members` |
| `DELETE` | `/api/party/members/:id` | `members` |

### New Routes (Membership Module)

| Method | Path | Feature |
|--------|------|---------|
| `GET` | `/api/membership` | `members` |
| `GET` | `/api/membership/stats` | `members` |
| `GET` | `/api/membership/export` | `members` |
| `GET` | `/api/membership/:id/profile` | `members` |
| `GET` | `/api/membership/:id/demographics` | `members` |
| `PUT` | `/api/membership/:id/demographics` | `members` |
| `GET` | `/api/membership/:id/history` | `members` |
| `GET` | `/api/membership/:id/activity` | `members` |
| `GET` | `/api/membership/:id/dues` | `members` |
| `GET` | `/api/membership/:id/positions` | `members` |
| `GET` | `/api/membership/:id/cards` | `members` |
| `POST` | `/api/membership/:id/check-in` | `members` |
| `POST` | `/api/membership/:id/activity` | `membership_write` |
| `POST` | `/api/membership/:id/positions` | `membership_write` |
| `POST` | `/api/membership/import` | `membership_write` |
| `POST` | `/api/membership/:id/dues` | `membership_dues` |
| `POST` | `/api/membership/:id/status` | `membership_admin` |
| `POST` | `/api/membership/:id/cards` | `membership_cards` |
| `PUT` | `/api/membership/cards/:id` | `membership_cards` |

---

## 9. File Inventory

### Backend Files

| File | Purpose |
|------|---------|
| `internal/models/party.go` | Core member, voter, party file structs + request/response DTOs |
| `internal/models/membership.go` | Membership module structs: demographics, dues, activity, positions, cards, profile, stats, filter |
| `internal/models/permissions.go` | Feature flag constants + default role permissions |
| `internal/repository/party_repo.go` | Core member CRUD + zone/structure data access |
| `internal/repository/membership_repo.go` | Membership-specific data access: demographics, dues, history, activity, positions, cards, stats, filtered search, bulk import |
| `internal/handlers/party.go` | Core member CRUD handlers (+ voters, files, zones) |
| `internal/handlers/membership.go` | Membership module handlers: search, profile, demographics, status, dues, activity, positions, cards, check-in, stats, import, export |
| `cmd/api/main.go` | Route registration with feature-flag-gated sub-groups |
| `supabase/migrations/20260810191000_membership_enhancements.sql` | Schema migration: ALTER members + 6 new tables + indexes |

### Frontend Files (Planned)

| File | Purpose |
|------|---------|
| `src/pages/membership/MembershipList.jsx` | Filterable, paginated member search table |
| `src/pages/membership/MembershipProfile.jsx` | Full profile view: demographics + positions + dues + activity + cards |
| `src/pages/membership/MembershipDues.jsx` | Payment ledger view + record payment form |
| `src/pages/membership/MembershipActivity.jsx` | Activity timeline list + record/check-in form |
| `src/pages/membership/MembershipPositions.jsx` | Position history + assign new position form |
| `src/pages/membership/MembershipCards.jsx` | Card list + issue/update card |
| `src/pages/membership/MembershipImport.jsx` | Bulk import UI |
| `src/pages/membership/MembershipStats.jsx` | Dashboard statistics cards + charts |
| `src/api/membership.js` | API client: search, profile, demographics, dues, activity, positions, cards, stats, import |

---

## 10. Migration Summary

### Statuses Added

`members.status`: Pending, Active, Suspended, Resigned, Expelled, Deceased (was: Active, Suspended, Expelled, Deceased)

### Columns Added to `members`

| Column | Type | Default |
|--------|------|---------|
| `membership_type` | VARCHAR(30) | Full |
| `membership_tier` | VARCHAR(20) | Basic |
| `resignation_date` | DATE | NULL |
| `expulsion_reason` | TEXT | NULL |

### New Tables (6)

| Table | Records in | Indexes |
|-------|-----------|---------|
| `member_demographics` | 1:1 with member | member_id |
| `member_dues` | 0..N per member | member_id, payment_date, payment_status |
| `member_status_history` | 1..N per member | member_id, changed_at |
| `member_activity` | 0..N per member | member_id, activity_date, activity_type |
| `member_positions` | 0..N per member | member_id, is_current |
| `member_cards` | 0..N per member | member_id, card_status |

---

## 11. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2026 | Initial membership BRD: demographics, dues, status workflow, activity, positions, cards, bulk ops |
