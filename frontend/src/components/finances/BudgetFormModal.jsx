import { LuX, LuMapPin, LuWallet } from "react-icons/lu";
import ZoneCascadeSelect from "../ZoneCascadeSelect";
import Select from "../Select";
import { accountLabel } from "../../utils/finances";

export default function BudgetFormModal({
  open,
  form,
  error,
  submitting,
  fiscalYear,
  accounts,
  zone,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fms-modal fms-modal-budget" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header fms-modal-header">
          <div>
            <h3>បន្ថែមថវិកា</h3>
            <p className="fms-modal-sub">ឆ្នាំ {fiscalYear} — កំណត់ថវិកាតាមគណនីចំណាយ</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="បិទ"><LuX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body fms-modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <section className="fms-form-section">
              <h4 className="fms-form-section-title"><LuMapPin /> តំបន់</h4>
              <ZoneCascadeSelect hook={zone} />
            </section>

            <section className="fms-form-section">
              <h4 className="fms-form-section-title"><LuWallet /> ថវិកា</h4>
              <div className="form-group">
                <label>គណនីចំណាយ *</label>
                <Select name="account_code" value={form.account_code} onChange={onChange} required>
                  <option value="">ជ្រើសរើសគណនី</option>
                  {accounts.map((a) => (
                    <option key={a.account_code} value={a.account_code}>{accountLabel(a)}</option>
                  ))}
                </Select>
              </div>
              <div className="form-group">
                <label>ទឹកប្រាក់ (USD) *</label>
                <input
                  name="allocated_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.allocated_amount}
                  onChange={onChange}
                  placeholder="0.00"
                  required
                />
              </div>
            </section>
          </div>
          <div className="modal-footer fms-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>បោះបង់</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
