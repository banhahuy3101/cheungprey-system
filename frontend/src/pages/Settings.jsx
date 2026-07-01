import { useNavigate } from "react-router-dom";
import { LuCalendarRange, LuKeyRound, LuShield, LuTarget, LuWrench } from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { canAccess, FEATURES } from "../utils/permissions";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">ការកំណត់</h2>
      </div>

      {canAccess(user, FEATURES.performance_admin) && (
      <div className="card" style={{ cursor: "pointer", marginBottom: "0.75rem" }} onClick={() => navigate("/settings/performance_period")}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 0" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--primary)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.25rem", flexShrink: 0
          }}>
            <LuCalendarRange size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>គ្រប់គ្រងរយៈពេល</div>
            <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.2rem" }}>
              បន្ថែម ឬលុបរយៈពេលសម្រាប់របាយការណ៍
            </div>
          </div>
        </div>
      </div>
      )}

      {canAccess(user, FEATURES.performance_admin) && (
      <div className="card" style={{ cursor: "pointer", marginBottom: "0.75rem" }} onClick={() => navigate("/settings/performance")}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 0" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--primary)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.25rem", flexShrink: 0
          }}>
            <LuTarget size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>គ្រប់គ្រង Performance</div>
            <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.2rem" }}>
              គ្រប់គ្រងដែន ចំណុចរង សូចនាករ និងរយៈពេល
            </div>
          </div>
        </div>
      </div>
      )}

      {canAccess(user, FEATURES.users) && (
      <div className="card settings-nav-card" style={{ marginBottom: "0.75rem" }} onClick={() => navigate("/settings/users")}>
        <div className="settings-nav-card-inner">
          <div className="settings-nav-icon">
            <LuShield size={24} />
          </div>
          <div>
            <div className="settings-nav-title">គ្រប់គ្រងអ្នកប្រើប្រាស់</div>
            <div className="settings-nav-desc">
              បន្ថែម កែប្រែ ឬលុបអ្នកប្រើប្រាស់
            </div>
          </div>
        </div>
      </div>
      )}

      {canAccess(user, FEATURES.users) && (
      <div className="card settings-nav-card" style={{ marginBottom: "0.75rem" }} onClick={() => navigate("/settings/role-permissions")}>
        <div className="settings-nav-card-inner">
          <div className="settings-nav-icon">
            <LuKeyRound size={24} />
          </div>
          <div>
            <div className="settings-nav-title">សិទ្ធិតួនាទី</div>
            <div className="settings-nav-desc">
              កំណត់ feature allow/none សម្រាប់រដ្ឋបាលនីមួយៗ
            </div>
          </div>
        </div>
      </div>
      )}

      {canAccess(user, FEATURES.technical) && (
      <div className="card settings-nav-card" onClick={() => navigate("/settings/technical")}>
        <div className="settings-nav-card-inner">
          <div className="settings-nav-icon settings-nav-icon-muted">
            <LuWrench size={24} />
          </div>
          <div>
            <div className="settings-nav-title">Technical</div>
            <div className="settings-nav-desc">
              System settings — ពាក្យសម្ងាត់ដើម និងការកំណត់ប្រព័ន្ធ
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
