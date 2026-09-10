import { LuFileText } from "react-icons/lu";
import { PAGE_BACKGROUND_COLORS } from "../../constants/editorConstants.js";

export function DesignTab({
  pageBgColor,
  setPageBgColor,
  pageBorder,
  setPageBorder,
  showWatermarkMenu,
  setShowWatermarkMenu,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Page Color:</span>
        {PAGE_BACKGROUND_COLORS.map((c) => (
          <div
            key={c}
            onClick={() => setPageBgColor(c)}
            style={{
              width: 22,
              height: 22,
              borderRadius: "4px",
              border: pageBgColor === c ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: c,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Watermark:</span>
        <button
          type="button"
          className={`btn-icon btn-sm ${showWatermarkMenu ? "active" : ""}`}
          title="Watermark"
          onClick={() => setShowWatermarkMenu(true)}
        >
          <LuFileText size={15} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Page Border:</span>
        <select
          className="form-select"
          value={pageBorder}
          style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
          onChange={(e) => setPageBorder(e.target.value)}
        >
          <option value="none">None</option>
          <option value="1px solid #000">Box</option>
          <option value="3px double #1e40af">Blue Double</option>
          <option value="2px solid #dc2626">Red Line</option>
        </select>
      </div>
    </div>
  );
}
