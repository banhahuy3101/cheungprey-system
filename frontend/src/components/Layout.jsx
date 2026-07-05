import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import {
  LuLayoutDashboard,
  LuUsers,
  LuUserCheck,
  LuBanknote,
  LuFolderOpen,
  LuFileText,
  LuScrollText,
  LuTrendingUp,
  LuSettings,
  LuMenu,
  LuLogOut,
  LuUser,
  LuChevronDown,
  LuTrendingDown,
  LuBookOpen,
  LuChartLine,
  LuListOrdered,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { canAccess, FEATURES } from "../utils/permissions";

const mainNavItems = [
  { to: "/", icon: LuLayoutDashboard, label: "ទំព័រដើម", end: true, feature: FEATURES.dashboard },
  { to: "/members", icon: LuUsers, label: "សមាជិក", feature: FEATURES.members },
  { to: "/voters", icon: LuUserCheck, label: "អ្នកបោះឆ្នោត", feature: FEATURES.voters },
  { to: "/files", icon: LuFolderOpen, label: "ឯកសារ", feature: FEATURES.files },
  { to: "/records", icon: LuFileText, label: "កំណត់ត្រា", feature: FEATURES.records },
  { to: "/reports", icon: LuScrollText, label: "របាយការណ៍", feature: FEATURES.reports },
  { to: "/performance", icon: LuTrendingUp, label: "លទ្ធផលការងារ", feature: FEATURES.performance },
];

const settingsNavItem = {
  to: "/settings",
  icon: LuSettings,
  label: "ការកំណត់",
  feature: FEATURES.settings,
};

const financeSubItems = [
  { to: "/finances/dashboard", icon: LuChartLine, label: "ផ្ទាំងគ្រប់គ្រង" },
  { to: "/finances/income", icon: LuTrendingUp, label: "ចំណូល" },
  { to: "/finances/expense", icon: LuTrendingDown, label: "ចំណាយ" },
  { to: "/finances/coa", icon: LuListOrdered, label: "តារាងគណនី" },
  { to: "/finances/budgets", icon: LuBookOpen, label: "ថវិកា" },
];

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(location.pathname.startsWith("/finances"));

  useEffect(() => {
    if (location.pathname.startsWith("/finances")) {
      setFinanceOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredMainNav = mainNavItems.filter((item) => canAccess(user, item.feature));
  const showFinance = canAccess(user, FEATURES.finances);
  const showSettings = canAccess(user, settingsNavItem.feature);

  const roleLabel = user?.roles?.length
    ? user.roles.join(", ")
    : user?.role || "";

  const toggleFinance = () => {
    setFinanceOpen((open) => !open);
    if (!location.pathname.startsWith("/finances")) {
      navigate("/finances/dashboard");
    }
  };

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

          {showFinance && (
            <div className="nav-group">
              <button
                type="button"
                className={`nav-link nav-group-toggle ${location.pathname.startsWith("/finances") ? "active" : ""}`}
                onClick={toggleFinance}
                aria-expanded={financeOpen}
              >
                <LuBanknote className="nav-icon" />
                <span className="nav-group-label">ហិរញ្ញវត្ថុ</span>
                <LuChevronDown className={`nav-chevron ${financeOpen ? "open" : ""}`} />
              </button>
              {financeOpen && (
                <div className="nav-sub">
                  {financeSubItems.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      className={({ isActive }) =>
                        `nav-link nav-sublink ${isActive ? "active" : ""}`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <sub.icon className="nav-icon" />
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

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
            {loading ? (
              <div className="loading">កំពុងផ្ទុក...</div>
            ) : (
              <Outlet />
            )}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
