import { useState } from "react";
import { LuTable, LuX } from "react-icons/lu";

export function TableModal({
  isOpen,
  onClose,
  onApply,
}) {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [hoverCols, setHoverCols] = useState(0);
  const [hoverRows, setHoverRows] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const c = Math.max(1, Math.min(20, Number(cols) || 3));
    const r = Math.max(1, Math.min(50, Number(rows) || 3));
    onApply(c, r);
    onClose();
  };

  const handleGridClick = (col, row) => {
    onApply(col, row);
    onClose();
  };

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
          width: "min(380px, 100%)",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, color: "#0f172a" }}>
            <LuTable size={17} /> Insert Table (បញ្ចូលតារាង)
          </div>
          <button type="button" className="btn-icon" title="Close" onClick={onClose} style={{ width: 30, height: 30 }}>
            <LuX size={16} />
          </button>
        </div>

        <div style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
          {/* Visual Grid Picker (up to 6x6 quick select) */}
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
              Quick Grid: {hoverCols || cols} × {hoverRows || rows}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "4px",
                padding: "8px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
              onMouseLeave={() => {
                setHoverCols(0);
                setHoverRows(0);
              }}
            >
              {Array.from({ length: 36 }).map((_, i) => {
                const colIdx = (i % 6) + 1;
                const rowIdx = Math.floor(i / 6) + 1;
                const activeCols = hoverCols || cols;
                const activeRows = hoverRows || rows;
                const isHighlighted = colIdx <= activeCols && rowIdx <= activeRows;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => {
                      setHoverCols(colIdx);
                      setHoverRows(rowIdx);
                    }}
                    onClick={() => handleGridClick(colIdx, rowIdx)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "3px",
                      border: "1px solid",
                      borderColor: isHighlighted ? "#2563eb" : "#cbd5e1",
                      background: isHighlighted ? "#dbeafe" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  />
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <label style={{ flex: 1, display: "grid", gap: "0.25rem", fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                Columns (ជួរឈរ)
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={cols}
                  onChange={(e) => setCols(e.target.value)}
                  style={{ padding: "0.5rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </label>
              <label style={{ flex: 1, display: "grid", gap: "0.25rem", fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                Rows (ជួរដេក)
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  style={{ padding: "0.5rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Insert Table
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
