import { LuX } from "react-icons/lu";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import Select from "../../components/Select";

export default function MemberForm({
  editing,
  form,
  setForm,
  error,
  submitting,
  onClose,
  onSubmit,
  memberZone,
}) {
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
        <div className="modal-header">
          <h3>{editing ? "កែប្រែសមាជិក" : "បន្ថែមសមាជិកថ្មី"}</h3>
          <button className="btn-icon" onClick={onClose}><LuX /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Membership Info */}
            <div className="form-row">
              <div className="form-group">
                <label>លេខសមាជិក *</label>
                <input name="membership_card_no" value={form.membership_card_no} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>លេខអត្តសញ្ញាណប័ណ្ណ</label>
                <input name="national_id" value={form.national_id} onChange={handleChange} />
              </div>
            </div>

            {/* Khmer Name */}
            <div className="form-row">
              <div className="form-group">
                <label>នាមខ្មែរ *</label>
                <input name="last_name_kh" value={form.last_name_kh} onChange={handleChange} required placeholder="នាម" />
              </div>
              <div className="form-group">
                <label>គោត្តនាមខ្មែរ *</label>
                <input name="first_name_kh" value={form.first_name_kh} onChange={handleChange} required placeholder="គោត្តនាម" />
              </div>
            </div>

            {/* English Name */}
            <div className="form-row">
              <div className="form-group">
                <label>នាមឡាតាំង *</label>
                <input name="last_name_en" value={form.last_name_en} onChange={handleChange} required placeholder="Last Name" />
              </div>
              <div className="form-group">
                <label>គោត្តនាមឡាតាំង *</label>
                <input name="first_name_en" value={form.first_name_en} onChange={handleChange} required placeholder="First Name" />
              </div>
            </div>

            {/* Gender + DOB + Phone */}
            <div className="form-row">
              <div className="form-group">
                <label>ភេទ *</label>
                <Select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="Male">ប្រុស</option>
                  <option value="Female">ស្រី</option>
                  <option value="Other">ផ្សេង</option>
                </Select>
              </div>
              <div className="form-group">
                <label>ថ្ងៃខែឆ្នាំកំណើត *</label>
                <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>ទូរស័ព្ទ *</label>
                <input name="phone_number" value={form.phone_number} onChange={handleChange} required />
              </div>
            </div>

            {/* Contact */}
            <div className="form-row">
              <div className="form-group">
                <label>អ៊ីមែល</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Telegram</label>
                <input name="telegram_username" value={form.telegram_username} onChange={handleChange} />
              </div>
            </div>

            {/* Cambodia Gov Hierarchy */}
            <div className="form-group">
              <label>តំបន់ (ខេត្ត → ស្រុក → ឃុំ → ភូមិ) *</label>
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

            {/* Address + Role + Join Date */}
            <div className="form-row">
              <div className="form-group">
                <label>អាសយដ្ឋានបច្ចុប្បន្ន</label>
                <input name="current_address_details" value={form.current_address_details} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>តួនាទីក្នុងគណបក្ស</label>
                <input name="party_role" value={form.party_role} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>កាលបរិច្ឆេទចូលជាសមាជិក *</label>
                <input name="join_date" type="date" value={form.join_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>ស្ថានភាព</label>
                <Select name="status" value={form.status} onChange={handleChange}>
                  <option value="active">សកម្ម</option>
                  <option value="inactive">អសកម្ម</option>
                </Select>
              </div>
            </div>

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
