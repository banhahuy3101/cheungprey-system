import { useState, useEffect, useCallback } from "react";
import { fmsAPI } from "../../api/fms";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin as checkIsAdmin } from "../../utils/permissions";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../hooks/useZoneCascade";

export default function FMSBudgets() {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const userZone = user?.zone_code || "";

  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ zone_code: "", fiscal_year: new Date().getFullYear(), account_code: "", allocated_amount: 0 });
  const [submitting, setSubmitting] = useState(false);

  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fmsAPI.listBudgets({
        zone_code: zone.selectedZone || undefined,
        fiscal_year: fiscalYear,
      });
      setBudgets(data.data || []);
    } catch { setBudgets([]) }
    setLoading(false);
  }, [zone.selectedZone, fiscalYear]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await fmsAPI.listCoA();
      setAccounts((data.data || []).filter(a => a.account_type === "expense"));
    } catch {}
  }, []);

  useEffect(() => { fetchBudgets() }, [fetchBudgets]);
  useEffect(() => { fetchAccounts() }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await fmsAPI.createBudget({
        ...form,
        zone_code: zone.selectedZone || form.zone_code,
      });
      setShowForm(false);
      setForm({ zone_code: "", fiscal_year: new Date().getFullYear(), account_code: "", allocated_amount: 0 });
      fetchBudgets();
    } catch (e) { alert(e.response?.data?.error || "Failed") }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    try { await fmsAPI.updateBudget(id, { status: "approved" }); fetchBudgets() }
    catch (e) { alert(e.response?.data?.error || "Failed") }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>គ្រប់គ្រងថវិកា</h1>
        <div className="page-actions">
          <select value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ZoneCascadeSelect hook={zone} />
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ បន្ថែមថវិកា</button>}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>បន្ថែមថវិកា</h2>
            <div className="form-group">
              <label>គណនី</label>
              <select value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})}>
                <option value="">ជ្រើសរើស</option>
                {accounts.map(a => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.name_kh}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>ទឹកប្រាក់ (USD)</label>
              <input type="number" value={form.allocated_amount} onChange={e => setForm({...form, allocated_amount: Number(e.target.value)})} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowForm(false)}>បោះបង់</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>គណនី</th>
              <th>ឆ្នាំ</th>
              <th>ថវិកា</th>
              <th>បានចំណាយ</th>
              <th>នៅសល់</th>
              <th>ប្រើប្រាស់</th>
              <th>ស្ថានភាព</th>
              <th>សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(b => {
              const remaining = b.allocated_amount - b.spent_amount;
              const usedPct = b.allocated_amount > 0 ? (b.spent_amount / b.allocated_amount) * 100 : 0;
              return (
                <tr key={b.id}>
                  <td>{b.account_name_kh || b.account_code}</td>
                  <td>{b.fiscal_year}</td>
                  <td>${b.allocated_amount?.toLocaleString()}</td>
                  <td>${b.spent_amount?.toLocaleString()}</td>
                  <td>${remaining.toLocaleString()}</td>
                  <td>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(usedPct, 100)}%` }} />
                      <span>{usedPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    {b.status === "draft" && isAdmin && (
                      <button className="btn btn-sm btn-success" onClick={() => handleApprove(b.id)}>អនុម័ត</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {budgets.length === 0 && (
              <tr><td colSpan={8} className="empty">គ្មានទិន្នន័យ</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
