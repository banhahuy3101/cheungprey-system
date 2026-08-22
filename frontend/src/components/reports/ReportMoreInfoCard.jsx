import CardToggle from "./CardToggle";

export default function ReportMoreInfoCard({ category, zoneName, open, onToggle }) {
  return (
    <div className="card" style={{
      position: "relative",
      padding: "1.35rem", borderRadius: "12px", background: "#ffffff",
      border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
      display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem",
    }}>
      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
        ព័ត៌មានបន្ថែម
      </h4>
      <CardToggle open={open} onToggle={onToggle} title={open ? "លាក់" : "បង្ហាញ"} />
      {open && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>ប្រភេទ៖</span>
            <span style={{ fontWeight: "600" }}>{category || "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>តំបន់/ឃុំ៖</span>
            <span style={{ fontWeight: "500" }}>{zoneName || "—"}</span>
          </div>
        </>
      )}
    </div>
  );
}
