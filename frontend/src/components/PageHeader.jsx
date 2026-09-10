import { useNavigate, Link } from "react-router-dom";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";

/**
 * Global PageHeader Component for District Management System
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Main feature or page title
 * @param {string|React.ReactNode} props.subtitle - Optional description / subtitle
 * @param {React.ReactNode} props.icon - Optional header icon
 * @param {boolean|function|string} props.showBack - Show back button (boolean, onClick function, or route path string)
 * @param {string} props.backText - Label for back button (default: "ត្រឡប់ក្រោយ")
 * @param {React.ReactNode} props.actions - Actions slot rendered on the right side
 * @param {Array<{label: string, path?: string}>} props.breadcrumbs - Optional breadcrumbs array
 * @param {React.ReactNode} props.badge - Optional tag/badge element next to title
 * @param {string} props.className - Custom CSS class
 * @param {Object} props.style - Custom inline styles
 */
export default function PageHeader({
  title,
  subtitle,
  icon,
  showBack = false,
  backText = "ត្រឡប់ក្រោយ",
  actions,
  breadcrumbs,
  badge,
  className = "",
  style = {},
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof showBack === "function") {
      showBack();
    } else if (typeof showBack === "string") {
      navigate(showBack);
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={`page-header-global ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid var(--border, #e2e8f0)",
        ...style,
      }}
    >
      {/* Optional Breadcrumbs */}
      {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <nav
          className="page-breadcrumbs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.8rem",
            color: "var(--text-muted, #64748b)",
          }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                {idx > 0 && <LuChevronRight size={13} style={{ opacity: 0.5 }} />}
                {crumb.path && !isLast ? (
                  <Link
                    to={crumb.path}
                    style={{
                      color: "var(--primary, #1e3a8a)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: isLast ? "var(--text, #0f172a)" : "inherit", fontWeight: isLast ? 600 : 400 }}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* Main Header Content Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Left Side: Back Button + Icon + Title + Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: "1 1 auto", minWidth: 0 }}>
          {showBack && (
            <button
              type="button"
              className="btn-icon btn-back-header"
              onClick={handleBack}
              title={backText || "ត្រឡប់ក្រោយ"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                flexShrink: 0,
              }}
            >
              <LuArrowLeft size={18} />
            </button>
          )}

          {icon && !showBack && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary, #1e3a8a)",
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <h2
                className="section-title"
                style={{
                  margin: 0,
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  color: "#0f172a",
                  lineHeight: 1.25,
                }}
              >
                {title}
              </h2>
              {badge && <div>{badge}</div>}
            </div>

            {subtitle && (
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.83rem",
                  color: "#64748b",
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons / Slot */}
        {actions && (
          <div
            className="page-header-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonPageHeader({ showBreadcrumbs = true, showBack = true, actionsCount = 2, style = {} }) {
  return (
    <div
      className="page-header-global skeleton-page-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid var(--border, #e2e8f0)",
        ...style,
      }}
    >
      {showBreadcrumbs && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div style={{ width: "65px", height: "13px", borderRadius: "4px", background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#e2e8f0" }} />
          <div style={{ width: "80px", height: "13px", borderRadius: "4px", background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#e2e8f0" }} />
          <div style={{ width: "130px", height: "13px", borderRadius: "4px", background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: "1 1 auto", minWidth: 0 }}>
          {showBack && (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-pulse 1.5s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "240px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: "60px",
                  height: "20px",
                  borderRadius: "12px",
                  background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
            <div
              style={{
                width: "160px",
                height: "14px",
                borderRadius: "4px",
                background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {actionsCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {Array.from({ length: actionsCount }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === 0 ? "105px" : idx === 1 ? "80px" : "110px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

PageHeader.Skeleton = SkeletonPageHeader;
