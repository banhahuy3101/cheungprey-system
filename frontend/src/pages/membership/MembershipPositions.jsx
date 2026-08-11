import { useState, useEffect } from "react";
import { LuArrowLeft, LuPlus } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import Select from "../../components/Select";

export default function MembershipPositions({ memberId, onBack }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ party_role: "Member", position_title: "", committee: "", rank: "", structure_id: "", start_date: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    membershipAPI.getPositions(memberId).then((res) => {
      setPositions(res.data?.data || res.data || []);
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
      await membershipAPI.assignPosition(memberId, { ...form, rank: parseInt(form.rank) || 0 });
      setShowModal(false);
      setForm({ party_role: "Member", position_title: "", committee: "", rank: "", structure_id: "", start_date: new Date().toISOString().slice(0, 10) });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">ប្រវត្តិឋានៈ</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><LuPlus /> តែងតាំងឋានៈ</button>
      </div>

      <div className="card">
        {positions.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>មិនទាន់មានប្រវត្តិឋានៈ</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>#</th><th>ឋានៈ</th><th>ចំណងជើង</th><th>គណៈកម្មការ</th><th>ចាប់ផ្តើម</th><th>បញ្ចប់</th><th>បច្ចុប្បន្ន</th></tr></thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.party_role}</td>
                    <td>{p.position_title || "—"}</td>
                    <td>{p.committee || "—"}</td>
                    <td>{p.start_date}</td>
                    <td>{p.end_date || "—"}</td>
                    <td>{p.is_current ? <span className="badge badge-success">បច្ចុប្បន្ន</span> : <span className="badge">បញ្ចប់</span>}</td>
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
              <h3>តែងតាំងឋានៈថ្មី</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>ឋានៈ *</label>
                  <Select name="party_role" value={form.party_role} onChange={handleChange}>
                    <option value="Member">Member</option>
                    <option value="Board Member">Board Member</option>
                    <option value="Committee Member">Committee Member</option>
                    <option value="Officer">Officer</option>
                    <option value="Advisor">Advisor</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>ចំណងជើងតំណែង</label>
                  <input name="position_title" value={form.position_title} onChange={handleChange} placeholder="President, Secretary..." />
                </div>
                <div className="form-group">
                  <label>គណៈកម្មការ</label>
                  <input name="committee" value={form.committee} onChange={handleChange} placeholder="Finance, Youth, Women..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>លេខរៀងឋានានុក្រម</label>
                    <input type="number" name="rank" value={form.rank} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>ថ្ងៃចាប់ផ្តើម *</label>
                    <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
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
