export default function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {danger && <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "1.2rem" }}>!</span>}
            <h3>{title || "បញ្ជាក់"}</h3>
          </div>
          <button className="btn-icon" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: "var(--text-muted)" }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>បោះបង់</button>
          <button className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm}>
            {confirmLabel || "យល់ព្រម"}
          </button>
        </div>
      </div>
    </div>
  );
}
