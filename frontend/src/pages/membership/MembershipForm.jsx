import {
  LuX,
  LuArrowLeft,
  LuIdCard,
  LuUser,
  LuPhone,
  LuAward,
  LuMapPin,
  LuGraduationCap,
  LuSave,
} from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import Select from "../../components/Select";

export default function MembershipForm({
  editing,
  form,
  setForm,
  error,
  submitting,
  onClose,
  onSubmit,
  memberZone,
  isFullPage = false,
}) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const formFields = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* 1. Identification Section */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
          <LuIdCard size={18} style={{ color: "#2563eb" }} />
          <span>ព័ត៌មានអត្តសញ្ញាណ & លេខប័ណ្ណ</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>លេខសមាជិក *</label>
            <input
              name="membership_card_no"
              value={form.membership_card_no}
              onChange={handleChange}
              placeholder="MEM-001"
              required
              style={{ fontWeight: "600", fontFamily: "monospace" }}
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>លេខអត្តសញ្ញាណប័ណ្ណ (National ID)</label>
            <input
              name="national_id"
              value={form.national_id}
              onChange={handleChange}
              placeholder="010203040501"
            />
          </div>
        </div>
      </div>

      {/* 2. Names Section */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
          <LuUser size={18} style={{ color: "#2563eb" }} />
          <span>គោត្តនាម និង នាម (ឈ្មោះសមាជិក)</span>
        </div>
        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>នាមត្រកូលខ្មែរ *</label>
            <input
              name="last_name_kh"
              value={form.last_name_kh}
              onChange={handleChange}
              placeholder="សុខ"
              required
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>នាមខ្មែរ *</label>
            <input
              name="first_name_kh"
              value={form.first_name_kh}
              onChange={handleChange}
              placeholder="សុភាព"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>Last Name (English) *</label>
            <input
              name="last_name_en"
              value={form.last_name_en}
              onChange={handleChange}
              placeholder="Sok"
              required
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>First Name (English) *</label>
            <input
              name="first_name_en"
              value={form.first_name_en}
              onChange={handleChange}
              placeholder="Sopheap"
              required
            />
          </div>
        </div>
      </div>

      {/* 3. Personal & Contact Info */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
          <LuPhone size={18} style={{ color: "#2563eb" }} />
          <span>ព័ត៌មានផ្ទាល់ខ្លួន & ទំនាក់ទំនង</span>
        </div>
        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ភេទ *</label>
            <Select name="gender" value={form.gender} onChange={handleChange}>
              <option value="Male">ប្រុស</option>
              <option value="Female">ស្រី</option>
              <option value="Other">ផ្សេងៗ</option>
            </Select>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ថ្ងៃខែឆ្នាំកំណើត *</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>លេខទូរសព្ទ *</label>
            <input
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              placeholder="012 345 678"
              required
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>អ៊ីមែល</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@domain.com"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>Telegram Username</label>
            <input
              name="telegram_username"
              value={form.telegram_username}
              onChange={handleChange}
              placeholder="@username"
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ថ្ងៃចូលបក្ស *</label>
            <input
              type="date"
              name="join_date"
              value={form.join_date}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      {/* 4. Party Role, Membership Type & Tier */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
          <LuAward size={18} style={{ color: "#2563eb" }} />
          <span>ឋានៈបក្ស ប្រភេទ & កម្រិតសមាជិក</span>
        </div>
        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ប្រភេទសមាជិក</label>
            <Select name="membership_type" value={form.membership_type || "Full"} onChange={handleChange}>
              <option value="Full">ពេញសិទ្ធិ (Full)</option>
              <option value="Associate">ទ្រទ្រង់ (Associate)</option>
              <option value="Youth">យុវជន (Youth)</option>
              <option value="Honorary">កិត្តិយស (Honorary)</option>
              <option value="Probationary">បម្រុង (Probationary)</option>
            </Select>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>កម្រិតសមាជិក (Tier)</label>
            <Select name="membership_tier" value={form.membership_tier || "Basic"} onChange={handleChange}>
              <option value="Basic">Basic</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </Select>
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ឋានៈបក្ស</label>
          <input
            name="party_role"
            value={form.party_role}
            onChange={handleChange}
            placeholder="ឧ. សមាជិក, ប្រធានសាខា, អនុប្រធាន..."
          />
        </div>
      </div>

      {/* 5. Address & Zone Location */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
          <LuMapPin size={18} style={{ color: "#2563eb" }} />
          <span>អាសយដ្ឋាន និង ភូមិសាស្ត្រ</span>
        </div>
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>អាសយដ្ឋានបច្ចុប្បន្ន</label>
          <textarea
            name="current_address_details"
            value={form.current_address_details}
            onChange={handleChange}
            rows={2}
            placeholder="ផ្ទះលេខ... ផ្លូវលេខ..."
          />
        </div>

        {memberZone && (
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem", marginBottom: "0.4rem", display: "block" }}>
              ភូមិសាស្ត្រចុះឈ្មោះ (ខេត្ត / ស្រុក / ឃុំ / ភូមិ)
            </label>
            <ZoneCascadeSelect hook={memberZone} showVillage={true} required={false} />
          </div>
        )}
      </div>

      {/* 6. Extended Demographics */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
          <LuGraduationCap size={18} style={{ color: "#2563eb" }} />
          <span>ព័ត៌មានបន្ថែម (Demographics)</span>
        </div>

        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ស្ថានភាពគ្រួសារ</label>
            <Select name="marital_status" value={form.marital_status || ""} onChange={handleChange}>
              <option value="">-- ជ្រើសរើស --</option>
              <option value="Single">លីវ</option>
              <option value="Married">រៀបការ</option>
              <option value="Divorced">លែងលះ</option>
              <option value="Widowed">មេម៉ាយ/ពោះម៉ាយ</option>
            </Select>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>មុខរបរ</label>
            <input
              name="occupation"
              value={form.occupation || ""}
              onChange={handleChange}
              placeholder="ឧ. គ្រូបង្រៀន, អាជីវករ..."
            />
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>កម្រិតវប្បធម៌</label>
            <Select name="education_level" value={form.education_level || ""} onChange={handleChange}>
              <option value="">-- ជ្រើសរើស --</option>
              <option value="None">គ្មាន</option>
              <option value="Primary">បឋមសិក្សា</option>
              <option value="Secondary">អនុវិទ្យាល័យ</option>
              <option value="HighSchool">វិទ្យាល័យ</option>
              <option value="Bachelor">បរិញ្ញាបត្រ</option>
              <option value="Master">បរិញ្ញាបត្រជាន់ខ្ពស់</option>
              <option value="PhD">បណ្ឌិត</option>
            </Select>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ជនជាតិ</label>
            <input
              name="ethnicity"
              value={form.ethnicity || ""}
              onChange={handleChange}
              placeholder="ខ្មែរ"
            />
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>សាសនា</label>
            <Select name="religion" value={form.religion || ""} onChange={handleChange}>
              <option value="">-- ជ្រើសរើស --</option>
              <option value="Buddhist">ព្រះពុទ្ធ</option>
              <option value="Muslim">ឥស្លាម</option>
              <option value="Christian">គ្រិស្ត</option>
              <option value="Other">ផ្សេងៗ</option>
            </Select>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ប្រភេទឈាម</label>
            <Select name="blood_type" value={form.blood_type || ""} onChange={handleChange}>
              <option value="">-- ជ្រើសរើស --</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
            </Select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>ឈ្មោះទំនាក់ទំនងបន្ទាន់</label>
            <input
              name="emergency_contact_name"
              value={form.emergency_contact_name || ""}
              onChange={handleChange}
              placeholder="ឈ្មោះសាច់ញាតិ"
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: "600", fontSize: "0.85rem" }}>លេខទូរសព្ទបន្ទាន់</label>
            <input
              name="emergency_contact_phone"
              value={form.emergency_contact_phone || ""}
              onChange={handleChange}
              placeholder="012 xxx xxx"
            />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ borderRadius: "10px" }}>{error}</div>}
    </div>
  );

  if (isFullPage) {
    return (
      <div className="page" style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div className="page-header" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", fontWeight: "600" }}
            >
              <LuArrowLeft size={16} /> ត្រឡប់ក្រោយ
            </button>
            <div>
              <h2 className="section-title" style={{ margin: 0, fontSize: "1.35rem" }}>
                {editing ? `កែប្រែព័ត៌មានសមាជិក (${editing.last_name_kh} ${editing.first_name_kh})` : "បន្ថែមសមាជិកថ្មី"}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {editing ? `លេខប័ណ្ណ: ${editing.membership_card_no}` : "បំពេញទិន្នន័យដើម្បីបង្កើតសមាជិកថ្មីក្នុងប្រព័ន្ធ"}
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <form onSubmit={onSubmit}>
            {formFields}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #e2e8f0" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: "8px", px: "1.25rem" }}>
                បោះបង់
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", px: "1.5rem", fontWeight: "600" }}
              >
                <LuSave size={16} /> {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុកសមាជិក"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", borderRadius: "16px" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{editing ? "កែប្រែសមាជិក" : "បន្ថែមសមាជិកថ្មី"}</h3>
          <button className="btn-icon" onClick={onClose}><LuX size={18} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto", padding: "1.25rem" }}>
            {formFields}
          </div>
          <div className="modal-footer" style={{ borderTop: "1px solid #e2e8f0", padding: "1rem 1.25rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: "8px" }}>
              បោះបង់
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", fontWeight: "600" }}
            >
              <LuSave size={16} /> {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
