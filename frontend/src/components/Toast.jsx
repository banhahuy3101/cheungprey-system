import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { LuCheck, LuX, LuInfo } from "react-icons/lu";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg) => addToast(msg, "error", 5000), [addToast]);
  const info = useCallback((msg) => addToast(msg, "info"), [addToast]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: LuCheck,
    error: LuX,
    info: LuInfo,
  };
  const colors = {
    success: { bg: "#ecfdf5", border: "#059669", icon: "#059669", text: "#065f46" },
    error: { bg: "#fef2f2", border: "#dc2626", icon: "#dc2626", text: "#991b1b" },
    info: { bg: "#eff6ff", border: "#3b82f6", icon: "#3b82f6", text: "#1e40af" },
  };

  const showToast = useCallback((msg, type = "success") => {
    if (type === "error") {
      error(msg);
    } else if (type === "info") {
      info(msg);
    } else {
      success(msg);
    }
  }, [success, error, info]);

  const contextValue = useMemo(
    () => ({ success, error, info, showToast, addToast }),
    [success, error, info, showToast, addToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div style={{
        position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
        display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "400px",
      }}>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              style={{
                background: c.bg, border: `1px solid ${c.border}`, borderRadius: "10px",
                padding: "0.75rem 1rem", display: "flex", alignItems: "flex-start", gap: "0.6rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)", animation: "slideIn 0.25s ease",
              }}
            >
              <Icon size={18} color={c.icon} style={{ marginTop: "0.1rem", flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", color: c.text, lineHeight: 1.4, flex: 1 }}>{t.message}</span>
              <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <LuX size={14} color={c.text} opacity={0.5} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
