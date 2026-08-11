import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuUsers, LuUserCheck, LuFolderOpen, LuFileText, LuActivity,
  LuTrendingUp, LuPlus, LuClock, LuMapPin, LuCalendar,
} from "react-icons/lu";
import { partyAPI } from "../../api/party";
import { adminAPI } from "../../api/admin";
import { membershipAPI } from "../../api/membership";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchAll = async () => {
      try {
        const isAdmin = user.role === "admin" || user.role === "super_admin";
        let mainStats;

        if (isAdmin) {
          const { data } = await adminAPI.getStatistics();
          mainStats = data?.data || data;
        } else {
          const [membersRes, votersRes] = await Promise.all([
            partyAPI.getMembers({ limit: 1 }),
            partyAPI.getVoters({ limit: 1 }),
          ]);
          mainStats = {
            total_members: membersRes.data?.total || 0,
            total_voters: votersRes.data?.total || 0,
          };
        }

        // Recent members
        let recentList = [];
        try {
          const res = await membershipAPI.search({ limit: 5, sort_by: "join_date", sort_order: "desc" });
          const data = res.data?.data || res.data;
          recentList = data.members || data || [];
        } catch {}

        setStats(mainStats);
        setRecent(recentList.slice(0, 5));
      } catch {} finally { setLoading(false); }
    };
    fetchAll();
  }, [user]);

  const today = new Date();
  const greeting = today.getHours() < 12 ? "អរុណសួស្តី" : today.getHours() < 18 ? "សួស្តី" : "រាត្រីសួស្តី";

  const statCards = [
    {
      label: "សមាជិកសរុប",
      value: stats?.total_members ?? stats?.members_count ?? 0,
      icon: <LuUsers size={22} />,
      color: "#4f46e5", bg: "#eef2ff",
    },
    {
      label: "អ្នកបោះឆ្នោត",
      value: stats?.total_voters ?? stats?.voters_count ?? 0,
      icon: <LuUserCheck size={22} />,
      color: "#059669", bg: "#ecfdf5",
    },
    {
      label: "ឯកសារ",
      value: stats?.total_files ?? stats?.files_count ?? 0,
      icon: <LuFolderOpen size={22} />,
      color: "#d97706", bg: "#fffbeb",
    },
    {
      label: "របាយការណ៍",
      value: stats?.reports_count ?? "-",
      icon: <LuFileText size={22} />,
      color: "#0891b2", bg: "#ecfeff",
    },
  ];

  const quickActions = [
    { label: "បន្ថែមសមាជិក", icon: <LuPlus size={18} />, to: "/membership/create", feature: FEATURES.membership_write, color: "#4f46e5" },
    { label: "ស្វែងរកសមាជិក", icon: <LuUsers size={18} />, to: "/membership", feature: FEATURES.members, color: "#059669" },
    { label: "បង្កើតរបាយការណ៍", icon: <LuFileText size={18} />, to: "/reports", feature: FEATURES.reports, color: "#d97706" },
    { label: "បញ្ចូលលទ្ធផល", icon: <LuTrendingUp size={18} />, to: "/performance", feature: FEATURES.performance, color: "#0891b2" },
  ];

  if (loading) {
    return (
      <div style={{ padding: "1.5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ width: 200, height: 24, borderRadius: 6, background: "#e2e8f0", animation: "pulse 1.5s infinite" }} />
          <div style={{ width: 140, height: 16, borderRadius: 4, background: "#f1f5f9", marginTop: "0.5rem", animation: "pulse 1.5s infinite" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.85rem", marginBottom: "1.5rem" }}>
          {[1,2,3,4].map((i) => (
            <div key={i} style={{ height: 100, borderRadius: 14, background: "#f8fafc", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Welcome */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
          {greeting}, {user?.full_name || user?.name || user?.email}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
          <LuCalendar size={14} style={{ color: "#94a3b8" }} />
          <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
            {today.toLocaleDateString("km-KH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
          {user?.zone_code && (
            <>
              <span style={{ color: "#cbd5e1" }}>·</span>
              <LuMapPin size={14} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{user.zone_code}</span>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.85rem", marginBottom: "1.5rem" }}>
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff", borderRadius: 16, padding: "1.15rem",
              border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              display: "flex", alignItems: "center", gap: "0.85rem",
              transition: "transform 0.15s, box-shadow 0.15s",
              cursor: "default",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 13,
              background: s.bg, color: s.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", lineHeight: 1, marginBottom: "0.15rem" }}>
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </div>
              <div style={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {quickActions.map((a) =>
          canAccess(user, a.feature) ? (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              style={{
                display: "flex", alignItems: "center", gap: "0.45rem",
                padding: "0.5rem 0.9rem", borderRadius: 10,
                border: `1.5px solid ${a.color}20`, background: `${a.color}08`,
                color: a.color, fontWeight: 600, fontSize: "0.8rem",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${a.color}18`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${a.color}08`; }}
            >
              {a.icon} {a.label}
            </button>
          ) : null
        )}
      </div>

      {/* Main Grid: Recent Members + User Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.85rem" }}>
        {/* Recent Members */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ padding: "0.9rem 1.15rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuClock size={16} style={{ color: "#94a3b8" }} />
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>សមាជិកថ្មីៗ</span>
            </div>
            <button
              onClick={() => navigate("/membership")}
              style={{ fontSize: "0.75rem", color: "#4f46e5", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
            >
              មើលទាំងអស់ →
            </button>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
              <LuUsers size={32} style={{ opacity: 0.2, marginBottom: "0.5rem" }} />
              <div>មិនទាន់មានសមាជិក</div>
            </div>
          ) : (
            recent.map((m, i) => (
              <div
                key={m.id || i}
                onClick={() => navigate(`/membership/${m.id}`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.6rem 1.15rem", borderBottom: "1px solid #f8fafc",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `hsl(${220 + i * 40}, 70%, 60%)`,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                  }}>
                    {(m.last_name_kh || "?")[0]}{(m.first_name_kh || "")[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "#0f172a" }}>
                      {m.last_name_kh} {m.first_name_kh}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                      {m.membership_card_no} · {m.party_role || "Member"}
                    </div>
                  </div>
                </div>
                <span className={`badge ${m.status === "Active" ? "badge-success" : m.status === "Pending" ? "badge-info" : "badge"}`} style={{ fontSize: "0.7rem" }}>
                  {m.status === "Active" ? "សកម្ម" : m.status === "Pending" ? "រង់ចាំ" : m.status}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Admin Stats */}
        {(user?.role === "admin" || user?.role === "super_admin") && stats?.users_by_role ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "0.9rem 1.15rem", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LuUsers size={16} style={{ color: "#4f46e5" }} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>អ្នកប្រើប្រាស់</span>
              </div>
            </div>
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <div key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 1.15rem", borderBottom: "1px solid #f8fafc" }}>
                <span style={{ fontSize: "0.82rem", color: "#334155", fontWeight: 500 }}>{role}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "0.15rem 0.55rem", borderRadius: 8 }}>{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "1.15rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>ព័ត៌មានគណនី</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
              <div style={{ marginBottom: "0.3rem" }}>តួនាទី: <strong style={{ color: "#0f172a" }}>{user?.role || "—"}</strong></div>
              <div>តំបន់: <strong style={{ color: "#0f172a" }}>{user?.zone_code || "—"}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
