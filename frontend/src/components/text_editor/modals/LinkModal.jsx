import { useState, useEffect } from "react";
import { LuLink, LuX } from "react-icons/lu";

export function LinkModal({
  isOpen,
  onClose,
  initialText = "",
  onApply,
}) {
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setUrl("https://");
      setText(initialText || "");
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (url && url !== "https://") {
      onApply(url, text || url);
      onClose();
    }
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
            <LuLink size={17} /> Insert Link (បញ្ចូលតំណភ្ជាប់)
          </div>
          <button type="button" className="btn-icon" title="Close" onClick={onClose} style={{ width: 30, height: 30 }}>
            <LuX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "grid", gap: "0.85rem" }}>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
            Link URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              style={{ padding: "0.6rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem" }}
              autoFocus
              required
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
            Display Text (អត្ថបទបង្ហាញ)
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Display text..."
              style={{ padding: "0.6rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.88rem" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Insert Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
