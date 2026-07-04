import { LuX, LuPaperclip, LuMapPin, LuBanknote, LuUser, LuFileText } from "react-icons/lu";
import Select from "./Select";
import ZoneCascadeSelect from "./ZoneCascadeSelect";
import {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  initialFinanceForm,
} from "../utils/finance";

function memberLabel(m) {
  const kh = [m.first_name_kh, m.last_name_kh].filter(Boolean).join(" ");
  const card = m.membership_card_no ? ` (${m.membership_card_no})` : "";
  return (kh || m.first_name_en || m.id) + card;
}

export default function FinanceFormModal({
  open,
  editing,
  form,
  error,
  submitting,
  members,
  zone,
  pendingFiles,
  onFilesChange,
  transactionTypes = TRANSACTION_TYPES,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal finance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header finance-modal-header">
          <div>
            <h3>{editing ? "កែប្រែប្រតិបត្តិការ" : "បន្ថែមប្រតិបត្តិការថ្មី"}</h3>
            <p className="finance-modal-sub">រក្សាទុកព័ត៌មានហិរញ្ញវត្ថុតាមឃុំ</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}><LuX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body finance-modal-body">
            <section className="finance-form-section">
              <h4 className="finance-form-section-title"><LuMapPin /> តំបន់</h4>
              {zone.loading ? (
                <div className="loading finance-loading-inline">កំពុងផ្ទុកតំបន់...</div>
              ) : (
                <ZoneCascadeSelect
                  {...zone}
                  onProvinceChange={zone.setProvince}
                  onDistrictChange={zone.setDistrict}
                  onCommuneChange={zone.setCommune}
                  onVillageChange={zone.setSelectedVillage}
                  isLocked={zone.isLocked}
                  showVillage={false}
                />
              )}
            </section>

            <section className="finance-form-section">
              <h4 className="finance-form-section-title"><LuBanknote /> ប្រតិបត្តិការ</h4>
              <div className="form-group">
                <label>ប្រភេទ *</label>
                <Select name="transaction_type" value={form.transaction_type} onChange={onChange} required>
                  {transactionTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="finance-form-grid">
                <div className="form-group">
                  <label>USD</label>
                  <input name="amount_usd" type="number" step="0.01" min="0" value={form.amount_usd} onChange={onChange} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>KHR</label>
                  <input name="amount_khr" type="number" step="1" min="0" value={form.amount_khr} onChange={onChange} placeholder="0" />
                </div>
              </div>
              <div className="finance-form-grid">
                <div className="form-group">
                  <label>វិធីបង់ *</label>
                  <Select name="payment_method" value={form.payment_method} onChange={onChange} required>
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="form-group">
                  <label>កាលបរិច្ឆេទ *</label>
                  <input name="transaction_date" type="date" value={form.transaction_date} onChange={onChange} required />
                </div>
              </div>
            </section>

            <section className="finance-form-section">
              <h4 className="finance-form-section-title"><LuUser /> អ្នកទទួល / បរិច្ចាគ</h4>
              <div className="finance-form-grid">
                <div className="form-group">
                  <label>ឈ្មោះ (ខ្មែរ)</label>
                  <input name="contributor_name_kh" value={form.contributor_name_kh} onChange={onChange} />
                </div>
                <div className="form-group">
                  <label>ឈ្មោះ (English)</label>
                  <input name="contributor_name_en" value={form.contributor_name_en} onChange={onChange} />
                </div>
              </div>
              <div className="form-group">
                <label>សមាជិក</label>
                <Select name="member_id" value={form.member_id} onChange={onChange}>
                  <option value="">— គ្មាន —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                  ))}
                </Select>
              </div>
            </section>

            <section className="finance-form-section">
              <h4 className="finance-form-section-title"><LuFileText /> ព័ត៌មានបន្ថែម</h4>
              <div className="form-group">
                <label>លេខយោង</label>
                <input name="reference_number" value={form.reference_number} onChange={onChange} />
              </div>
              <div className="form-group">
                <label>កំណត់សម្គាល់</label>
                <textarea name="notes" rows={2} value={form.notes} onChange={onChange} />
              </div>
              <div className="form-group">
                <label className="finance-file-label"><LuPaperclip /> ឯកសារភ្ជាប់</label>
                <input
                  type="file"
                  className="finance-file-input"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => onFilesChange?.(Array.from(e.target.files || []))}
                />
                {pendingFiles?.length > 0 && (
                  <ul className="finance-file-list">
                    {pendingFiles.map((f) => <li key={f.name}>{f.name}</li>)}
                  </ul>
                )}
                {editing?.attachments?.length > 0 && (
                  <ul className="finance-file-list finance-file-list-existing">
                    {editing.attachments.map((a) => <li key={a.id}>{a.file_name}</li>)}
                  </ul>
                )}
              </div>
            </section>

            {error && <div className="alert alert-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>បោះបង់</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || zone.loading}>
              {submitting ? "រក្សាទុក..." : "រក្សាទុក"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
