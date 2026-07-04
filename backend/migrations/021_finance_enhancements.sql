-- FIN-02 budgets, FIN-04 attachments, FIN-06 approval workflow
ALTER TABLE public.party_finances
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_status ON public.party_finances(status);

CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  zone_code VARCHAR(8) NOT NULL REFERENCES public.geographic_zones(zone_code),
  budget_type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (budget_type IN ('income', 'expense', 'total')),
  amount_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_khr DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_budget_zone ON public.finance_budgets(zone_code);
CREATE INDEX IF NOT EXISTS idx_finance_budget_period ON public.finance_budgets(period_start, period_end);

CREATE TABLE IF NOT EXISTS public.finance_attachments (
  finance_id UUID NOT NULL REFERENCES public.party_finances(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.party_files(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (finance_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_attachments_file ON public.finance_attachments(file_id);
