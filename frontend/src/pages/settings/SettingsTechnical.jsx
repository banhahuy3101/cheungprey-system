import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuSettings, LuSettings2 } from "react-icons/lu";

export default function SettingsTechnical() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">Technical</h2>
        </div>
      </div>

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
          onClick={() => navigate("/settings/modules")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/settings/modules")}
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
