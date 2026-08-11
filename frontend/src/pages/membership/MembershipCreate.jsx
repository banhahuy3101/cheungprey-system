import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuArrowRight, LuCheck, LuUser, LuPhone, LuMapPin, LuAward, LuClipboardCheck,
} from "react-icons/lu";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import Select from "../../components/Select";
import { partyAPI } from "../../api/party";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { useToast } from "../../components/Toast";

const STEPS = [
  { key: 1, label: "មូលដ្ឋាន", icon: LuUser },
  { key: 2, label: "ទំនាក់ទំនង", icon: LuPhone },
  { key: 3, label: "ទីតាំង គណបក្ស", icon: LuMapPin },
  { key: 4, label: "ប្រភេទសមាជិក", icon: LuAward },
  { key: 5, label: "ពិនិត្យ រក្សាទុក", icon: LuClipboardCheck },
];

const initialForm = {
  membership_card_no: "",
  national_id: "",
  last_name_kh: "",
  first_name_kh: "",
  last_name_en: "",
  first_name_en: "",
  gender: "Male",
  date_of_birth: "",
  phone_number: "",
  email: "",
  telegram_username: "",
  registered_village_code: "",
  current_address_details: "",
  structure_id: "",
  party_role: "Member",
  join_date: new Date().toISOString().slice(0, 10),
  membership_type: "Full",
  membership_tier: "Basic",
  exempt_from_dues: false,
};

export default function MembershipCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const memberZone = useZoneCascade({
    userZone: "",
    isAdmin: true,
    initialZoneCode: "",
    showVillage: true,
  });

  useEffect(() => {
    partyAPI.getZones({ type: "Province" }).then((res) => {
      const list = Array.isArray(res.data?.data) ? res.data.data
        : Array.isArray(res.data) ? res.data : [];
      if (list.length) {
        memberZone.applyHierarchy({
          provinces: list, province: "", district: "", commune: "", village: "",
          districts: [], communes: [], villages: [],
        });
      }
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: "" });
  };

  const getVillageCode = () => {
    return memberZone.selectedVillage || memberZone.selectedCommune ||
      memberZone.selectedDistrict || memberZone.selectedProvince ||
      form.registered_village_code || "";
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.membership_card_no.trim()) errs.membership_card_no = "សូមបញ្ចូលលេខសមាជិក";
      if (!form.last_name_kh.trim()) errs.last_name_kh = "សូមបញ្ចូលនាមត្រកូលខ្មែរ";
      if (!form.first_name_kh.trim()) errs.first_name_kh = "សូមបញ្ចូលនាមខ្មែរ";
      if (!form.last_name_en.trim()) errs.last_name_en = "សូមបញ្ចូល Last Name";
      if (!form.first_name_en.trim()) errs.first_name_en = "សូមបញ្ចូល First Name";
      if (!form.date_of_birth) errs.date_of_birth = "សូមបញ្ចូលថ្ងៃខែឆ្នាំកំណើត";
    }
    if (s === 2) {
      if (!form.phone_number.trim()) errs.phone_number = "សូមបញ្ចូលលេខទូរសព្ទ";
    }
    if (s === 3) {
      const vc = getVillageCode();
      if (!vc) errs._zone = "សូមជ្រើសរើសទីតាំង";
      if (!form.join_date) errs.join_date = "សូមបញ្ចូលថ្ងៃចុះឈ្មោះ";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep(step + 1);
  };
  const prev = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setError("");
    setSubmitting(true);
    try {
      await partyAPI.createMember({ ...form, registered_village_code: getVillageCode() });
      toast.success("បានបង្កើតសមាជិកថ្មីដោយជោគជ័យ");
      navigate("/membership");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "ការរក្សាទុកបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEPS[step - 1]?.icon || LuUser;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/membership")}>
            <LuArrowLeft />
          </button>
          <h2 className="section-title">បន្ថែមសមាជិកថ្មី</h2>
        </div>
        <span style={{ color: "var(--text-muted)" }}>
          <StepIcon style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />
          ជំហានទី {step}/5: {STEPS[step - 1]?.label}
        </span>
      </div>

      {/* Step indicator */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", position: "relative", gap: 0 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "0.35rem", flex: "0 0 20%", position: "relative",
                cursor: s.key < step ? "pointer" : "default",
              }}
              onClick={() => { if (s.key < step) setStep(s.key); }}
            >
              {/* Connector line between steps */}
              {i > 0 && (
                <div style={{
                  position: "absolute", top: "16px", right: "50%", width: "100%", height: "2px",
                  background: s.key <= step ? "var(--primary)" : "var(--border)",
                  zIndex: 0,
                }} />
              )}
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: s.key <= step ? "var(--primary)" : "var(--bg)",
                color: s.key <= step ? "#fff" : "var(--text-muted)",
                fontWeight: 700, fontSize: "0.85rem", zIndex: 1, transition: "0.3s",
                border: s.key > step ? "2px solid var(--border)" : "2px solid transparent",
              }}>
                {s.key < step ? <LuCheck size={16} /> : s.key}
              </div>
              <span style={{
                fontSize: "0.7rem", color: s.key <= step ? "var(--primary)" : "var(--text-muted)",
                textAlign: "center", fontWeight: s.key === step ? 600 : 400,
                whiteSpace: "nowrap", lineHeight: "1.2",
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="card" style={{ maxWidth: "780px", margin: "0 auto", padding: "2rem" }}>
        <form onSubmit={(e) => { e.preventDefault(); step < 5 ? next() : handleSubmit(); }}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>ព័ត៌មានមូលដ្ឋាន</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>លេខសមាជិក *</label>
                  <input name="membership_card_no" value={form.membership_card_no} onChange={handleChange} />
                  {fieldErrors.membership_card_no && <span className="field-error">{fieldErrors.membership_card_no}</span>}
                </div>
                <div className="form-group">
                  <label>អត្តសញ្ញាណប័ណ្ណ</label>
                  <input name="national_id" value={form.national_id} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>នាមខ្មែរ *</label>
                  <input name="first_name_kh" value={form.first_name_kh} onChange={handleChange} />
                  {fieldErrors.first_name_kh && <span className="field-error">{fieldErrors.first_name_kh}</span>}
                </div>
                <div className="form-group">
                  <label>នាមត្រកូលខ្មែរ *</label>
                  <input name="last_name_kh" value={form.last_name_kh} onChange={handleChange} />
                  {fieldErrors.last_name_kh && <span className="field-error">{fieldErrors.last_name_kh}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input name="first_name_en" value={form.first_name_en} onChange={handleChange} />
                  {fieldErrors.first_name_en && <span className="field-error">{fieldErrors.first_name_en}</span>}
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input name="last_name_en" value={form.last_name_en} onChange={handleChange} />
                  {fieldErrors.last_name_en && <span className="field-error">{fieldErrors.last_name_en}</span>}
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
                  <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
                  {fieldErrors.date_of_birth && <span className="field-error">{fieldErrors.date_of_birth}</span>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>ព័ត៌មានទំនាក់ទំនង</h3>
              <div className="form-group">
                <label>លេខទូរសព្ទ *</label>
                <input name="phone_number" value={form.phone_number} onChange={handleChange} />
                {fieldErrors.phone_number && <span className="field-error">{fieldErrors.phone_number}</span>}
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
                <label>អាសយដ្ឋានបច្ចុប្បន្ន</label>
                <textarea
                  name="current_address_details"
                  value={form.current_address_details}
                  onChange={handleChange}
                  rows={3}
                  style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>ទីតាំង និង គណបក្ស</h3>
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
                />
                {fieldErrors._zone && <span className="field-error">{fieldErrors._zone}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ឋានៈ</label>
                  <Select name="party_role" value={form.party_role} onChange={handleChange}>
                    <option value="Member">Member</option>
                    <option value="Board Member">Board Member</option>
                    <option value="Committee Member">Committee Member</option>
                    <option value="Officer">Officer</option>
                    <option value="Advisor">Advisor</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>ថ្ងៃចុះឈ្មោះ *</label>
                  <input type="date" name="join_date" value={form.join_date} onChange={handleChange} />
                  {fieldErrors.join_date && <span className="field-error">{fieldErrors.join_date}</span>}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>ប្រភេទសមាជិក</h3>
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
              <div className="form-group">
                <label className="checkbox-field">
                <input type="checkbox" name="exempt_from_dues" checked={form.exempt_from_dues} onChange={handleChange} />
                <div>
                  <div className="checkbox-text">លើកលែងកាតព្វកិច្ចបង់រំលោះ</div>
                  <div className="checkbox-hint">សមាជិកនេះនឹងមិនត្រូវបានតម្រូវឱ្យបង់រំលោះប្រចាំខែទេ</div>
                </div>
              </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)" }}>ពិនិត្យមុនរក្សាទុក</h3>
              <div className="card" style={{ padding: "1rem", background: "var(--bg)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <ReviewItem label="លេខសមាជិក" value={form.membership_card_no} />
                  <ReviewItem label="អត្តសញ្ញាណប័ណ្ណ" value={form.national_id || "—"} />
                  <ReviewItem label="ឈ្មោះខ្មែរ" value={`${form.last_name_kh} ${form.first_name_kh}`} />
                  <ReviewItem label="ឈ្មោះឡាតាំង" value={`${form.last_name_en} ${form.first_name_en}`} />
                  <ReviewItem label="ភេទ" value={form.gender === "Male" ? "ប្រុស" : form.gender === "Female" ? "ស្រី" : "ផ្សេងៗ"} />
                  <ReviewItem label="ថ្ងៃខែឆ្នាំកំណើត" value={form.date_of_birth} />
                  <ReviewItem label="លេខទូរសព្ទ" value={form.phone_number} />
                  <ReviewItem label="អ៊ីមែល" value={form.email || "—"} />
                  <ReviewItem label="Telegram" value={form.telegram_username || "—"} />
                  <ReviewItem label="អាសយដ្ឋាន" value={form.current_address_details || "—"} />
                  <ReviewItem label="ទីតាំង" value={getVillageCode() || "—"} />
                  <ReviewItem label="ឋានៈ" value={form.party_role} />
                  <ReviewItem label="ថ្ងៃចុះឈ្មោះ" value={form.join_date} />
                  <ReviewItem label="ប្រភេទ" value={form.membership_type} />
                  <ReviewItem label="កម្រិត" value={form.membership_tier} />
                  <ReviewItem label="លើកលែងបង់រំលោះ" value={form.exempt_from_dues ? "បាទ/ចាស" : "ទេ"} />
                </div>
                <button type="button" className="btn btn-secondary" style={{ marginTop: "0.75rem" }} onClick={() => setStep(1)}>
                  កែប្រែព័ត៌មាន
                </button>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <div>
              {step > 1 && (
                <button type="button" className="btn btn-secondary" onClick={prev}>
                  <LuArrowLeft /> មុន
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate("/membership")}>
                បោះបង់
              </button>
              {step < 5 ? (
                <button type="button" className="btn btn-primary" onClick={next}>
                  បន្ទាប់ <LuArrowRight />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "កំពុងរក្សាទុក..." : <><LuCheck /> រក្សាទុក</>}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div>
      <span className="profile-detail-label">{label}</span>
      <span className="profile-detail-value">{value}</span>
    </div>
  );
}
