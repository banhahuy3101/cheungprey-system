import { useState, useEffect } from "react";
import { LuUsers, LuUserCheck, LuFolderOpen } from "react-icons/lu";
import { partyAPI } from "../../api/party";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === "admin" || user?.role === "super_admin") {
          const { data } = await adminAPI.getStatistics();
          setStats(data);
        } else {
          const requests = [
            partyAPI.getMembers({ limit: 1 }),
            partyAPI.getVoters({ limit: 1 }),
          ];
          const results = await Promise.all(requests);
          setStats({
            total_members: results[0].data?.total || 0,
            total_voters: results[1].data?.total || 0,
          });
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchStats();
  }, [user]);

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
