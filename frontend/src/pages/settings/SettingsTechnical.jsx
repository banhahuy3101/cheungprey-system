import { useNavigate } from "react-router-dom";
import { LuSettings, LuSettings2, LuWrench } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";

export default function SettingsTechnical() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <PageHeader
        showBack={() => navigate("/settings")}
        title="Technical Settings"
        subtitle="គ្រប់គ្រងការកំណត់បច្ចេកទេស និងការគ្រប់គ្រងម៉ូឌុលប្រព័ន្ធ"
        icon={<LuWrench size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "បច្ចេកទេស" },
        ]}
      />

      <div className="settings-grid">
        <div
          className="card settings-nav-card"
          onClick={() => navigate("/settings/technical/system")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/settings/technical/system")}
        >
          <div className="settings-nav-card-inner">
            <div className="settings-nav-icon">
              <LuSettings size={24} />
            </div>
            <div>
              <div className="settings-nav-title">System Settings</div>
              <div className="settings-nav-desc">
                System settings — ពាក្យសម្ងាត់ដើម និងការកំណត់ប្រព័ន្ធ
              </div>
            </div>
          </div>
        </div>

        <div
          className="card settings-nav-card"
          onClick={() => navigate("/settings/modules/workflow")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/settings/modules/workflow")}
        >
          <div className="settings-nav-card-inner">
            <div className="settings-nav-icon">
              <LuSettings2 size={24} />
            </div>
            <div>
              <div className="settings-nav-title">ការគ្រប់គ្រងម៉ូឌុល</div>
              <div className="settings-nav-desc">
                Enable/disable modules, configure approval workflows
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
