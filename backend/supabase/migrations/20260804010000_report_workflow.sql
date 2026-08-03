BEGIN;

ALTER TABLE report_documents
  DROP CONSTRAINT IF EXISTS report_documents_status_check;

ALTER TABLE report_documents
  ADD CONSTRAINT report_documents_status_check
    CHECK (status IN ('draft','pending_review','published','rejected'));

CREATE TABLE IF NOT EXISTS report_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submit','approve','reject')),
  comment TEXT,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_reviews_report_id ON report_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_created_at ON report_reviews(created_at);

COMMIT;
