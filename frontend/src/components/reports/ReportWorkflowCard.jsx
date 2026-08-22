import CardToggle from "./CardToggle";

const WORKFLOW_STATUS_META = {
  pending: { label: "កំពុងរង់ចាំ", bg: "#fef3c7", fg: "#92400e" },
  approved: { label: "បានអនុម័ត", bg: "#dcfce7", fg: "#166534" },
  rejected: { label: "បានបដិសេធ", bg: "#fee2e2", fg: "#991b1b" },
};

export default function ReportWorkflowCard({ workflow, open, onToggle }) {
  if (!workflow || workflow.length === 0) return null;
  return (
    <div className="report-workflow" style={{
      position: "relative",
      background: "#ffffff", border: "1px solid var(--border)", borderRadius: "12px",
      padding: "1.35rem", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
      display: "flex", flexDirection: "column", gap: "0.5rem",
    }}>
      <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text)", marginBottom: "0.35rem" }}>
        🔄 ស្ថានភាពអនុម័ត (Workflow)
      </div>
      <CardToggle open={open} onToggle={onToggle} title={open ? "លាក់" : "បង្ហាញ"} />
      {open && workflow.map((step, idx) => {
        const meta = WORKFLOW_STATUS_META[step.status] || { label: step.status, bg: "#f1f5f9", fg: "#475569" };
        const roleLabel = step.approver_role_label || step.approver_role || "—";
        return (
          <div key={step.id || idx} style={{
            display: "flex", alignItems: "center", gap: "0.85rem", fontSize: "0.88rem",
            padding: "0.6rem 0.5rem", borderRadius: "8px", background: "#f8fafc",
            border: "1px solid #eef2f7",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1rem", flexShrink: 0 }}>
              <span style={{ fontWeight: "700", color: "#2563eb", fontSize: "0.8rem" }}>ជំហាន {step.step_order}</span>
              {idx < workflow.length - 1 && <span style={{ width: "1px", height: "18px", background: "#cbd5e1" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: "600", color: "#0f172a" }}>
                {step.approver_name || roleLabel}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {step.status === "pending"
                  ? `កំពុងរង់ចាំ ${step.approver_name ? step.approver_name : roleLabel} អនុម័ត`
                  : step.approved_by_name
                    ? `បានធ្វើដោយ ${step.approved_by_name} · ${step.approved_at ? new Date(step.approved_at).toLocaleString("km-KH") : ""}`
                    : ""}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{roleLabel}</div>
              {step.notes && <div style={{ fontSize: "0.75rem", color: "#475569", fontStyle: "italic", marginTop: "0.15rem" }}>“{step.notes}”</div>}
            </div>
            <span style={{
              padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600",
              background: meta.bg, color: meta.fg, whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
