import {
  LuArrowUp,
  LuArrowDown,
  LuArrowLeft,
  LuArrowRight,
  LuTrash2,
  LuCombine,
  LuSplit,
  LuPalette,
} from "react-icons/lu";

export function TableTab({
  insertRowAbove,
  insertRowBelow,
  deleteRow,
  insertColLeft,
  insertColRight,
  deleteCol,
  mergeCells,
  unmergeCell,
  applyCellAlignment,
  applyCellBgColor,
  deleteTable,
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.85rem", padding: "0.2rem 0" }}>
      {/* ROWS GROUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <button
          type="button"
          onClick={insertRowAbove}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
          title="Insert Row Above"
        >
          <LuArrowUp size={14} /> Row Above
        </button>
        <button
          type="button"
          onClick={insertRowBelow}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
          title="Insert Row Below"
        >
          <LuArrowDown size={14} /> Row Below
        </button>
        <button
          type="button"
          onClick={deleteRow}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}
          title="Delete Row"
        >
          <LuTrash2 size={14} /> Delete Row
        </button>
      </div>

      {/* COLUMNS GROUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <button
          type="button"
          onClick={insertColLeft}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
          title="Insert Column Left"
        >
          <LuArrowLeft size={14} /> Col Left
        </button>
        <button
          type="button"
          onClick={insertColRight}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
          title="Insert Column Right"
        >
          <LuArrowRight size={14} /> Col Right
        </button>
        <button
          type="button"
          onClick={deleteCol}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}
          title="Delete Column"
        >
          <LuTrash2 size={14} /> Delete Col
        </button>
      </div>

      {/* MERGE & STYLING GROUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
        <button
          type="button"
          onClick={mergeCells}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
          title="Merge Selected Cells"
        >
          <LuCombine size={14} /> Merge Cells
        </button>

        <button
          type="button"
          onClick={unmergeCell}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
          title="Unmerge Cell (បំបែកក្រឡ)"
        >
          <LuSplit size={14} /> Unmerge Cell
        </button>
        <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 2px" }} />
        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>V-Align:</span>
        {[{ a: "top", i: "⊤" }, { a: "middle", i: "⊟" }, { a: "bottom", i: "⊥" }].map(({ a, i }) => (
          <button key={a} type="button" onClick={() => applyCellAlignment(a)} style={{ fontSize: "0.78rem", padding: "0.2rem 0.45rem", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155", minWidth: 26 }}>{i}</button>
        ))}

        <label
          style={{
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.78rem",
            padding: "0.25rem 0.6rem",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "5px",
            fontWeight: "500",
            color: "#334155"
          }}
          title="Cell Fill Color"
        >
          <LuPalette size={14} /> Fill Color
          <input
            type="color"
            defaultValue="#185abd"
            onChange={(e) => applyCellBgColor(e.target.value)}
            style={{ width: 18, height: 18, border: "1px solid #cbd5e1", borderRadius: 3, cursor: "pointer", padding: 0 }}
          />
        </label>
      </div>

      {/* DELETE TABLE GROUP */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          type="button"
          onClick={deleteTable}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "5px", padding: "0.3rem 0.65rem", cursor: "pointer", fontWeight: "700" }}
          title="Delete Whole Table"
        >
          <LuTrash2 size={14} /> Delete Table
        </button>
      </div>
    </div>
  );
}
