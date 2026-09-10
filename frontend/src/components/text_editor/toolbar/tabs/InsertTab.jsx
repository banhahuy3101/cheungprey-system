import {
  LuFileText,
  LuTable,
  LuSquareCheck,
  LuList,
  LuLink,
  LuImage,
  LuMinus,
} from "react-icons/lu";
import { SYMBOLS_LIST } from "../../constants/editorConstants.js";

export function InsertTab({
  insertOfficialHeader,
  insertReportMetaTable,
  insertSignatureBlock,
  insertRecipientsBlock,
  insertTable,
  insertLink,
  handleImageUpload,
  insertHorizontalRule,
  insertPageBreak,
  setShowDropCapMenu,
  showSymbols,
  setShowSymbols,
  insertSymbol,
  insertDateTime,
  showHeaderFooter,
  setShowHeaderFooter,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.75rem", borderRight: "1px solid #cbd5e1" }}>
        <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>Report blocks:</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={insertOfficialHeader}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          title="Insert official Khmer report heading"
        >
          <LuFileText size={15} /> Header
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={insertReportMetaTable}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          title="Insert report metadata table"
        >
          <LuTable size={15} /> Meta
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={insertSignatureBlock}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          title="Insert signature and approval block"
        >
          <LuSquareCheck size={15} /> Sign
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={insertRecipientsBlock}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          title="Insert copied recipients block"
        >
          <LuList size={15} /> CC
        </button>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={insertTable}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <LuTable size={15} /> Table
      </button>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={insertLink}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <LuLink size={15} /> Link
      </button>

      <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
        <LuImage size={15} /> Image
        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} />
      </label>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={insertHorizontalRule}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <LuMinus size={15} /> Line
      </button>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={insertPageBreak}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <LuFileText size={15} /> Page Break
      </button>

      <div style={{ width: "1px", height: "20px", background: "#cbd5e1" }} />

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setShowDropCapMenu(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <span style={{ fontWeight: 700, fontSize: "15px" }}>A</span><span style={{ fontSize: "10px" }}>a</span> Drop Cap
      </button>

      {/* Symbols Dropdown */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className={`btn btn-secondary btn-sm ${showSymbols ? "active" : ""}`}
          onClick={() => setShowSymbols(!showSymbols)}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          Ω Symbol
        </button>
        {showSymbols && (
          <div
            style={{
              position: "absolute", top: "100%", left: 0, zIndex: 50,
              background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)", padding: "0.6rem",
              display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "3px", width: 320
            }}
            onMouseLeave={() => setShowSymbols(false)}
          >
            {SYMBOLS_LIST.map((s) => (
              <div
                key={s}
                onClick={() => insertSymbol(s)}
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  borderRadius: "3px",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#eff6ff";
                  e.currentTarget.style.borderColor = "#93c5fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: "1px", height: "20px", background: "#cbd5e1" }} />

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={insertDateTime}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        📅 Date & Time
      </button>

      <button
        type="button"
        className={`btn btn-secondary btn-sm ${showHeaderFooter ? "active" : ""}`}
        onClick={() => setShowHeaderFooter(!showHeaderFooter)}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        📄 Header/Footer
      </button>
    </div>
  );
}
