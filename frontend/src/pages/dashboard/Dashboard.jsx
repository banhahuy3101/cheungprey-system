import { useState, useEffect } from "react";
import { LuUsers, LuUserCheck, LuBanknote, LuTrendingDown, LuWallet, LuFolderOpen } from "react-icons/lu";
import { partyAPI } from "../../api/party";
import { adminAPI } from "../../api/admin";
import { financesAPI } from "../../api/finances";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";
import { formatFMSUSD } from "../../utils/finances";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const showFinances = canAccess(user, FEATURES.finances);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === "admin" || user?.role === "super_admin") {
          const { data } = await adminAPI.getStatistics();
          let finances = null;
          if (showFinances) {
            try {
              const finRes = await financesAPI.getDashboard({ fiscal_year: new Date().getFullYear() });
              const dash = finRes.data?.data || finRes.data;
              finances = dash?.summary ? {
                total_income: dash.summary.total_income_usd,
                total_expense: dash.summary.total_expense_usd,
                balance: dash.summary.balance_usd,
                by_zone: [],
              } : null;
            } catch {
              //
            }
          }
          setStats({ ...data, finances });
        } else {
          const requests = [
            partyAPI.getMembers({ limit: 1 }),
            partyAPI.getVoters({ limit: 1 }),
          ];
          if (showFinances) {
            requests.push(financesAPI.getDashboard({ fiscal_year: new Date().getFullYear() }));
          }
          const results = await Promise.all(requests);
          let financeSummary = null;
          if (showFinances && results[2]) {
            const dash = results[2].data?.data || results[2].data;
            if (dash?.summary) {
              financeSummary = {
                total_income: dash.summary.total_income_usd,
                total_expense: dash.summary.total_expense_usd,
                balance: dash.summary.balance_usd,
                by_zone: [],
              };
            }
          }
          setStats({
            total_members: results[0].data?.total || 0,
            total_voters: results[1].data?.total || 0,
            finances: financeSummary,
          });
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchStats();
  }, [user, showFinances]);

  const fin = stats?.finances;

  const cards = [
    {
      label: "សមាជិក",
      value: stats?.total_members ?? stats?.members_count ?? "-",
      icon: LuUsers,
      color: "#4f46e5",
      bg: "#eef2ff",
    },
    {
      label: "អ្នកបោះឆ្នោត",
      value: stats?.total_voters ?? stats?.voters_count ?? "-",
      icon: LuUserCheck,
      color: "#059669",
      bg: "#ecfdf5",
    },
    ...(showFinances && fin ? [
      {
        label: "ចំណូលសរុប",
        value: formatFMSUSD(fin.total_income),
        icon: LuBanknote,
        color: "#059669",
        bg: "#ecfdf5",
      },
      {
        label: "ចំណាយសរុប",
        value: formatFMSUSD(fin.total_expense),
        icon: LuTrendingDown,
        color: "#dc2626",
        bg: "#fef2f2",
      },
      {
        label: "សមតុល្យ",
        value: formatFMSUSD(fin.balance),
        icon: LuWallet,
        color: fin.balance >= 0 ? "#4f46e5" : "#dc2626",
        bg: fin.balance >= 0 ? "#eef2ff" : "#fef2f2",
      },
    ] : []),
    {
      label: "ឯកសារ",
      value: stats?.total_files ?? stats?.files_count ?? "-",
      icon: LuFolderOpen,
      color: "#d97706",
      bg: "#fffbeb",
    },
  ];

  return (
    <div className="dashboard">
      <h2 className="section-title">
        សូមស្វាគមន៍, {user?.full_name || user?.name || user?.email}
      </h2>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <div className="stats-grid">
          {cards.map((card) => (
            <div key={card.label} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                <card.icon size={28} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{card.value}</span>
                <span className="stat-label">{card.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(user?.role === "admin" || user?.role === "super_admin") && stats?.users_by_role && (
        <div className="card mt-4">
          <h3>អ្នកប្រើប្រាស់តាមតួនាទី</h3>
          <table className="table">
            <thead>
              <tr>
                <th>តួនាទី</th>
                <th>ចំនួន</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.users_by_role).map(([role, count]) => (
                <tr key={role}>
                  <td>{role}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
