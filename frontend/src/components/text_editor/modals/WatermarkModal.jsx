import { LuFileText, LuX } from "react-icons/lu";

export function WatermarkModal({
  isOpen,
  onClose,
  watermarkText,
  setWatermarkText,
  onApply,
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10020,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.38)",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, color: "#0f172a" }}>
            <LuFileText size={17} /> Watermark
          </div>
          <button type="button" className="btn-icon" title="Close" onClick={onClose} style={{ width: 30, height: 30 }}>
            <LuX size={16} />
          </button>
        </div>
        <div style={{ padding: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>
            Label
          </label>
          <input
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Enter watermark label"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply(watermarkText);
                onClose();
              }
              if (e.key === "Escape") onClose();
            }}
            style={{ width: "100%", padding: "0.65rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem", boxSizing: "border-box" }}
            autoFocus
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", padding: "0.85rem 1rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onApply("");
              setWatermarkText("");
              onClose();
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onApply(watermarkText);
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
