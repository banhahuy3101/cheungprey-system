const STATUS_LABEL = { draft: "ព្រាង", pending_review: "កំពុងពិនិត្យ", published: "បានចេញ", rejected: "បានបដិសេធ" };
const STATUS_BG = { draft: "#fef3c7", pending_review: "#dbeafe", published: "#dcfce7", rejected: "#fecaca" };
const STATUS_FG = { draft: "#92400e", pending_review: "#1e40af", published: "#166534", rejected: "#991b1b" };

export default function ReportStatusBadge({ status }) {
  return (
    <span className="report-status-pill" style={{
      background: STATUS_BG[status], color: STATUS_FG[status],
      padding: "0.35rem 0.85rem", fontSize: "0.82rem", fontWeight: "600", borderRadius: "999px",
      display: "inline-flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: STATUS_FG[status] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
