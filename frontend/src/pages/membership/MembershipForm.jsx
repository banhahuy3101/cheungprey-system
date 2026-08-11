import { LuX } from "react-icons/lu";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import Select from "../../components/Select";

export default function MembershipForm({ editing, form, setForm, error, submitting, onClose, onSubmit, memberZone }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
        <div className="modal-header">
          <h3>{editing ? "កែប្រែសមាជិក" : "បន្ថែមសមាជិកថ្មី"}</h3>
          <button className="btn-icon" onClick={onClose}><LuX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-row">
              <div className="form-group">
                <label>លេខសមាជិក *</label>
                <input name="membership_card_no" value={form.membership_card_no} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>អត្តសញ្ញាណប័ណ្ណ</label>
                <input name="national_id" value={form.national_id} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>នាមខ្មែរ *</label>
                <input name="first_name_kh" value={form.first_name_kh} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>នាមត្រកូលខ្មែរ *</label>
                <input name="last_name_kh" value={form.last_name_kh} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input name="first_name_en" value={form.first_name_en} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input name="last_name_en" value={form.last_name_en} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ភេទ *</label>
                <Select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="Male">ប្រុស</option>
                  <option value="Female">ស្រី</option>
                  <option value="Other">ផ្សេងៗ</option>
                </Select>
              </div>
              <div className="form-group">
                <label>ថ្ងៃខែឆ្នាំកំណើត *</label>
                <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>លេខទូរសព្ទ *</label>
                <input name="phone_number" value={form.phone_number} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>អ៊ីមែល</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Telegram</label>
                <input name="telegram_username" value={form.telegram_username} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>ទីតាំង *</label>
              <ZoneCascadeSelect
                provinces={memberZone.provinces}
                districts={memberZone.districts}
                communes={memberZone.communes}
                villages={memberZone.villages}
                selectedProvince={memberZone.selectedProvince}
                selectedDistrict={memberZone.selectedDistrict}
                selectedCommune={memberZone.selectedCommune}
                selectedVillage={memberZone.selectedVillage}
                onProvinceChange={(code) => memberZone.setProvince(code)}
                onDistrictChange={(code) => memberZone.setDistrict(code)}
                onCommuneChange={(code) => memberZone.setCommune(code)}
                onVillageChange={(code) => memberZone.setSelectedVillage(code)}
                isLocked={() => false}
                compact
              />
            </div>

            <div className="form-group">
              <label>អាសយដ្ឋានបច្ចុប្បន្ន</label>
              <input name="current_address_details" value={form.current_address_details} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ឋានៈ</label>
                <Select name="party_role" value={form.party_role} onChange={handleChange}>
                  <option value="">-- ជ្រើសរើស --</option>
                  <option value="Member">Member</option>
                  <option value="Board Member">Board Member</option>
                  <option value="Committee Member">Committee Member</option>
                  <option value="Officer">Officer</option>
                  <option value="Advisor">Advisor</option>
                </Select>
              </div>
              <div className="form-group">
                <label>រចនាសម្ព័ន្ធ</label>
                <Select name="structure_id" value={form.structure_id} onChange={handleChange}>
                  <option value="">-- ជ្រើសរើស --</option>
                </Select>
              </div>
              <div className="form-group">
                <label>ថ្ងៃចុះឈ្មោះ *</label>
                <input type="date" name="join_date" value={form.join_date} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ប្រភេទ</label>
                <Select name="membership_type" value={form.membership_type} onChange={handleChange}>
                  <option value="Full">Full</option>
                  <option value="Associate">Associate</option>
                  <option value="Youth">Youth</option>
                  <option value="Honorary">Honorary</option>
                  <option value="Probationary">Probationary</option>
                </Select>
              </div>
              <div className="form-group">
                <label>កម្រិត</label>
                <Select name="membership_tier" value={form.membership_tier} onChange={handleChange}>
                  <option value="Basic">Basic</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </Select>
              </div>
            </div>

            <label className="checkbox-field">
              <input type="checkbox" name="exempt_from_dues" checked={form.exempt_from_dues} onChange={handleChange} />
              <div>
                <div className="checkbox-text">លើកលែងកាតព្វកិច្ចបង់រំលោះ</div>
                <div className="checkbox-hint">សមាជិកនេះនឹងមិនត្រូវបានតម្រូវឱ្យបង់រំលោះប្រចាំខែទេ</div>
              </div>
            </label>

            {error && <div className="alert alert-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>បោះបង់</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
