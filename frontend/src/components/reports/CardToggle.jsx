export default function CardToggle({ open, onToggle, title }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      style={{
        position: "absolute",
        top: "12px",
        right: "12px",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: "26px", height: "26px", borderRadius: "50%",
        background: open ? "#eff6ff" : "#f1f5f9",
        color: open ? "#1d4ed8" : "#64748b",
        fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
        border: open ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
        padding: 0,
      }}
    >
      {open ? "−" : "+"}
    </button>
  );
}
