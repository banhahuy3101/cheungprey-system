import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuSearch, LuX } from "react-icons/lu";
import { partyAPI } from "../api/party";
import Select from "../components/Select";

const initialForm = {
  type: "income",
  amount: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function Finances() {
  const [finances, setFinances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [finRes, sumRes] = await Promise.all([
        partyAPI.getFinances({ page, limit: 20 }),
        partyAPI.getFinanceSummary(),
      ]);
      const finInner = finRes.data?.data || finRes.data;
      setFinances(finInner.finances || finInner || []);
      setTotal(finInner.total || 0);
      setSummary(sumRes.data?.data || sumRes.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await partyAPI.createFinance({
        ...form,
        amount: parseFloat(form.amount),
      });
      setShowModal(false);
      setPage(1);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "$0";
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">ហិរញ្ញវត្ថុ</h2>
        <button className="btn btn-primary" onClick={() => { setForm(initialForm); setError(""); setShowModal(true); }}>
          <LuPlus /> បន្ថែមប្រតិបត្តិការ
        </button>
      </div>

      {summary && (
        <div className="stats-grid mb-1">
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value" style={{ color: "#059669" }}>
                {formatCurrency(summary.total_income)}
              </span>
              <span className="stat-label">ចំណូលសរុប</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value" style={{ color: "#dc2626" }}>
                {formatCurrency(summary.total_expense)}
              </span>
              <span className="stat-label">ចំណាយសរុប</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value" style={{ color: summary.balance >= 0 ? "#4f46e5" : "#dc2626" }}>
                {formatCurrency(summary.balance)}
              </span>
              <span className="stat-label">សមតុល្យ</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>កាលបរិច្ឆេទ</th>
                  <th>ប្រភេទ</th>
                  <th>ចំនួន</th>
                  <th>ការពិពណ៌នា</th>
                </tr>
              </thead>
              <tbody>
                {finances.length === 0 ? (
                  <tr><td colSpan={4} className="text-center">គ្មានទិន្នន័យ</td></tr>
                ) : (
                  finances.map((f) => (
                    <tr key={f.id}>
                      <td>{f.date?.slice(0, 10) || f.created_at?.slice(0, 10)}</td>
                      <td>
                        <span className={`badge ${f.type === "income" ? "badge-success" : "badge-danger"}`}>
                          {f.type === "income" ? "ចំណូល" : "ចំណាយ"}
                        </span>
                      </td>
                      <td style={{ color: f.type === "income" ? "#059669" : "#dc2626" }}>
                        {f.type === "expense" ? "-" : ""}{formatCurrency(f.amount)}
                      </td>
                      <td>{f.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>មុន</button>
              <span>ទំព័រ {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>បន្ទាប់</button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>បន្ថែមប្រតិបត្តិការថ្មី</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><LuX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>ប្រភេទ *</label>
                  <Select name="type" value={form.type} onChange={handleChange}>
                    <option value="income">ចំណូល</option>
                    <option value="expense">ចំណាយ</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>ចំនួនទឹកប្រាក់ *</label>
                  <input name="amount" type="number" step="0.01" value={form.amount} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>កាលបរិច្ឆេទ</label>
                  <input name="date" type="date" value={form.date} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>ការពិពណ៌នា</label>
                  <input name="description" value={form.description} onChange={handleChange} />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}