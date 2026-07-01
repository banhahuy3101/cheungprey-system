import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import {
  LuLayoutDashboard,
  LuUsers,
  LuUserCheck,
  LuBanknote,
  LuFolderOpen,
  LuFileText,
  LuScrollText,
  LuShield,
  LuTrendingUp,
  LuSettings,
  LuMenu,
  LuLogOut,
  LuUser,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { canAccess, FEATURES } from "../utils/permissions";

const navItems = [
  { to: "/", icon: LuLayoutDashboard, label: "ទំព័រដើម", end: true, feature: FEATURES.dashboard },
  { to: "/members", icon: LuUsers, label: "សមាជិក", feature: FEATURES.members },
  { to: "/voters", icon: LuUserCheck, label: "អ្នកបោះឆ្នោត", feature: FEATURES.voters },
  { to: "/finances", icon: LuBanknote, label: "ហិរញ្ញវត្ថុ", feature: FEATURES.finances },
  { to: "/files", icon: LuFolderOpen, label: "ឯកសារ", feature: FEATURES.files },
  { to: "/records", icon: LuFileText, label: "កំណត់ត្រា", feature: FEATURES.records },
  { to: "/reports", icon: LuScrollText, label: "របាយការណ៍", feature: FEATURES.reports },
  { to: "/performance", icon: LuTrendingUp, label: "លទ្ធផលការងារ", feature: FEATURES.performance },
  { to: "/settings", icon: LuSettings, label: "ការកំណត់", feature: FEATURES.settings },
  { to: "/admin", icon: LuShield, label: "គ្រប់គ្រង", feature: FEATURES.users },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter((item) => canAccess(user, item.feature));

  const roleLabel = user?.roles?.length
    ? user.roles.join(", ")
    : user?.role || "";

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
          {filteredNav.map((item) => (
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
        </nav>

        <div className="sidebar-footer">
          <div
            className="user-info"
            onClick={() => { navigate("/profile"); setSidebarOpen(false); }}
            title="មើលប្រវត្តិរូប"
          >
            <LuUser className="nav-icon" />
            <span>{user?.full_name || user?.name || user?.email || "User"}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
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
