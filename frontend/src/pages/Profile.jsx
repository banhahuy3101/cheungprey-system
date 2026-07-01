import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuUser, LuMail, LuPhone, LuMapPin, LuShield, LuPencil, LuCheck, LuArrowLeft } from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { adminAPI } from "../api/admin";
import { isAdmin as userIsAdmin } from "../utils/permissions";
import { useRoleOptions } from "../hooks/useRoleOptions";

const ROLE_OPTIONS_FALLBACK = [
  { value: "recorder", label: "Recorder" },
  { value: "village_chief", label: "Village Chief" },
  { value: "commune_clerk", label: "Commune Clerk" },
  { value: "commune_chief", label: "Commune Chief" },
  { value: "district_chief", label: "District Chief" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

function formatDate(value) {
  if (!value || value.startsWith("0001-01-01")) return "-";
  return value.slice(0, 10);
}

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { roleOptions } = useRoleOptions();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    zone_code: user?.zone_code || "",
    role: user?.role || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = userIsAdmin(user);
  const displayRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminAPI.updateUser(user.id, {
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number || undefined,
        zone_code: isAdmin ? (form.zone_code || undefined) : undefined,
        role: isAdmin ? form.role : undefined,
      });
      if (form.password) {
        await adminAPI.resetUserPassword(user.id, form.password);
      }
      setSuccess("បានរក្សាទុកដោយជោគជ័យ");
      setEditing(false);
      if (refreshProfile) refreshProfile();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "ការរក្សាទុកបរាជ័យ");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({
      full_name: user?.full_name || user?.name || "",
      email: user?.email || "",
      phone_number: user?.phone_number || "",
      zone_code: user?.zone_code || "",
      role: user?.role || "",
      password: "",
    });
    setError("");
  };

  if (!user) {
    return <div className="loading">កំពុងផ្ទុក...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate(-1)} title="ត្រឡប់ក្រោយ">
            <LuArrowLeft />
          </button>
          <h2 className="section-title">ប្រវត្តិរូប</h2>
        </div>
        {!editing ? (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <LuPencil size={14} /> កែប្រែ
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
            បោះបង់
          </button>
        )}
      </div>

      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
          <div className="profile-avatar" style={{ width: 56, height: 56 }}>
            <LuUser size={28} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{user.full_name || user.name || "User"}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span className="profile-detail-value">
                {displayRoles.map((r) => (
                  <span key={r} className="badge" style={{ marginRight: "0.25rem" }}>
                    {ROLE_LABEL_MAP[r] || r}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>

        {!editing ? (
          <div className="profile-detail-grid">
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuUser size={14} /> ឈ្មោះ</span>
              <span className="profile-detail-value">{user.full_name || user.name || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuMail size={14} /> អ៊ីមែល</span>
              <span className="profile-detail-value">{user.email || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuPhone size={14} /> លេខទូរស័ព្ទ</span>
              <span className="profile-detail-value">{user.phone_number || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuMapPin size={14} /> តំបន់</span>
              <span className="profile-detail-value">{user.zone_name || user.zone_code || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuShield size={14} /> តួនាទី</span>
              <span className="profile-detail-value">
                {displayRoles.map((r) => (
                  <span key={r} className="badge" style={{ marginRight: "0.25rem" }}>
                    {ROLE_LABEL_MAP[r] || r}
                  </span>
                ))}
              </span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">ចូលប្រើតាំងពី</span>
              <span className="profile-detail-value">{formatDate(user.created_at)}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</span>
              <span className="profile-detail-value">{formatDate(user.updated_at)}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>ឈ្មោះ</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>អ៊ីមែល</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>លេខទូរស័ព្ទ</label>
              <input name="phone_number" value={form.phone_number} onChange={handleChange} />
            </div>
            {isAdmin && (
              <>
                <div className="form-group">
                  <label>តំបន់ (Zone Code)</label>
                  <input name="zone_code" value={form.zone_code} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>តួនាទី</label>
                  <select name="role" value={form.role} onChange={handleChange}>
                    {(roleOptions.length ? roleOptions : ROLE_OPTIONS_FALLBACK).map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="form-group">
              <label>ពាក្យសម្ងាត់ថ្មី (ទុកទទេរបើមិនប្តូរ)</label>
              <input
                name="password"
                type="text"
                value={form.password}
                onChange={handleChange}
                placeholder="ទុកទទេរ"
              />
            </div>
            <div className="profile-actions" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                បោះបង់
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "រក្សាទុក..." : <><LuCheck size={14} /> រក្សាទុក</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}