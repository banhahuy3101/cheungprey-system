import { LuMaximize2, LuMinimize2 } from "react-icons/lu";

export function WordStatusBar({
  pageCount,
  stats,
  zoomLevel,
  isFullscreen,
  setIsFullscreen,
}) {
  return (
    <div style={{ background: "#f8fafc", borderTop: "1px solid #cbd5e1", padding: "0.35rem 1rem", fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "1.25rem" }}>
        <span>Page 1 of {pageCount}</span>
        <span>Words: {stats.words}</span>
        <span>Characters: {stats.chars}</span>
      </div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span>English / Khmer</span>
        <span>{Math.round(zoomLevel * 100)}%</span>
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            background: isFullscreen ? "#cbd5e1" : "transparent",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            color: "#334155",
            cursor: "pointer",
            padding: "2px 6px",
            fontSize: "0.72rem",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
          title={isFullscreen ? "Exit Full Frame (Esc)" : "Full Page Frame"}
        >
          {isFullscreen ? <LuMinimize2 size={13} /> : <LuMaximize2 size={13} />}
          <span>{isFullscreen ? "Exit Fullscreen" : "Full Frame"}</span>
        </button>
      </div>
    </div>
  );
}
