import { useEffect } from "react";
import { LuX } from "react-icons/lu";

export default function FormModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "680px",
  padding = "1.5rem",
  onSubmit,
  saving = false,
  submitText = "រក្សាទុក",
  cancelText = "បិទ",
  error = "",
  success = "",
  leftActions,
  rightActions,
  showFooter = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="modal-body">{children}</div>

      {showFooter && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div>{leftActions}</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {rightActions}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {cancelText}
            </button>
            {onSubmit && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "កំពុងរក្សាទុក..." : submitText}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        style={{
          width: `min(${maxWidth}, 95%)`,
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          animation: "modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700, color: "#0f172a" }}>{title}</h3>
            {subtitle && (
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              transition: "all 0.15s",
            }}
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div
          style={{
            padding: padding,
            overflowY: "auto",
          }}
        >
          {onSubmit ? <form onSubmit={onSubmit}>{content}</form> : content}
        </div>
      </div>
    </div>
  );
}
