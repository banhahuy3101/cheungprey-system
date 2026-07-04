import { useState, useEffect } from "react";

export default function FinanceRejectModal({ open, onClose, onConfirm, submitting }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal finance-reject-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>បដិសេធប្រតិបត្តិការ</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="បិទ">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="reject-reason">មូលហេតុបដិសេធ *</label>
              <textarea
                id="reject-reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ពិពណ៌នាមូលហេតុ..."
                required
                autoFocus
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              បោះបង់
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting || !reason.trim()}>
              {submitting ? "..." : "បដិសេធ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
