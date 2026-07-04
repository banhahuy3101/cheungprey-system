import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuCheck, LuRefreshCw } from "react-icons/lu";
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
  const [form, setForm] = useState({ account_code: "", allocated_amount: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState(false);

  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });

  const showFlash = (msg, isError = false) => {
    setFlash(msg);
    setFlashError(isError);
    setTimeout(() => setFlash(""), 3500);
  };

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
    if (!form.account_code) { showFlash("សូមជ្រើសរើសគណនី", true); return; }
    if (!form.allocated_amount) { showFlash("សូមបញ្ចូលទឹកប្រាក់", true); return; }
    setSubmitting(true);
    try {
      await fmsAPI.createBudget({
        ...form,
        fiscal_year: fiscalYear,
        zone_code: zone.selectedZone || userZone,
      });
      setShowForm(false);
      setForm({ account_code: "", allocated_amount: 0 });
      showFlash("បានបន្ថែមថវិកា");
      fetchBudgets();
    } catch (e) { showFlash(e.response?.data?.error || "បរាជ័យ", true) }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    try {
      await fmsAPI.updateBudget(id, { status: "approved" });
      showFlash("បានអនុម័តថវិកា");
      fetchBudgets();
    } catch (e) { showFlash(e.response?.data?.error || "បរាជ័យ", true) }
  };

  return (
    <div className="page fms-page">
      {flash && (
        <div className={`alert ${flashError ? "alert-error" : "alert-success"} fms-flash`}>{flash}</div>
      )}

      <div className="fms-hero">
        <div className="fms-hero-text">
          <h2 className="fms-hero-title">គ្រប់គ្រងថវិកា</h2>
          <p className="fms-hero-sub">កំណត់ថវិកាប្រចាំឆ្នាំតាមប្រភេទគណនី</p>
        </div>
        <div className="fms-hero-actions">
          <select className="fms-year-select" value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ZoneCascadeSelect hook={zone} />
          <button className="btn btn-secondary btn-sm" onClick={fetchBudgets} disabled={loading}>
            <LuRefreshCw className={loading ? "spin" : ""} />
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><LuPlus /> បន្ថែមថវិកា</button>
          )}
        </div>
      </div>

      <div className="card fms-section-card">
        <h3 className="fms-panel-title">បញ្ជីថវិកា {!loading && <span className="fms-count-badge">{budgets.length}</span>}</h3>

        {loading ? (
          <div className="loading fms-loading-block">កំពុងផ្ទុក...</div>
        ) : budgets.length === 0 ? (
          <div className="fms-empty-state">
            <p>គ្មានថវិកា</p>
            {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><LuPlus /> បន្ថែមថវិកា</button>}
          </div>
        ) : (
          <div className="table-responsive">
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
                      <td><strong>{b.account_name_kh || b.account_code}</strong></td>
                      <td>{b.fiscal_year}</td>
                      <td>${b.allocated_amount?.toLocaleString()}</td>
                      <td className="fms-amount-expense">${b.spent_amount?.toLocaleString()}</td>
                      <td className="fms-amount-income">${remaining.toLocaleString()}</td>
                      <td>
                        <div className="fms-progress">
                          <div className="fms-progress-track">
                            <div className={`fms-progress-fill ${usedPct > 90 ? "fms-progress-danger" : usedPct > 70 ? "fms-progress-warn" : ""}`}
                              style={{ width: `${Math.min(usedPct, 100)}%` }} />
                          </div>
                          <span className="fms-progress-label">{usedPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td><span className={`badge badge-${b.status}`}>{b.status === "approved" ? "បានអនុម័ត" : b.status === "active" ? "សកម្ម" : b.status === "draft" ? "ព្រាង" : b.status}</span></td>
                      <td>
                        {b.status === "draft" && isAdmin && (
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(b.id)}><LuCheck /> អនុម័ត</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>បន្ថែមថវិកា</h2>
            <div className="form-group">
              <label>គណនី <span className="required">*</span></label>
              <select value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})}>
                <option value="">ជ្រើសរើស</option>
                {accounts.map(a => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.name_kh || a.account_name_kh}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>ទឹកប្រាក់ (USD) <span className="required">*</span></label>
              <input type="number" step="0.01" value={form.allocated_amount} onChange={e => setForm({...form, allocated_amount: Number(e.target.value)})} />
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
    </div>
  );
}
