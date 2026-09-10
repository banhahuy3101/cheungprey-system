import { LuPrinter } from "react-icons/lu";

export function ViewTab({ handlePrint, zoomLevel, setZoomLevel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={handlePrint}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <LuPrinter size={15} /> Print View
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Zoom:</span>
        <select
          value={zoomLevel}
          onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
          className="form-select"
          style={{ fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}
        >
          <option value={0.75}>75%</option>
          <option value={0.9}>90%</option>
          <option value={1.0}>100% (A4 Standard)</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
        </select>
      </div>
    </div>
  );
}
