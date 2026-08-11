import { useState, useEffect } from "react";
import { LuArrowLeft, LuPlus } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import Select from "../../components/Select";

export default function MembershipDues({ memberId, onBack }) {
  const [dues, setDues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: "", payment_method: "Cash", payment_date: new Date().toISOString().slice(0, 10), payment_status: "Paid", reference_number: "", notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    membershipAPI.getDues(memberId).then((res) => {
      const data = res.data?.data || res.data || [];
      setDues(data);
      let totalPaid = 0;
      let count = 0;
      let lastDate = null;
      let lastAmount = 0;
      data.forEach((d) => {
        if (d.payment_status === "Paid") totalPaid += d.amount;
        count++;
        if (!lastDate) {
          lastDate = d.payment_date?.slice(0, 10);
          lastAmount = d.amount;
        }
      });
      setSummary({ totalPaid, count, lastDate, lastAmount });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [memberId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await membershipAPI.recordDue(memberId, { ...form, amount: parseFloat(form.amount) });
      setShowModal(false);
      setForm({ amount: "", payment_method: "Cash", payment_date: new Date().toISOString().slice(0, 10), payment_status: "Paid", reference_number: "", notes: "" });
      const res = await membershipAPI.getDues(memberId);
      const data = res.data?.data || res.data || [];
      setDues(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel = (m) => {
    const map = { Cash: "សាច់ប្រាក់", "Bakong/KHQR": "KHQR", BankTransfer: "ធនាគារ", Other: "ផ្សេងៗ" };
    return map[m] || m;
  };

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">ប្រវត្តិបង់រំលោះ</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><LuPlus /> កត់ត្រាការបង់</button>
      </div>

      {summary && (
        <div className="card" style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", padding: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--success)" }}>${summary.totalPaid}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>សរុបបានបង់</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{summary.count}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ចំនួនដង</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{summary.lastDate || "—"}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>បង់ចុងក្រោយ</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>${summary.lastAmount}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ចំនួនចុងក្រោយ</div>
          </div>
        </div>
      )}

      <div className="card">
        {dues.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>មិនទាន់មានការបង់រំលោះ</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>#</th><th>កាលបរិច្ឆេទ</th><th>ចំនួន</th><th>វិធី</th><th>ស្ថានភាព</th><th>លេខយោង</th><th>កំណត់ចំណាំ</th></tr></thead>
              <tbody>
                {dues.map((d, i) => (
                  <tr key={d.id}>
                    <td>{i + 1}</td>
                    <td>{d.payment_date?.slice(0, 10)}</td>
                    <td>${d.amount}</td>
                    <td>{methodLabel(d.payment_method)}</td>
                    <td><span className={`badge ${d.payment_status === "Paid" ? "badge-success" : d.payment_status === "Partial" ? "badge-warning" : "badge-danger"}`}>{d.payment_status}</span></td>
                    <td>{d.reference_number || "—"}</td>
                    <td>{d.notes || "—"}</td>
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
              <h3>កត់ត្រាការបង់រំលោះ</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>ចំនួនទឹកប្រាក់ ($) *</label>
                  <input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>វិធីសាស្រ្ត *</label>
                  <Select name="payment_method" value={form.payment_method} onChange={handleChange}>
                    <option value="Cash">សាច់ប្រាក់</option>
                    <option value="Bakong/KHQR">Bakong / KHQR</option>
                    <option value="BankTransfer">ផ្ទេរធនាគារ</option>
                    <option value="Other">ផ្សេងៗ</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>កាលបរិច្ឆេទ *</label>
                  <input type="date" name="payment_date" value={form.payment_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ស្ថានភាព</label>
                  <Select name="payment_status" value={form.payment_status} onChange={handleChange}>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Overdue">Overdue</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>លេខយោង</label>
                  <input name="reference_number" value={form.reference_number} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>កំណត់ចំណាំ</label>
                  <input name="notes" value={form.notes} onChange={handleChange} />
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
