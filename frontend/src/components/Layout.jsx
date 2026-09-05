import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import * as Icons from "react-icons/lu";
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
  LuFolder,
  LuChevronDown,
  LuChevronsLeft,
  LuChevronsRight,
  LuLayoutGrid,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { canAccess, FEATURES } from "../utils/permissions";
import { useRoleOptions } from "../hooks/useRoleOptions";
import { menuItemsAPI } from "../api/menuItems";
import cacheService, { CACHE_KEYS } from "../services/cacheService";

function DynamicIcon({ name }) {
  const IconComp = name && Icons[name] ? Icons[name] : LuFolder;
  return <IconComp className="nav-icon" style={{ flexShrink: 0 }} />;
}

function resolveFeatureKey(key) {
  if (!key) return "";
  let clean = key.replace(/^feature_/, "");
  if (clean === "membership") return "members";
  return clean;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { isEnabled } = useModules();
  const { roleLabelMap } = useRoleOptions();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => cacheService.get(CACHE_KEYS.SIDEBAR_COLLAPSED, false) === true);
  const [menuTree, setMenuTree] = useState(() => cacheService.getMenuItems());
  const [loadingMenu, setLoadingMenu] = useState(() => cacheService.getMenuItems().length === 0);
  const [openSubMenus, setOpenSubMenus] = useState({});

  useEffect(() => {
    let mounted = true;
    const initialItems = cacheService.getMenuItems();
    if (initialItems.length === 0) {
      setLoadingMenu(true);
    }

    (async () => {
      try {
        const res = await menuItemsAPI.getTree();
        const data = res.data?.data || res.data || [];
        if (mounted && Array.isArray(data) && data.length > 0) {
          let topLevel = data.filter((item) => !item.parent_id);
          const hasSponsorships = topLevel.some(
            (item) => item.path === "/sponsorships" || item.module_key === "sponsorships"
          );
          if (!hasSponsorships) {
            topLevel.push({
              id: "sponsorships-module-nav",
              title: "តារាងឧបសម្ព័ន្ធ ថវិកា សម្ភារ",
              title_en: "Sponsorships & Materials",
              module_key: "sponsorships",
              feature_key: "sponsorships",
              path: "/sponsorships",
              icon: "LuScrollText",
              sort_order: 45,
              is_active: true,
              is_visible: true,
            });
            topLevel.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
          setMenuTree(topLevel);
          cacheService.setMenuItems(topLevel);
        }
      } catch {
        if (mounted && initialItems.length === 0) {
          setMenuTree([]);
        }
      } finally {
        if (mounted) setLoadingMenu(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      cacheService.set(CACHE_KEYS.SIDEBAR_COLLAPSED, next);
      return next;
    });
  };

  const toggleSubMenu = (itemId) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const checkModuleEnabled = (item) => {
    if (item.module_key && !isEnabled(item.module_key)) return false;
    if (item.module_key === "settings" && item.sub_module) {
      if (item.sub_module === "report_templates" && !isEnabled("reports")) return false;
      if ((item.sub_module === "performance_period" || item.sub_module === "performance") && !isEnabled("performance")) return false;
      if (item.sub_module === "zone_chiefs" && !isEnabled("zone_chiefs")) return false;
    }
    return true;
  };

  const filteredNav = loadingMenu
    ? []
    : menuTree.filter((item) => {
      if (item.is_active === false || item.is_visible === false) return false;
      const fKey = resolveFeatureKey(item.feature_key);
      const hasPerm = !fKey || canAccess(user, fKey);
      const hasMod = checkModuleEnabled(item);
      return hasPerm && hasMod;
    });

  const roleLabel = user?.roles?.length
    ? user.roles.map((r) => roleLabelMap[r] || r).join(", ")
    : roleLabelMap[user?.role] || user?.role || "";

  return (
    <div className="layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar - Always rendered with solid background */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div>
            <h2 style={{ margin: 0 }}>ប្រព័ន្ធគ្រប់គ្រង</h2>
            <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>District Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {filteredNav.map((item) => {
            const validChildren = (item.children || []).filter((child) => {
              if (child.is_active === false || child.is_visible === false) return false;
              const fKey = resolveFeatureKey(child.feature_key);
              const hasPerm = !fKey || canAccess(user, fKey);
              const hasMod = checkModuleEnabled(child);
              return hasPerm && hasMod;
            });

            const hasChildren = validChildren.length > 0;
            const isChildActive = validChildren.some((c) => location.pathname === c.path || (c.path !== "/" && location.pathname.startsWith(c.path)));
            const isOpen = openSubMenus[item.id] !== undefined ? openSubMenus[item.id] : isChildActive;

            if (hasChildren) {
              return (
                <div key={item.id || item.path} className="nav-group">
                  <div
                    className={`nav-link nav-group-header ${isChildActive ? "active" : ""}`}
                    onClick={() => toggleSubMenu(item.id)}
                    title={collapsed ? item.title : undefined}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <DynamicIcon name={item.icon} />
                      <span>{item.title}</span>
                    </div>
                    <LuChevronDown
                      size={16}
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        opacity: 0.7
                      }}
                    />
                  </div>

                  {isOpen && (
                    <div className="nav-sub-items" style={{ paddingLeft: "1rem", marginTop: "0.15rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      {validChildren.map((child) => (
                        <NavLink
                          key={child.id || child.path}
                          to={child.path || "/"}
                          end={!(child.children && child.children.length > 0)}
                          title={collapsed ? child.title : undefined}
                          className={({ isActive }) =>
                            `nav-link nav-sub-link ${isActive ? "active" : ""}`
                          }
                          onClick={() => setSidebarOpen(false)}
                          style={{ fontSize: "0.82rem", padding: "0.4rem 0.75rem", borderLeft: "2px solid rgba(255,255,255,0.15)" }}
                        >
                          <DynamicIcon name={child.icon} />
                          <span>{child.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.id || item.path}
                to={item.path || "/"}
                end={item.path === "/"}
                title={collapsed ? item.title : undefined}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <DynamicIcon name={item.icon} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
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

      <main className={`main-content ${collapsed ? "collapsed" : ""}`}>
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="បើកម៉ឺនុយ"
          >
            <LuMenu size={22} />
          </button>

          <button
            type="button"
            className="btn-icon sidebar-collapse-btn desktop-only"
            onClick={toggleCollapsed}
            title={collapsed ? "ពង្រីកម៉ឺនុយ (បង្ហាញចំណងជើង)" : "សម្រួលម៉ឺនុយ (បង្ហាញតែរូបតំណាង)"}
            style={{
              alignItems: "center",
              justifyContent: "center",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "0.4rem",
              cursor: "pointer",
              color: "#334155",
              transition: "all 0.15s ease",
            }}
          >
            {collapsed ? <LuChevronsRight size={18} /> : <LuChevronsLeft size={18} />}
          </button>

          <h3 className="page-title">District Management System</h3>

          <div className="topbar-right">
            <span className="user-role" title={roleLabel}>{roleLabel}</span>
          </div>
        </header>

        <div className="content-area">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar - Always rendered on mobile */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {(filteredNav.length > 4 ? filteredNav.slice(0, 4) : filteredNav).map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isItemActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.id || item.path}
              to={item.path || "/"}
              end={!hasChildren && item.path === "/"}
              className={({ isActive }) =>
                `mobile-bottom-nav-item ${isActive || isItemActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <div className="mobile-nav-icon-wrapper">
                <DynamicIcon name={item.icon} />
              </div>
              <span className="mobile-nav-label">{item.title}</span>
            </NavLink>
          );
        })}

        {filteredNav.length > 4 && (
          <button
            type="button"
            className={`mobile-bottom-nav-item ${sidebarOpen ? "active" : ""}`}
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="ម៉ឺនុយបន្ថែម"
          >
            <div className="mobile-nav-icon-wrapper">
              <LuLayoutGrid size={20} />
            </div>
            <span className="mobile-nav-label">ម៉ឺនុយ</span>
          </button>
        )}
      </nav>
    </div>
  );
}
