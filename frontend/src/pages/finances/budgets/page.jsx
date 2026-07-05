import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuCheck, LuWallet } from "react-icons/lu";
import { financesAPI } from "../../../api/finances";
import { useAuth } from "../../../hooks/useAuth";
import { isAdmin as checkIsAdmin } from "../../../utils/permissions";
import ZoneCascadeSelect from "../../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../../hooks/useZoneCascade";
import FinanceHero from "../../../components/finances/FinanceHero";
import BudgetFormModal from "../../../components/finances/BudgetFormModal";
import {
  FMS_BUDGET_STATUS,
  FMS_FISCAL_YEARS,
  formatFMSUSD,
  apiMessage,
  progressClass,
} from "../../../utils/finances";

const INITIAL_FORM = { account_code: "", allocated_amount: "" };

export default function FMSBudgets() {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const userZone = user?.zone_code || "";

  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState(false);
  const [modalZoneSeed, setModalZoneSeed] = useState(null);

  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });
  const formZone = useZoneCascade({ userZone, isAdmin, initialZoneCode: modalZoneSeed, showVillage: false });

  const showFlash = (msg, isError = false) => {
    setFlash(msg);
    setFlashError(isError);
    setTimeout(() => setFlash(""), 3500);
  };

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await financesAPI.listBudgets({
        zone_code: zone.resolvedZone || undefined,
        fiscal_year: fiscalYear,
      });
      setBudgets(data.data || []);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [zone.resolvedZone, fiscalYear]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await financesAPI.listCoA();
      setAccounts((data.data || []).filter((a) => a.account_type === "expense" && a.is_active !== false));
    } catch {
      //
    }
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const openForm = () => {
    setForm(INITIAL_FORM);
    setFormError("");
    setModalZoneSeed(userZone || "0303");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setModalZoneSeed(null);
    setFormError("");
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    const resolved = formZone.resolvedZone || userZone;
    if (!resolved || resolved.length < 6) {
      setFormError("សូមជ្រើសរើសឃុំ");
      return;
    }
    if (!form.account_code || !form.allocated_amount) {
      setFormError("សូមបំពេញគណនី និងទឹកប្រាក់");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await financesAPI.createBudget({
        account_code: form.account_code,
        allocated_amount: parseFloat(form.allocated_amount),
        fiscal_year: fiscalYear,
        zone_code: resolved,
      });
      closeForm();
      showFlash("បានបន្ថែមថវិកា");
      fetchBudgets();
    } catch (err) {
      setFormError(apiMessage(err, "បរាជ័យ"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await financesAPI.updateBudget(id, { status: "approved" });
      showFlash("បានអនុម័តថវិកា");
      fetchBudgets();
    } catch (err) {
      showFlash(apiMessage(err, "បរាជ័យ"), true);
    }
  };

  const totalAllocated = budgets.reduce((s, b) => s + (b.allocated_amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent_amount || 0), 0);

  return (
    <div className="page fms-page fms-page-budgets">
      {flash && (
        <div className={`alert ${flashError ? "alert-error" : "alert-success"} fms-flash`}>{flash}</div>
      )}

      <FinanceHero
        variant="budgets"
        title="គ្រប់គ្រងថវិកា"
        subtitle="កំណត់ថវិកាប្រចាំឆ្នាំតាមប្រភេទគណនីចំណាយ"
        actions={
          <>
            <div className="form-group fms-year-group">
              <label>ឆ្នាំ</label>
              <select className="fms-year-select" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}>
                {FMS_FISCAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {isAdmin && (
              <button type="button" className="btn btn-primary fms-hero-btn" onClick={openForm}>
                <LuPlus /> បន្ថែមថវិកា
              </button>
            )}
          </>
        }
      />

      <div className="card fms-zone-bar">
        <label className="fms-section-label">តំបន់</label>
        <ZoneCascadeSelect hook={zone} />
      </div>

      {!loading && budgets.length > 0 && (
        <div className="fms-kpi-grid fms-kpi-grid-2">
          <div className="fms-kpi-card fms-kpi-budget">
            <div className="fms-kpi-icon"><LuWallet size={22} /></div>
            <div className="fms-kpi-body">
              <span className="fms-kpi-value">{formatFMSUSD(totalAllocated)}</span>
              <span className="fms-kpi-label">ថវិកាសរុប</span>
            </div>
          </div>
          <div className="fms-kpi-card fms-kpi-expense">
            <div className="fms-kpi-icon"><LuWallet size={22} /></div>
            <div className="fms-kpi-body">
              <span className="fms-kpi-value">{formatFMSUSD(totalSpent)}</span>
              <span className="fms-kpi-label">បានចំណាយ</span>
            </div>
          </div>
        </div>
      )}

      <section className="card fms-section-card">
        <div className="fms-panel-header">
          <h3 className="fms-panel-title">
            <LuWallet className="fms-panel-icon" />
            បញ្ជីថវិកា
            {!loading && <span className="fms-count-badge">{budgets.length}</span>}
          </h3>
        </div>

        {loading ? (
          <div className="loading fms-loading-block">កំពុងផ្ទុក...</div>
        ) : budgets.length === 0 ? (
          <div className="fms-empty-state">
            <p>គ្មានថវិកា</p>
            {isAdmin && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openForm}><LuPlus /> បន្ថែមថវិកា</button>
            )}
          </div>
        ) : (
          <div className="table-responsive fms-table-wrap">
            <table className="table fms-table">
              <thead>
                <tr>
                  <th>គណនី</th>
                  <th>ឆ្នាំ</th>
                  <th>ថវិកា</th>
                  <th>បានចំណាយ</th>
                  <th>នៅសល់</th>
                  <th>ប្រើប្រាស់</th>
                  <th>ស្ថានភាព</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => {
                  const remaining = (b.allocated_amount || 0) - (b.spent_amount || 0);
                  const usedPct = b.allocated_amount > 0 ? ((b.spent_amount || 0) / b.allocated_amount) * 100 : 0;
                  const st = FMS_BUDGET_STATUS[b.status] || { label: b.status, badge: "badge-draft" };
                  return (
                    <tr key={b.id}>
                      <td><strong>{b.account_name_kh || b.account_code}</strong></td>
                      <td>{b.fiscal_year}</td>
                      <td>{formatFMSUSD(b.allocated_amount)}</td>
                      <td className="fms-amount-expense">{formatFMSUSD(b.spent_amount)}</td>
                      <td className="fms-amount-income">{formatFMSUSD(remaining)}</td>
                      <td>
                        <div className="fms-progress">
                          <div className="fms-progress-track">
                            <div className={`fms-progress-fill ${progressClass(usedPct)}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                          </div>
                          <span className="fms-progress-label">{usedPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                      <td>
                        {b.status === "draft" && isAdmin && (
                          <button type="button" className="btn btn-sm btn-success" onClick={() => handleApprove(b.id)}>
                            <LuCheck /> អនុម័ត
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BudgetFormModal
        open={showForm}
        form={form}
        error={formError}
        submitting={submitting}
        fiscalYear={fiscalYear}
        accounts={accounts}
        zone={formZone}
        onClose={closeForm}
        onChange={handleChange}
        onSubmit={handleCreate}
      />
    </div>
  );
}
