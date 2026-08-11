import { useState, useEffect } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";

export default function MembershipStats({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    membershipAPI.getStats().then((res) => {
      setStats(res.data?.data || res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;
  if (!stats) return <div className="page"><div className="loading">គ្មានទិន្នន័យ</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">ស្ថិតិសមាជិក</h2>
        </div>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total_members}</div>
          <div className="stat-label">សមាជិកសរុប</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats.active_members}</div>
          <div className="stat-label">សកម្ម</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.total_dues_collected || 0}</div>
          <div className="stat-label">បង់រំលោះសរុប</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.new_this_month || 0}</div>
          <div className="stat-label">ថ្មីខែនេះ</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1rem" }}>
        {stats.by_status && Object.keys(stats.by_status).length > 0 && (
          <div className="card" style={{ padding: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0" }}>តាមស្ថានភាព</h4>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>ស្ថានភាព</th><th>ចំនួន</th></tr></thead>
                <tbody>
                  {Object.entries(stats.by_status).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.by_gender && Object.keys(stats.by_gender).length > 0 && (
          <div className="card" style={{ padding: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0" }}>តាមភេទ</h4>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>ភេទ</th><th>ចំនួន</th></tr></thead>
                <tbody>
                  {Object.entries(stats.by_gender).map(([k, v]) => (
                    <tr key={k}><td>{k === "Male" ? "ប្រុស" : k === "Female" ? "ស្រី" : "ផ្សេងៗ"}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.by_type && Object.keys(stats.by_type).length > 0 && (
          <div className="card" style={{ padding: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0" }}>តាមប្រភេទ</h4>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>ប្រភេទ</th><th>ចំនួន</th></tr></thead>
                <tbody>
                  {Object.entries(stats.by_type).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.by_tier && Object.keys(stats.by_tier).length > 0 && (
          <div className="card" style={{ padding: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0" }}>តាមកម្រិត</h4>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>កម្រិត</th><th>ចំនួន</th></tr></thead>
                <tbody>
                  {Object.entries(stats.by_tier).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
