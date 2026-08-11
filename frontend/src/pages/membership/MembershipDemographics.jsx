import { useState, useEffect } from "react";
import { LuArrowLeft } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import Select from "../../components/Select";

export default function MembershipDemographics({ memberId, onBack }) {
  const [form, setForm] = useState({
    marital_status: "", occupation: "", education_level: "", ethnicity: "",
    religion: "", emergency_contact_name: "", emergency_contact_phone: "", blood_type: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    membershipAPI.getDemographics(memberId).then((res) => {
      const d = res.data?.data || res.data;
      if (d) {
        setForm({
          marital_status: d.marital_status || "",
          occupation: d.occupation || "",
          education_level: d.education_level || "",
          ethnicity: d.ethnicity || "",
          religion: d.religion || "",
          emergency_contact_name: d.emergency_contact_name || "",
          emergency_contact_phone: d.emergency_contact_phone || "",
          blood_type: d.blood_type || "",
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [memberId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await membershipAPI.updateDemographics(memberId, form);
      setSuccess("បានរក្សាទុក");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">កែប្រែទិន្នន័យផ្ទាល់ខ្លួន</h2>
        </div>
      </div>
      <div className="card" style={{ maxWidth: "600px" }}>
        <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-row">
            <div className="form-group">
              <label>ស្ថានភាពអាពាហ៍ពិពាហ៍</label>
              <Select name="marital_status" value={form.marital_status} onChange={handleChange}>
                <option value="">-- ជ្រើសរើស --</option>
                <option value="Single">នៅលីវ</option>
                <option value="Married">រៀបការ</option>
                <option value="Divorced">លែងលះ</option>
                <option value="Widowed">មេម៉ាយ</option>
              </Select>
            </div>
            <div className="form-group">
              <label>មុខរបរ</label>
              <input name="occupation" value={form.occupation} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>កម្រិតសិក្សា</label>
              <Select name="education_level" value={form.education_level} onChange={handleChange}>
                <option value="">-- ជ្រើសរើស --</option>
                <option value="None">គ្មាន</option>
                <option value="Primary">បឋមសិក្សា</option>
                <option value="Secondary">មធ្យមសិក្សា</option>
                <option value="HighSchool">វិទ្យាល័យ</option>
                <option value="Bachelor">បរិញ្ញាបត្រ</option>
                <option value="Master">អនុបណ្ឌិត</option>
                <option value="PhD">បណ្ឌិត</option>
              </Select>
            </div>
            <div className="form-group">
              <label>ជនជាតិ</label>
              <input name="ethnicity" value={form.ethnicity} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>សាសនា</label>
              <Select name="religion" value={form.religion} onChange={handleChange}>
                <option value="">-- ជ្រើសរើស --</option>
                <option value="Buddhist">ព្រះពុទ្ធ</option>
                <option value="Muslim">ឥស្លាម</option>
                <option value="Christian">គ្រិស្ត</option>
                <option value="Other">ផ្សេងៗ</option>
              </Select>
            </div>
            <div className="form-group">
              <label>ប្រភេទឈាម</label>
              <Select name="blood_type" value={form.blood_type} onChange={handleChange}>
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
              <label>ឈ្មោះទំនាក់ទំនងបន្ទាន់</label>
              <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>លេខទូរសព្ទបន្ទាន់</label>
              <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} />
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onBack}>ត្រឡប់</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "រក្សាទុក..." : "រក្សាទុក"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
