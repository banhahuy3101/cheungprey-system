import { useState, useEffect } from "react";
import { LuArrowLeft, LuPlus, LuCheck } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import Select from "../../components/Select";

export default function MembershipActivity({ memberId, onBack }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ activity_type: "Meeting", title: "", description: "", activity_date: new Date().toISOString().slice(0, 10), hours: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    membershipAPI.getActivity(memberId).then((res) => {
      setActivities(res.data?.data || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [memberId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await membershipAPI.recordActivity(memberId, { ...form, hours: parseFloat(form.hours) || 0 });
      setShowModal(false);
      setForm({ activity_type: "Meeting", title: "", description: "", activity_date: new Date().toISOString().slice(0, 10), hours: "" });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const checkIn = async () => {
    try {
      await membershipAPI.checkIn(memberId);
      fetch();
    } catch {
      //
    }
  };

  const typeLabel = (t) => {
    const map = { Meeting: "ប្រជុំ", Event: "ព្រឹត្តិការណ៍", Training: "បណ្តុះបណ្តាល", Volunteer: "ស្ម័គ្រចិត្ត", Donation: "បរិច្ចាគ", Recruitment: "ជ្រើសរើស", CheckIn: "Check-in", Other: "ផ្សេងៗ" };
    return map[t] || t;
  };

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">សកម្មភាព</h2>
        </div>
        <div className="actions" style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={checkIn}><LuCheck /> Check-in</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><LuPlus /> កត់ត្រាសកម្មភាព</button>
        </div>
      </div>

      <div className="card">
        {activities.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>មិនទាន់មានសកម្មភាព</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>#</th><th>កាលបរិច្ឆេទ</th><th>ប្រភេទ</th><th>ចំណងជើង</th><th>ម៉ោង</th></tr></thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={a.id}>
                    <td>{i + 1}</td>
                    <td>{a.activity_date}</td>
                    <td><span className="badge">{typeLabel(a.activity_type)}</span></td>
                    <td>{a.title}</td>
                    <td>{a.hours || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3>កត់ត្រាសកម្មភាព</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>ប្រភេទ *</label>
                  <Select name="activity_type" value={form.activity_type} onChange={handleChange}>
                    <option value="Meeting">ប្រជុំ</option>
                    <option value="Event">ព្រឹត្តិការណ៍</option>
                    <option value="Training">បណ្តុះបណ្តាល</option>
                    <option value="Volunteer">ស្ម័គ្រចិត្ត</option>
                    <option value="Donation">បរិច្ចាគ</option>
                    <option value="Recruitment">ជ្រើសរើស</option>
                    <option value="Other">ផ្សេងៗ</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>ចំណងជើង *</label>
                  <input name="title" value={form.title} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ពិពណ៌នា</label>
                  <input name="description" value={form.description} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>កាលបរិច្ឆេទ *</label>
                    <input type="date" name="activity_date" value={form.activity_date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>ម៉ោង</label>
                    <input type="number" step="0.5" name="hours" value={form.hours} onChange={handleChange} />
                  </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "រក្សាទុក..." : "រក្សាទុក"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
