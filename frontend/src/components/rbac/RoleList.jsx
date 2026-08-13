import { LuTrash2 } from "react-icons/lu";

export default function RoleList({
  roles,
  selectedRole,
  setSelectedRole,
  canDeleteRole,
  setDeleteTarget,
}) {
  return (
    <div className="rbac-panel">
      <div className="rbac-panel-header">
        <h3 className="rbac-panel-title">តារាងតួនាទី (Roles List)</h3>
        <span className="rbac-pill">{roles.length}</span>
      </div>

      <div className="rbac-role-list">
        {roles.map((r) => {
          const active = selectedRole === r.role;
          const isCustom = !r.is_system;
          return (
            <div
              key={r.role}
              onClick={() => setSelectedRole(r.role)}
              className={`rbac-role-card ${active ? "active" : ""}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedRole(r.role);
                }
              }}
            >
              <div className="rbac-role-avatar">
                {(r.label || r.role)[0].toUpperCase()}
              </div>

              <div style={{ minWidth: 0 }}>
                <div className="rbac-role-name">
                  {r.label || r.role}
                </div>
                <div className="rbac-role-key">
                  <span>{r.role}</span>
                  {isCustom && <span> · Custom</span>}
                </div>
              </div>

              {isCustom && canDeleteRole && (
                <button
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(r);
                  }}
                  title="លុបតួនាទី"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                >
                  <LuTrash2 size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
