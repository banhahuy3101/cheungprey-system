import { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, children, maxWidth = "680px", padding }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const prevOpen = useRef(false);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      const dialog = dialogRef.current;
      if (dialog) {
        const focusables = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const target = focusables[0] || dialog;
        target.focus();
      }
      prevOpen.current = true;
    } else {
      prevOpen.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "modalFadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          width: `min(${maxWidth}, 95%)`,
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
          animation: "modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #f1f5f9",
              background: "#fafafa",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{title}</h3>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: "1.2rem",
                transition: "all 0.15s",
              }}
            >
              ×
            </button>
          </div>
        ) : null}

        <div
          style={{
            padding: padding ?? (title ? "1.5rem" : "0"),
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
