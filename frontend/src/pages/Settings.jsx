import { useNavigate } from "react-router-dom";
import { LuCalendarRange, LuKeyRound, LuShield, LuTarget, LuWrench, LuFileText } from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { canAccess, FEATURES } from "../utils/permissions";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const items = [
    { key: FEATURES.performance_admin, icon: LuCalendarRange, title: "គ្រប់គ្រងរយៈពេល", desc: "បន្ថែម ឬលុបរយៈពេលសម្រាប់របាយការណ៍", path: "/settings/performance_period" },
    { key: FEATURES.performance_admin, icon: LuTarget, title: "គ្រប់គ្រង Performance", desc: "គ្រប់គ្រងដែន ចំណុចរង សូចនាករ និងរយៈពេល", path: "/settings/performance" },
    { key: FEATURES.users, icon: LuShield, title: "គ្រប់គ្រងអ្នកប្រើប្រាស់", desc: "បន្ថែម កែប្រែ ឬលុបអ្នកប្រើប្រាស់", path: "/settings/users" },
    { key: FEATURES.users, icon: LuKeyRound, title: "សិទ្ធិតួនាទី", desc: "កំណត់ feature allow/none សម្រាប់រដ្ឋបាលនីមួយៗ", path: "/settings/role-permissions" },
    { key: FEATURES.reports, icon: LuFileText, title: "គំរូរបាយការណ៍", desc: "បញ្ចូល និងគ្រប់គ្រងគំរូ .docx / .html សម្រាប់របាយការណ៍", path: "/settings/report-templates" },
    { key: FEATURES.technical, icon: LuWrench, title: "Technical", desc: "System settings — ពាក្យសម្ងាត់ដើម និងការកំណត់ប្រព័ន្ធ", path: "/settings/technical" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">ការកំណត់</h2>
      </div>

      <div className="settings-grid">
        {items.map((item) =>
          canAccess(user, item.key) && (
            <div key={item.path} className="card settings-nav-card" onClick={() => navigate(item.path)}>
              <div className="settings-nav-card-inner">
                <div className="settings-nav-icon">
                  <item.icon size={24} />
                </div>
                <div>
                  <div className="settings-nav-title">{item.title}</div>
                  <div className="settings-nav-desc">{item.desc}</div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
