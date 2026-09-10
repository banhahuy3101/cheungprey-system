import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuSubscript,
  LuSuperscript,
  LuList,
  LuListOrdered,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuAlignJustify,
  LuIndentIncrease,
  LuIndentDecrease,
  LuPilcrow,
  LuHighlighter,
  LuPalette,
  LuRemoveFormatting,
  LuMinus,
  LuPlus,
  LuSquareCheck,
  LuPaintbrush,
  LuSearch,
} from "react-icons/lu";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  CASE_TYPES,
} from "../../constants/editorConstants.js";

export function HomeTab({
  isBold,
  isItalic,
  isUnderline,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  blockType,
  fontFamily,
  fontSize,
  setFontSize,
  painterStyle,
  toggleFormatPainter,
  applyFontFamily,
  applyFontSize,
  changeFontSizeBy,
  clearFormatting,
  formatText,
  formatAlign,
  formatHeading,
  formatParagraph,
  formatQuote,
  formatCodeBlock,
  formatBulletList,
  formatNumberedList,
  insertChecklist,
  showParagraphMarks,
  setShowParagraphMarks,
  toggleTextDirection,
  applyLineSpacing,
  showBorders,
  setShowBorders,
  applyParagraphBorder,
  showCaseMenu,
  setShowCaseMenu,
  changeCase,
  showHighlightSwatches,
  setShowHighlightSwatches,
  applyHighlightColor,
  showColorSwatches,
  setShowColorSwatches,
  applyTextColor,
  showFindReplace,
  setShowFindReplace,
  outdent,
  indent,
}) {
  return (
    <>
      {/* CLIPBOARD GROUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", paddingRight: "0.6rem", borderRight: "1px solid #cbd5e1" }}>
        <button
          type="button"
          className={`btn-icon btn-sm ${painterStyle ? "active" : ""}`}
          onClick={toggleFormatPainter}
          title="Format Painter"
        >
          <LuPaintbrush size={15} />
        </button>
      </div>

      {/* FONT GROUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.6rem", borderRight: "1px solid #cbd5e1" }}>
        <select
          value={fontFamily}
          onChange={(e) => applyFontFamily(e.target.value)}
          className="form-select"
          style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={() => changeFontSizeBy(-2)}
            title="Decrease Font Size"
          >
            <LuMinus size={12} />
          </button>
          <select
            value={`${fontSize}px`}
            onChange={(e) => {
              const sizeNum = parseInt(e.target.value, 10);
              setFontSize(sizeNum);
              applyFontSize(e.target.value);
            }}
            className="form-select"
            style={{
              fontSize: "0.78rem",
              fontWeight: "600",
              padding: "0.2rem 0.3rem",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              width: "58px",
              textAlign: "center",
              background: "#ffffff",
              cursor: "pointer",
            }}
            title="Font Size"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{parseInt(s, 10)}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={() => changeFontSizeBy(2)}
            title="Increase Font Size"
          >
            <LuPlus size={12} />
          </button>
        </div>

        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={clearFormatting}
          title="Clear Formatting"
        >
          <LuRemoveFormatting size={15} />
        </button>

        <button
          type="button"
          className={`btn-icon btn-sm ${isBold ? "active" : ""}`}
          onClick={() => formatText("bold")}
          title="Bold (Ctrl+B)"
        >
          <LuBold size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${isItalic ? "active" : ""}`}
          onClick={() => formatText("italic")}
          title="Italic (Ctrl+I)"
        >
          <LuItalic size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${isUnderline ? "active" : ""}`}
          onClick={() => formatText("underline")}
          title="Underline (Ctrl+U)"
        >
          <LuUnderline size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${isStrikethrough ? "active" : ""}`}
          onClick={() => formatText("strikethrough")}
          title="Strikethrough"
        >
          <LuStrikethrough size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${isSubscript ? "active" : ""}`}
          onClick={() => formatText("subscript")}
          title="Subscript"
        >
          <LuSubscript size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${isSuperscript ? "active" : ""}`}
          onClick={() => formatText("superscript")}
          title="Superscript"
        >
          <LuSuperscript size={15} />
        </button>

        {/* Change Case Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`btn-icon btn-sm ${showCaseMenu ? "active" : ""}`}
            onClick={() => setShowCaseMenu(!showCaseMenu)}
            title="Change Case"
          >
            <span style={{ fontWeight: 700, fontSize: "14px" }}>Aa</span>
          </button>
          {showCaseMenu && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)", minWidth: 190, padding: "0.25rem 0"
              }}
              onMouseLeave={() => setShowCaseMenu(false)}
            >
              {CASE_TYPES.map(({ key, label, desc }) => (
                <div
                  key={key}
                  onClick={() => changeCase(key)}
                  style={{ padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.8rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div style={{ color: "#888", fontSize: "0.72rem" }}>{desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Highlight Picker */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`btn-icon btn-sm ${showHighlightSwatches ? "active" : ""}`}
            onClick={() => {
              setShowHighlightSwatches(!showHighlightSwatches);
              setShowColorSwatches(false);
            }}
            title="Highlight Color"
          >
            <div style={{ position: "relative", display: "flex" }}>
              <LuHighlighter size={15} />
              <div style={{ width: 10, height: 3, background: "#ffff00", position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", borderRadius: 2 }} />
            </div>
          </button>
          {showHighlightSwatches && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px",
                padding: "0.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", width: 210
              }}
              onMouseLeave={() => setShowHighlightSwatches(false)}
            >
              {HIGHLIGHT_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => {
                    applyHighlightColor(c === "none" ? "transparent" : c);
                    setShowHighlightSwatches(false);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    background: c === "none" ? "linear-gradient(45deg, #fff 45%, #ccc 50%, #fff 55%)" : c,
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  title={c === "none" ? "No Color" : c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text Color Picker */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`btn-icon btn-sm ${showColorSwatches ? "active" : ""}`}
            onClick={() => {
              setShowColorSwatches(!showColorSwatches);
              setShowHighlightSwatches(false);
            }}
            title="Font Color"
          >
            <div style={{ position: "relative", display: "flex" }}>
              <LuPalette size={15} />
              <div style={{ width: 10, height: 3, background: "#cc0000", position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", borderRadius: 2 }} />
            </div>
          </button>
          {showColorSwatches && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px",
                padding: "0.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "3px", width: 240
              }}
              onMouseLeave={() => setShowColorSwatches(false)}
            >
              {TEXT_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => {
                    applyTextColor(c);
                    setShowColorSwatches(false);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    background: c,
                    border: c === "#ffffff" ? "1px solid #ddd" : "1px solid transparent",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  title={c}
                />
              ))}
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e5e7eb", marginTop: "4px", paddingTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", cursor: "pointer", color: "#64748b" }}>
                  <LuPalette size={12} /> More Colors...
                  <input
                    type="color"
                    onChange={(e) => {
                      applyTextColor(e.target.value);
                      setShowColorSwatches(false);
                    }}
                    style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PARAGRAPH GROUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.6rem", borderRight: "1px solid #cbd5e1" }}>
        <button
          type="button"
          className={`btn-icon btn-sm ${blockType === "ul" ? "active" : ""}`}
          onClick={formatBulletList}
          title="Bulleted List"
        >
          <LuList size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${blockType === "ol" ? "active" : ""}`}
          onClick={formatNumberedList}
          title="Numbered List"
        >
          <LuListOrdered size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={insertChecklist}
          title="Checklist"
        >
          <LuSquareCheck size={15} />
        </button>

        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={outdent}
          title="Decrease Indent"
        >
          <LuIndentDecrease size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={indent}
          title="Increase Indent"
        >
          <LuIndentIncrease size={15} />
        </button>
        <button
          type="button"
          className={`btn-icon btn-sm ${showParagraphMarks ? "active" : ""}`}
          onClick={() => setShowParagraphMarks(!showParagraphMarks)}
          title="Show/Hide ¶"
        >
          <LuPilcrow size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={() => formatAlign("left")}
          title="Align Left"
        >
          <LuAlignLeft size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={() => formatAlign("center")}
          title="Align Center"
        >
          <LuAlignCenter size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={() => formatAlign("right")}
          title="Align Right"
        >
          <LuAlignRight size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={() => formatAlign("justify")}
          title="Align Justify"
        >
          <LuAlignJustify size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-sm"
          onClick={toggleTextDirection}
          title="Text Direction (LTR ↔ RTL)"
        >
          <span style={{ fontSize: "13px", fontWeight: 700 }}>⇄</span>
        </button>

        <select
          onChange={(e) => applyLineSpacing(e.target.value)}
          className="form-select"
          defaultValue="1.5"
          style={{ fontSize: "0.78rem", padding: "0.2rem 0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
        >
          <option value="1.0">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2.0">2.0</option>
          <option value="2.5">2.5</option>
          <option value="3.0">3.0</option>
        </select>

        {/* Borders */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`btn-icon btn-sm ${showBorders ? "active" : ""}`}
            onClick={() => setShowBorders(!showBorders)}
            title="Borders"
          >
            <span style={{ border: "2px solid #334155", padding: "0 4px", fontSize: "11px", fontWeight: 700, borderRadius: "2px", lineHeight: "16px" }}>田</span>
          </button>
          {showBorders && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)", padding: "0.5rem",
                display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "4px", width: 160
              }}
              onMouseLeave={() => setShowBorders(false)}
            >
              {[
                { v: "bottom", t: "Bottom\n━━━" },
                { v: "top", t: "Top\n━━━" },
                { v: "all", t: "All\n▣" },
                { v: "outside", t: "Outside\n▯" },
                { v: "none", t: "None\n✕" },
              ].map(({ v, t }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => applyParagraphBorder(v)}
                  style={{
                    padding: "0.35rem 0.5rem", fontSize: "0.7rem", background: "#fff",
                    border: "1px solid #e5e7eb", borderRadius: "4px", cursor: "pointer",
                    textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.3
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STYLES GROUP */}
      <div>
        <select
          value={blockType}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "paragraph") formatParagraph();
            else if (val === "quote") formatQuote();
            else if (val === "code") formatCodeBlock();
            else formatHeading(val);
          }}
          className="form-select"
          style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontWeight: "600" }}
        >
          <option value="paragraph">Normal Text</option>
          <option value="h1">Title (H1)</option>
          <option value="h2">Subtitle (H2)</option>
          <option value="h3">Heading 1</option>
          <option value="h4">Heading 2</option>
          <option value="h5">Heading 3</option>
          <option value="quote">Quote</option>
          <option value="code">Code Block</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={() => setShowFindReplace(!showFindReplace)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            padding: "0.3rem 0.65rem", fontSize: "0.78rem", fontWeight: "600",
            background: showFindReplace ? "#fef3c7" : "#ffffff",
            border: `1px solid ${showFindReplace ? "#f59e0b" : "#cbd5e1"}`,
            borderRadius: "5px", cursor: "pointer",
            color: showFindReplace ? "#92400e" : "#334155"
          }}
          title="Find & Replace (Ctrl+F)"
        >
          <LuSearch size={14} /> Find
        </button>
      </div>
    </>
  );
}
