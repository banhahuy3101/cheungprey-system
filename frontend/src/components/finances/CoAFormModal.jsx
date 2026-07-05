import { LuX, LuBookOpen } from "react-icons/lu";
import Select from "../Select";
import { FMS_ACCOUNT_TYPES } from "../../utils/finances";

export default function CoAFormModal({
  open,
  editing,
  form,
  error,
  submitting,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fms-modal fms-modal-coa" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header fms-modal-header">
          <div>
            <h3>{editing ? "កែប្រែគណនី" : "បន្ថែមគណនី"}</h3>
            <p className="fms-modal-sub">Chart of Accounts — តារាងគណនី FMS</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="បិទ"><LuX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body fms-modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <section className="fms-form-section">
              <h4 className="fms-form-section-title"><LuBookOpen /> ព័ត៌មានគណនី</h4>
              {!editing && (
                <div className="form-group">
                  <label>លេខកូដ *</label>
                  <input
                    name="account_code"
                    value={form.account_code}
                    onChange={onChange}
                    placeholder="ឧ. 6001"
                    required
                  />
                </div>
              )}
              <div className="fms-form-grid">
                <div className="form-group">
                  <label>ឈ្មោះ (ខ្មែរ) *</label>
                  <input name="name_kh" value={form.name_kh} onChange={onChange} required />
                </div>
                <div className="form-group">
                  <label>ឈ្មោះ (English) *</label>
                  <input name="name_en" value={form.name_en} onChange={onChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>ប្រភេទ *</label>
                <Select name="account_type" value={form.account_type} onChange={onChange} required>
                  {FMS_ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
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
