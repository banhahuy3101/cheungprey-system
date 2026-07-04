# FMS — Technical Notes & Migration Roadmap

Companion to [business-requirements.md](./business-requirements.md).

---

## 1. Current State vs FMS Target

| Area | Current (Party Finance) | FMS Target |
|------|------------------------|------------|
| **Tenancy** | Single-tenant (Cheung Prey District) | Single-tenant with zone-scoped RLS |
| **Ledger** | Single-entry `party_finances` table | Double-entry with Chart of Accounts |
| **Budget** | Planned `finance_budgets` (Phase 1B) | Budget ceilings per CoA line item, hard-enforced |
| **Deletes** | Soft delete planned | Zero DELETE — reversal entries only |
| **Audit** | Basic logging | Immutable audit log table with triggers |
| **Approvals** | FIN-06 in Phase 2 | Mandatory for all disbursements |
| **FMIS** | Not in scope | Modular API layer for national FMIS sync |
| **Payment** | Not in scope | Bakong/commercial bank QR integration |

---

## 2. Migration Phases

### Phase 1 — Foundation (Chart of Accounts)

**Goal:** Establish the Chart of Accounts.

```sql
CREATE TABLE chart_of_accounts (
  account_code VARCHAR(20) PRIMARY KEY,
  account_name_en TEXT NOT NULL,
  account_name_kh TEXT NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset','liability','revenue','expense')),
  parent_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
  is_active BOOLEAN DEFAULT true
);
```

Seed CoA examples:

| Code | Name EN | Name KH | Type |
|------|---------|---------|------|
| 6001 | Office Stationery | សម្ភារៈការិយាល័យ | expense |
| 6002 | Travel & Transportation | ការធ្វើដំណើរ | expense |
| 6101 | Road Construction | សាងសង់ផ្លូវ | expense |
| 6102 | School Infrastructure | ហេដ្ឋារចនាសម្ព័ន្ធសាលារៀន | expense |
| 7001 | Commune Fund Transfer | មូលនិធិឃុំ-សង្កាត់ | revenue |
| 7002 | Administrative Fees | ចំណូលសេវាកម្ម | revenue |

### Phase 2 — Budgets + Transactions

```sql
CREATE TABLE budgets (
  budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code VARCHAR(20) NOT NULL,
  fiscal_year INT NOT NULL,
  account_code VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(account_code),
  allocated_amount DECIMAL(15,2) NOT NULL,
  spent_amount DECIMAL(15,2) DEFAULT 0,
  reserved_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','active')),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_code, fiscal_year, account_code)
);

CREATE TABLE transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code VARCHAR(20) NOT NULL,
  account_code VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(account_code),
  type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
  amount_usd DECIMAL(15,2) DEFAULT 0,
  amount_khr DECIMAL(17,2) DEFAULT 0,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','executed','rejected')),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  reversal_of UUID REFERENCES transactions(transaction_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);
```

### Phase 3 — Immutability & Audit

```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('insert','update','delete')),
  user_id UUID REFERENCES profiles(id),
  ip_address INET,
  old_data JSONB,
  new_data JSONB,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function on transactions
CREATE OR REPLACE FUNCTION audit_transactions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, user_id, old_data, new_data)
  VALUES ('transactions', NEW.transaction_id, TG_OP, current_setting('app.current_user_id')::UUID,
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE row_to_json(NEW)::jsonb END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_transactions();
```

### Phase 4 — FMIS Integration Layer

- Adapter pattern: `internal/fmis/` package with interface for sync contracts
- Webhook endpoints: `POST /api/fms/fmis/sync` for push/pull
- Mapping layer: FMS transaction model ↔ national FMIS message format

---

## 3. Budget Ceiling Enforcement

On every expense creation request, the system runs server-side:

```
IF requested_amount > (budget.allocated_amount - budget.spent_amount - budget.reserved_amount)
THEN BLOCK with "Insufficient Budget Allocation" error
```

Implemented via a stored procedure or API middleware — never client-side.

---

## 4. API Routes (Target State)

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/api/fms/coa` | Chart of Accounts admin |
| CRUD | `/api/fms/budgets` | Budget CRUD with ceiling enforcement |
| GET | `/api/fms/budgets/summary` | Budget vs actual per zone/period |
| POST | `/api/fms/transactions` | Create income/expense |
| GET | `/api/fms/transactions` | List with filters + pagination |
| POST | `/api/fms/transactions/:id/reverse` | Reversal entry (not delete) |
| POST | `/api/fms/transactions/:id/approve` | Approve expense |
| POST | `/api/fms/transactions/:id/reject` | Reject expense |
| GET | `/api/fms/dashboard` | Budget vs actual dashboards |
| GET | `/api/fms/audit` | Audit log query |
| POST | `/api/fms/fmis/sync` | FMIS data sync |

---

## 5. Migration Path from Party Finance

1. **Create `chart_of_accounts` table** — seed with standard codes
2. **Create `budgets` and `transactions` tables** — new FMS ledger
4. **Run dual-write period** — party_finances + transactions in parallel
5. **Build audit triggers** — enable immutability enforcement
6. **Cut over** — disable writes to old tables, retire them when stable
7. **Add FMIS adapter** — only after core ledger is hardened

---

## 6. Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jul 2026 | Rewrite from party finance roadmap to FMS technical migration plan |
