import CardToggle from "./CardToggle";

const ACTION_LABEL = { submit: "ដាក់ស្នើ", approve: "បានអនុម័ត", confirm: "បានអនុម័ត", reject: "បានបដិសេធ" };
const ACTION_STYLE = { approve: { bg: "#dcfce7", color: "#166534" }, confirm: { bg: "#dcfce7", color: "#166534" }, reject: { bg: "#fee2e2", color: "#991b1b" }, submit: { bg: "#dbeafe", color: "#1e40af" } };

export default function ReportHistoryCard({ reviews, open, onToggle }) {
  if (!reviews || reviews.length === 0) return null;
  return (
    <div className="report-reviews" style={{
      position: "relative",
      background: "#ffffff", border: "1px solid var(--border)", borderRadius: "12px",
      padding: "1.35rem", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
      display: "flex", flexDirection: "column", gap: "0.75rem",
    }}>
      <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text)", marginBottom: "0.35rem" }}>
        🕓 ប្រវត្តិ ({reviews.length})
      </div>
      <CardToggle open={open} onToggle={onToggle} title={open ? "លាក់" : "បង្ហាញ"} />
      {open && reviews.map((r, idx) => {
        const st = ACTION_STYLE[r.action] || { bg: "#dbeafe", color: "#1e40af" };
        return (
          <div key={r.id || idx} style={{
            display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem",
            paddingBottom: "0.6rem", borderBottom: idx === reviews.length - 1 ? "none" : "1px dashed var(--border)",
          }}>
            <span style={{
              padding: "0.15rem 0.55rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600",
              background: st.bg, color: st.color,
            }}>
              {ACTION_LABEL[r.action] || r.action}
            </span>
            {r.comment && <span style={{ color: "#475569", fontStyle: "italic" }}>— "{r.comment}"</span>}
            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              {new Date(r.created_at).toLocaleString("km-KH")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
