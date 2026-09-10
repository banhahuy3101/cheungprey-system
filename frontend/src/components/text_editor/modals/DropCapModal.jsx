import { LuX } from "react-icons/lu";

export function DropCapModal({
  isOpen,
  onClose,
  dropCapSize,
  setDropCapSize,
  dropCapSpacing,
  setDropCapSpacing,
  dropCapWeight,
  setDropCapWeight,
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
          width: "min(430px, 100%)",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", fontWeight: 800, color: "#0f172a" }}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>A</span>
            <span style={{ fontSize: "0.82rem" }}>Drop Cap</span>
          </div>
          <button type="button" className="btn-icon" title="Close" onClick={onClose} style={{ width: 30, height: 30 }}>
            <LuX size={16} />
          </button>
        </div>
        <div style={{ padding: "1rem", display: "grid", gap: "0.85rem" }}>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
            Size
            <input
              type="number"
              min="1.5"
              max="8"
              step="0.5"
              value={dropCapSize}
              onChange={(e) => setDropCapSize(e.target.value)}
              style={{ padding: "0.6rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
            Spacing
            <input
              type="number"
              min="0"
              max="32"
              step="1"
              value={dropCapSpacing}
              onChange={(e) => setDropCapSpacing(e.target.value)}
              style={{ padding: "0.6rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
            Weight
            <select
              value={dropCapWeight}
              onChange={(e) => setDropCapWeight(e.target.value)}
              style={{ padding: "0.6rem 0.7rem", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
            >
              <option value={400}>Regular</option>
              <option value={600}>Semi Bold</option>
              <option value={700}>Bold</option>
              <option value={900}>Black</option>
            </select>
          </label>
          <div style={{ padding: "0.85rem", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.82rem" }}>
            Select the paragraph text first, then apply Drop Cap.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", padding: "0.85rem 1rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
