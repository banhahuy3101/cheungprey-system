import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSave, LuArrowLeft } from "react-icons/lu";
import { performanceAPI } from "../api/performance";

export default function SettingsPeriodForm() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Select start and end date"); return; }
    setError(""); setSaving(true);
    try {
      await performanceAPI.createPeriod({ start_date: startDate, end_date: endDate });
      navigate("/settings/performance_period");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create period");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings/performance_period")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">បន្ថែមរយៈពេលថ្មី</h2>
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