import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlus, LuTrash2, LuArrowLeft } from "react-icons/lu";
import { performanceAPI } from "../api/performance";

export default function SettingsPeriod() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await performanceAPI.getPeriods();
      const data = res.data?.data || res.data || [];
      setPeriods(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load periods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const handleDelete = async (id, label) => {
    if (!confirm(`លុប "${label}"?`)) return;
    try {
      await performanceAPI.deletePeriod(id);
      fetchPeriods();
    } catch {
      setError("Failed to delete period");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">គ្រប់គ្រងរយៈពេល</h2>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/settings/performance_period/create")}>
          <LuPlus /> បន្ថែមរយៈពេល
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : periods.length === 0 ? (
        <div className="card text-center" style={{ padding: "3rem" }}>
          <p>គ្មានរយៈពេល</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ឈ្មោះ (ខ្មែរ)</th>
                <th>ឈ្មោះ (អង់គ្លេស)</th>
                <th>ចាប់ពី</th>
                <th>ដល់</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td>{p.sort_order}</td>
                  <td>{p.label_kh}</td>
                  <td>{p.label_en}</td>
                  <td>{p.start_date}</td>
                  <td>{p.end_date}</td>
                  <td>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(p.id, p.label_kh)} title="លុប">
                      <LuTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}