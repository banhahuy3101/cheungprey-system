-- FMS: Chart of Accounts (Standardized economic classification codes)
CREATE TABLE chart_of_accounts (
  account_code VARCHAR(20) PRIMARY KEY,
  account_name_en TEXT NOT NULL,
  account_name_kh TEXT NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'revenue', 'expense')),
  parent_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FMS: Budgets (annual ceilings per account line item)
CREATE TABLE fms_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code VARCHAR(20) NOT NULL REFERENCES geographic_zones(zone_code),
  fiscal_year INT NOT NULL,
  account_code VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(account_code),
  allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  reserved_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'active')),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_code, fiscal_year, account_code)
);

-- FMS: Transactions (immutable ledger — NO DELETE allowed)
CREATE TABLE fms_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code VARCHAR(20) NOT NULL REFERENCES geographic_zones(zone_code),
  account_code VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(account_code),
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount_usd DECIMAL(15,2) DEFAULT 0,
  amount_khr DECIMAL(17,2) DEFAULT 0,
  description TEXT,
  document_refs JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'executed', 'rejected')),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  reversal_of UUID REFERENCES fms_transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- FMS: Immutable audit log
CREATE TABLE fms_audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  user_id UUID REFERENCES profiles(id),
  ip_address TEXT,
  old_data JSONB,
  new_data JSONB,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fms_budgets_zone ON fms_budgets(zone_code, fiscal_year);
CREATE INDEX idx_fms_budgets_account ON fms_budgets(account_code);
CREATE INDEX idx_fms_transactions_zone ON fms_transactions(zone_code);
CREATE INDEX idx_fms_transactions_account ON fms_transactions(account_code);
CREATE INDEX idx_fms_transactions_status ON fms_transactions(status);
CREATE INDEX idx_fms_transactions_reversal ON fms_transactions(reversal_of);
CREATE INDEX idx_fms_audit_log_record ON fms_audit_log(table_name, record_id);
CREATE INDEX idx_fms_audit_log_performed ON fms_audit_log(performed_at DESC);

-- RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fms_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fms_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fms_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read CoA
CREATE POLICY "Authenticated can read chart_of_accounts"
  ON chart_of_accounts FOR SELECT TO authenticated USING (true);

-- Super admin and admin can manage CoA
CREATE POLICY "Admin can manage chart_of_accounts"
  ON chart_of_accounts FOR ALL TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

-- Budgets: staff can read, admin can manage
CREATE POLICY "Staff can read fms_budgets"
  ON fms_budgets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage fms_budgets"
  ON fms_budgets FOR ALL TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

-- Transactions: zone-scoped read, admin manage
CREATE POLICY "Users can read own zone fms_transactions"
  ON fms_transactions FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('super_admin', 'admin')
    OR zone_code = (SELECT zone_code FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin can manage fms_transactions"
  ON fms_transactions FOR ALL TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

-- Audit log: read-only for admins
CREATE POLICY "Admin can read fms_audit_log"
  ON fms_audit_log FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin'));

-- Seed standard Chart of Accounts
INSERT INTO chart_of_accounts (account_code, account_name_en, account_name_kh, account_type) VALUES
  ('6001', 'Office Stationery', 'សម្ភារៈការិយាល័យ', 'expense'),
  ('6002', 'Travel & Transportation', 'ការធ្វើដំណើរ', 'expense'),
  ('6003', 'Utilities', 'ប្រើប្រាស់ទឹកភ្លើង', 'expense'),
  ('6004', 'Communication', 'ទូរគមនាគមន៍', 'expense'),
  ('6101', 'Road Construction', 'សាងសង់ផ្លូវ', 'expense'),
  ('6102', 'School Infrastructure', 'ហេដ្ឋារចនាសម្ព័ន្ធសាលារៀន', 'expense'),
  ('6103', 'Water Supply', 'ប្រព័ន្ធផ្គត់ផ្គង់ទឹក', 'expense'),
  ('6104', 'Community Building', 'អគារសហគមន៍', 'expense'),
  ('6201', 'Community Police', 'ប្រាក់ឧបត្ថម្ភកងឃុំ', 'expense'),
  ('6202', 'Social Welfare', 'សុខុមាលភាពសង្គម', 'expense'),
  ('7001', 'Commune Fund Transfer', 'មូលនិធិឃុំ-សង្កាត់', 'revenue'),
  ('7002', 'Administrative Fees', 'ចំណូលសេវាកម្ម', 'revenue'),
  ('7003', 'Grants & Donations', 'ជំនួយ និងវិភាជន៍', 'revenue'),
  ('7004', 'Tax Revenue', 'ចំណូលពន្ធ', 'revenue')
ON CONFLICT (account_code) DO NOTHING;
