import Modal from "../../pages/settings/Modal";

export default function RejectReportModal({
  open, onClose, reason, onReasonChange, onConfirm, rejecting, error,
}) {
  return (
    <Modal open={open} onClose={onClose} title="បដិសេធរបាយការណ៍">
      <div style={{ padding: "0.5rem 0" }}>
        <div className="form-group">
          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "600", fontSize: "0.9rem" }}>
            មូលហេតុនៃការបដិសេធ <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            className="form-control"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            placeholder="សូមបញ្ចូលមូលហេតុ ឬការណែនាំសម្រាប់អ្នកកែប្រែ..."
            style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
          />
          {error && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.15rem", display: "block" }}>{error}</span>}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            បោះបង់
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={rejecting || !reason.trim()}>
            {rejecting ? "កំពុងបដិសេធ..." : "បញ្ជាក់ការបដិសេធ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
