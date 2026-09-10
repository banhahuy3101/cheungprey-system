export function LayoutTab({ applyParagraphSpacing }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Columns:</span>
        {[{ cols: 1, label: "One" }, { cols: 2, label: "Two" }, { cols: 3, label: "Three" }].map(({ cols, label }) => (
          <button key={cols} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: "0.78rem" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Margins:</span>
        {[{ v: "1in", label: "Normal" }, { v: "0.5in", label: "Narrow" }, { v: "2in", label: "Wide" }].map(({ v, label }) => (
          <button key={v} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: "0.78rem" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Paper:</span>
        <select
          className="form-select"
          defaultValue="A4"
          style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
        >
          <option>A4 (210x297mm)</option>
          <option>Letter (8.5x11in)</option>
          <option>Legal (8.5x14in)</option>
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Spacing:</span>
        <select
          className="form-select"
          defaultValue="0"
          style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", width: 90 }}
          onChange={(e) => applyParagraphSpacing(e.target.value)}
        >
          <option value="0">0 pt</option>
          <option value="6">6 pt</option>
          <option value="12">12 pt</option>
          <option value="18">18 pt</option>
          <option value="24">24 pt</option>
        </select>
      </div>
    </div>
  );
}
