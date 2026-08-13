import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import {
  LuLayoutDashboard,
  LuUsers,
  LuFolderOpen,
  LuFileText,
  LuScrollText,
  LuTrendingUp,
  LuSettings,
  LuMenu,
  LuLogOut,
  LuUser,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { canAccess, FEATURES } from "../utils/permissions";
import { useRoleOptions } from "../hooks/useRoleOptions";

const mainNavItems = [
  { to: "/", icon: LuLayoutDashboard, label: "ទំព័រដើម", end: true, feature: FEATURES.dashboard, module: "dashboard" },
  { to: "/membership", icon: LuUsers, label: "សមាជិក", feature: FEATURES.members, module: "membership" },
  { to: "/files", icon: LuFolderOpen, label: "ឯកសារ", feature: FEATURES.files, module: "files" },
  { to: "/records", icon: LuFileText, label: "កំណត់ត្រា", feature: FEATURES.records, module: "records" },
  { to: "/reports", icon: LuScrollText, label: "របាយការណ៍", feature: FEATURES.reports, module: "reports" },
  { to: "/performance", icon: LuTrendingUp, label: "លទ្ធផលការងារ", feature: FEATURES.performance, module: "performance" },
];

const settingsNavItem = {
  to: "/settings",
  icon: LuSettings,
  label: "ការកំណត់",
  feature: FEATURES.settings,
  module: "settings",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { isEnabled } = useModules();
  const { roleLabelMap } = useRoleOptions();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredMainNav = mainNavItems.filter(
    (item) => canAccess(user, item.feature) && isEnabled(item.module)
  );
  const showSettings = canAccess(user, settingsNavItem.feature) && isEnabled(settingsNavItem.module);

  const roleLabel = user?.roles?.length
    ? user.roles.map((r) => roleLabelMap[r] || r).join(", ")
    : roleLabelMap[user?.role] || user?.role || "";

  return (
    <div className="layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h2>ស.ជើងព្រៃ</h2>
          <span>ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ</span>
        </div>

        <nav className="sidebar-nav">
          {filteredMainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {showSettings && (
            <NavLink
              to={settingsNavItem.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <settingsNavItem.icon className="nav-icon" />
              <span>{settingsNavItem.label}</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div
            className="user-info"
            onClick={() => { navigate("/profile"); setSidebarOpen(false); }}
            title="មើលប្រវត្តិរូប"
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.2rem", cursor: "pointer", width: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: "700", fontSize: "0.88rem", color: "#ffffff" }}>
              <LuUser className="nav-icon" style={{ flexShrink: 0 }} />
              <span>{user?.full_name || user?.name || user?.email || "User"}</span>
            </div>
            {roleLabel && (
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", paddingLeft: "1.35rem", fontWeight: "500" }}>
                {roleLabel}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="btn-logout" style={{ marginTop: "0.6rem" }}>
            <LuLogOut />
            <span>ចាកចេញ</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
          >
            <LuMenu size={24} />
          </button>
          <h3 className="page-title">ប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ</h3>
          <div className="topbar-right">
            <span className="user-role">{roleLabel}</span>
          </div>
        </header>
        <div className="content-area">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
