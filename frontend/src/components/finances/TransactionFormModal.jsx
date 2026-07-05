import { LuX, LuMapPin, LuBanknote, LuFileText } from "react-icons/lu";
import ZoneCascadeSelect from "../ZoneCascadeSelect";
import Select from "../Select";
import { accountLabel } from "../../utils/finances";

export default function TransactionFormModal({
  open,
  type,
  form,
  error,
  submitting,
  accounts,
  zone,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null;

  const isIncome = type !== "expense";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal fms-modal fms-modal-${isIncome ? "income" : "expense"}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header fms-modal-header">
          <div>
            <h3>បន្ថែម{isIncome ? "ចំណូល" : "ចំណាយ"}</h3>
            <p className="fms-modal-sub">កត់ត្វាប្រតិបត្តិការតាមគណនី</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="បិទ"><LuX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body fms-modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <section className="fms-form-section">
              <h4 className="fms-form-section-title"><LuMapPin /> តំបន់</h4>
              {zone.loading ? (
                <div className="loading fms-loading-inline">កំពុងផ្ទុកតំបន់...</div>
              ) : (
                <ZoneCascadeSelect hook={zone} />
              )}
            </section>

            <section className="fms-form-section">
              <h4 className="fms-form-section-title"><LuBanknote /> ប្រតិបត្តិការ</h4>
              <div className="form-group">
                <label>គណនី *</label>
                <Select name="account_code" value={form.account_code} onChange={onChange} required>
                  <option value="">ជ្រើសរើសគណនី</option>
                  {accounts.map((a) => (
                    <option key={a.account_code} value={a.account_code}>{accountLabel(a)}</option>
                  ))}
                </Select>
              </div>
              <div className="fms-form-grid">
                <div className="form-group">
                  <label>USD</label>
                  <input
                    name="amount_usd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_usd}
                    onChange={onChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>KHR</label>
                  <input
                    name="amount_khr"
                    type="number"
                    step="100"
                    min="0"
                    value={form.amount_khr}
                    onChange={onChange}
                    placeholder="0"
                  />
                </div>
              </div>
            </section>

            <section className="fms-form-section">
              <h4 className="fms-form-section-title"><LuFileText /> បរិយាយ</h4>
              <div className="form-group">
                <textarea
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={onChange}
                  placeholder="ពិពណ៌នាប្រតិបត្តិការ..."
                />
              </div>
            </section>
          </div>
          <div className="modal-footer fms-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>បោះបង់</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "កំពុងរក្សាទុក..." : "ដាក់ស្នើអនុម័ត"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
