import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LuSave, LuArrowLeft } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";

export default function SettingsPeriodForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await performanceAPI.getPeriods();
        const data = res.data?.data || res.data || [];
        const periods = Array.isArray(data) ? data : [];
        const p = periods.find((p) => p.id === id);
        if (p) {
          setStartDate(p.start_date || "");
          setEndDate(p.end_date || "");
        } else {
          setError("រកមិនឃើញរយៈពេល");
        }
      } catch {
        setError("Failed to load period");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) { setError("សូមជ្រើសរើសថ្ងៃចាប់ផ្ដើម និងថ្ងៃបញ្ចប់"); return; }
    setError(""); setSaving(true);
    try {
      if (isEdit) {
        await performanceAPI.updatePeriod(id, { start_date: startDate, end_date: endDate });
      } else {
        await performanceAPI.createPeriod({ start_date: startDate, end_date: endDate });
      }
      navigate("/settings/performance_period");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save period");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">កំពុងផ្ទុក...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings/performance_period")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">{isEdit ? "កែប្រែរយៈពេល" : "បន្ថែមរយៈពេលថ្មី"}</h2>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>ចាប់ពីថ្ងៃ *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>ដល់ថ្ងៃ *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <LuSave /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate("/settings/performance_period")}>
              បោះបង់
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
