import { LuShield, LuShieldCheck, LuKey } from "react-icons/lu";

export default function RoleMetrics({ roles }) {
  const customRoles = roles.filter((r) => !r.is_system);

  return (
    <div className="rbac-metric-grid">
      <div className="rbac-metric">
        <div className="rbac-metric-icon">
          <LuShield size={22} />
        </div>
        <div>
          <div className="rbac-metric-value">{roles.length}</div>
          <div className="rbac-metric-label">តួនាទីសរុប (DB Roles)</div>
        </div>
      </div>

      <div className="rbac-metric">
        <div className="rbac-metric-icon">
          <LuShieldCheck size={22} />
        </div>
        <div>
          <div className="rbac-metric-value">{roles.filter((r) => r.is_system).length}</div>
          <div className="rbac-metric-label">តួនាទីដើមប្រព័ន្ធ (System)</div>
        </div>
      </div>

      <div className="rbac-metric">
        <div className="rbac-metric-icon">
          <LuKey size={22} />
        </div>
        <div>
          <div className="rbac-metric-value">{customRoles.length}</div>
          <div className="rbac-metric-label">តួនាទីបង្កើតបន្ថែម (Custom)</div>
        </div>
      </div>
    </div>
  );
}
