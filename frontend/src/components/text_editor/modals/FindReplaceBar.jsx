import { LuX } from "react-icons/lu";

export function FindReplaceBar({
  showFindReplace,
  setShowFindReplace,
  findText,
  setFindText,
  replaceText,
  setReplaceText,
  onFindNext,
  onReplaceOne,
  onReplaceAll,
}) {
  if (!showFindReplace) return null;

  return (
    <div style={{ background: "#fef3c7", borderTop: "2px solid #f59e0b", padding: "0.55rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
      <input
        placeholder="Find..."
        value={findText}
        onChange={(e) => setFindText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onFindNext();
        }}
        style={{ width: 200, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #d97706", borderRadius: "4px" }}
        autoFocus
      />
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "#fff", border: "1px solid #d1d5db", fontSize: "0.78rem" }}
        onClick={onFindNext}
      >
        Find Next
      </button>
      <input
        placeholder="Replace..."
        value={replaceText}
        onChange={(e) => setReplaceText(e.target.value)}
        style={{ width: 200, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
      />
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "#fff", border: "1px solid #d1d5db", fontSize: "0.78rem" }}
        onClick={onReplaceOne}
      >
        Replace
      </button>
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "#fff", border: "1px solid #d1d5db", fontSize: "0.78rem" }}
        onClick={onReplaceAll}
      >
        Replace All
      </button>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        className="btn-icon btn-sm"
        onClick={() => setShowFindReplace(false)}
        style={{ border: "none", color: "#92400e" }}
      >
        <LuX size={14} />
      </button>
    </div>
  );
}
