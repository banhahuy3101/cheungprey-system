import { useState } from "react";
import { LuPlus, LuTrash2, LuX, LuTarget } from "react-icons/lu";
import { partyAPI } from "../api/party";
import Select from "./Select";
import ZoneCascadeSelect from "./ZoneCascadeSelect";
import { useZoneCascade } from "../hooks/useZoneCascade";
import { formatUSD, BUDGET_TYPES, PERIOD_TYPES } from "../utils/finance";

const initialBudget = {
  period_type: "year",
  period_start: `${new Date().getFullYear()}-01-01`,
  period_end: `${new Date().getFullYear()}-12-31`,
  budget_type: "expense",
  amount_usd: "",
  amount_khr: "",
  notes: "",
};

function BudgetUsage({ usedPct }) {
  const pct = Math.min(usedPct || 0, 100);
  const over = (usedPct || 0) > 100;
  return (
    <div className="finance-budget-usage">
      <div className="finance-budget-usage-track">
        <div
          className={`finance-budget-usage-fill ${over ? "finance-budget-over" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`finance-budget-pct ${over ? "finance-budget-over-text" : ""}`}>
        {(usedPct || 0).toFixed(0)}%
      </span>
    </div>
  );
}

export default function FinanceBudgets({ budgets, canManage, userZone, isAdmin, onRefresh, filterZoneCode }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialBudget);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [modalZoneSeed, setModalZoneSeed] = useState(null);

  const zone = useZoneCascade({
    userZone,
    isAdmin,
    initialZoneCode: modalZoneSeed,
    showVillage: false,
  });

  const openCreate = () => {
    setForm(initialBudget);
    setError("");
    setModalZoneSeed(filterZoneCode || userZone || "0303");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zone.resolvedZone || zone.resolvedZone.length < 6) {
      setError("សូមជ្រើសរើសឃុំ");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await partyAPI.createFinanceBudget({
        ...form,
        zone_code: zone.resolvedZone,
        amount_usd: parseFloat(form.amount_usd) || 0,
        amount_khr: parseFloat(form.amount_khr) || 0,
      });
      setShowModal(false);
      onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.message || "បរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("លុបថវិកានេះ?")) return;
    try {
      await partyAPI.deleteFinanceBudget(id);
      onRefresh?.();
    } catch {
      //
    }
  };

  return (
    <div className="card finance-panel finance-budgets">
      <div className="finance-panel-header">
        <h3 className="finance-panel-title">
          <LuTarget className="finance-panel-icon" /> ថវិកាតាមតំបន់
        </h3>
        {canManage && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={openCreate}>
            <LuPlus /> បន្ថែម
          </button>
        )}
      </div>
      {!budgets?.length ? (
        <p className="finance-empty-inline">គ្មានថវិកា — {canManage ? "ចុចបន្ថែមដើម្បីកំណត់ថវិកា" : "មិនទាន់មានទិន្នន័យ"}</p>
      ) : (
        <div className="table-responsive">
          <table className="table finance-table-compact">
            <thead>
              <tr>
                <th>តំបន់</th>
                <th>រយៈពេល</th>
                <th>ថវិកា</th>
                <th>បានប្រើ</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="finance-budget-zone">{b.zone_name_kh || b.zone_code}</div>
                    <div className="finance-budget-type">
                      {BUDGET_TYPES.find((t) => t.value === b.budget_type)?.label || b.budget_type}
                    </div>
                  </td>
                  <td className="finance-budget-period">{b.period_start} → {b.period_end}</td>
                  <td>
                    <div>{formatUSD(b.amount_usd)}</div>
                    <div className="finance-budget-actual">ការពិត {formatUSD(b.actual_usd)}</div>
                  </td>
                  <td><BudgetUsage usedPct={b.used_pct} /></td>
                  {canManage && (
                    <td>
                      <button type="button" className="btn-icon" title="លុប" onClick={() => handleDelete(b.id)}>
                        <LuTrash2 />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal finance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>បន្ថែមថវិកា</h3>
              <button type="button" className="btn-icon" onClick={() => setShowModal(false)}><LuX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="finance-form-section">
                  <p className="finance-section-label">តំបន់ *</p>
                  <ZoneCascadeSelect
                    {...zone}
                    onProvinceChange={zone.setProvince}
                    onDistrictChange={zone.setDistrict}
                    onCommuneChange={zone.setCommune}
                    onVillageChange={zone.setSelectedVillage}
                    isLocked={zone.isLocked}
                    showVillage={false}
                  />
                </div>
                <div className="finance-form-grid">
                  <div className="form-group">
                    <label>រយៈពេល</label>
                    <Select name="period_type" value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value })}>
                      {PERIOD_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </Select>
                  </div>
                  <div className="form-group">
                    <label>ប្រភេទថវិកា</label>
                    <Select name="budget_type" value={form.budget_type} onChange={(e) => setForm({ ...form, budget_type: e.target.value })}>
                      {BUDGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </div>
                </div>
                <div className="finance-form-grid">
                  <div className="form-group">
                    <label>ចាប់ពី</label>
                    <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>ដល់</label>
                    <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} required />
                  </div>
                </div>
                <div className="finance-form-grid">
                  <div className="form-group">
                    <label>ថវិកា USD</label>
                    <input type="number" step="0.01" value={form.amount_usd} onChange={(e) => setForm({ ...form, amount_usd: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>KHR</label>
                    <input type="number" step="1" value={form.amount_khr} onChange={(e) => setForm({ ...form, amount_khr: e.target.value })} />
                  </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "..." : "រក្សាទុក"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
