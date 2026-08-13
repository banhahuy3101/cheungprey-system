import { LuShield, LuUserCheck } from "react-icons/lu";

export default function RbacFlow({ navigate, active }) {
  return (
    <div className="rbac-flow" aria-label="RBAC workflow">
      <button type="button" className={`rbac-flow-item ${active === "users" ? "active" : ""}`} onClick={() => navigate("/settings/users")}>
        <LuUserCheck size={17} /> Users
      </button>
      <button type="button" className={`rbac-flow-item ${active === "roles" ? "active" : ""}`} onClick={() => navigate("/settings/role-permissions")}>
        <LuShield size={17} /> Roles &amp; Permissions
      </button>
    </div>
  );
}
