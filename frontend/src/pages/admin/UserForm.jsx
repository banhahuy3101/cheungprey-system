import {
  LuSave,
  LuUser,
  LuPhone,
  LuKey,
  LuMapPin,
  LuShieldCheck,
} from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import MemberSelect from "../../components/MemberSelect";

function RoleCheckboxes({ roleOptions, roles, onToggle }) {
  const options = roleOptions || [];
  return (
    <div className="rbac-role-checkbox-grid">
      {options.map((r) => {
        const checked = (roles || []).includes(r.value);
        return (
          <label
            key={r.value}
            className={`rbac-role-check ${checked ? "active" : ""}`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(r.value)}
              style={{ width: "17px", height: "17px", accentColor: "#2563eb", cursor: "pointer", flexShrink: 0 }}
            />
            <span>{r.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function UserForm({
  editing,
  form,
  setForm,
  error,
  submitting,
  onClose,
  onSubmit,
  roleOptions,
  userZone,
}) {
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleRole = (roleValue) => {
    setForm((prev) => {
      const roles = prev.roles || [];
      const next = roles.includes(roleValue)
        ? roles.filter((r) => r !== roleValue)
        : [...roles, roleValue];
      return { ...prev, roles: next.length ? next : [roleValue], role: next[0] || roleValue };
    });
  };

  const handleSelectMember = (m) => {
    const fullName = `${m.last_name_kh || ""} ${m.first_name_kh || ""}`.trim() || m.full_name || "";
    const zoneCode = m.registered_village_code || m.zone_code || "";
    setForm((prev) => ({
      ...prev,
      name: fullName,
      email: m.email || prev.email,
      phone_number: m.phone_number || prev.phone_number,
      zone_code: zoneCode || prev.zone_code,
      date_of_birth: m.date_of_birth ? m.date_of_birth.slice(0, 10) : prev.date_of_birth,
    }));
    if (zoneCode && userZone?.loadFromZoneCode) {
      userZone.loadFromZoneCode(zoneCode);
    }
  };

  return (
    <div className="page">
      <PageHeader
        showBack={onClose}
        title={editing ? `កែប្រែព័ត៌មានអ្នកប្រើប្រាស់` : "បន្ថែមអ្នកប្រើប្រាស់ថ្មី"}
        subtitle={editing ? `${editing.full_name || editing.name || editing.email}` : "បំពេញទិន្នន័យដើម្បីបង្កើតអ្នកប្រើប្រាស់ថ្មីក្នុងប្រព័ន្ធ"}
        icon={<LuUser size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "គ្រប់គ្រងអ្នកប្រើប្រាស់", path: "/settings/users" },
          { label: editing ? "កែប្រែ" : "បន្ថែមថ្មី" },
        ]}
        actions={!editing && <MemberSelect onSelect={handleSelectMember} />}
      />

      <div className="card" style={{ padding: "1.75rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <form onSubmit={onSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
                <LuUser size={18} style={{ color: "#2563eb" }} />
                <span>ព័ត៌មានមូលដ្ឋាន</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155" }}>គោត្តនាម និងនាម (Full Name) <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    name="name"
                    className="modern-form-input"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="បញ្ចូលឈ្មោះអ្នកប្រើប្រាស់..."
                    required
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155" }}>អ៊ីមែល (Email) <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    name="email"
                    type="email"
                    className="modern-form-input"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    maxLength={100}
                    required
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
                <LuPhone size={18} style={{ color: "#2563eb" }} />
                <span>ទំនាក់ទំនង និងតំបន់</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155" }}>លេខទូរស័ព្ទ (Phone Number)</label>
                  <input
                    name="phone_number"
                    className="modern-form-input"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="ឧ. 012 345 678"
                    inputMode="tel"
                    maxLength={13}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155" }}>ថ្ងៃខែឆ្នាំកំណើត (Date of Birth)</label>
                  <input
                    name="date_of_birth"
                    type="date"
                    className="modern-form-input"
                    value={form.date_of_birth || ""}
                    onChange={handleChange}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155", marginBottom: "0.4rem", display: "block" }}>
                  <LuMapPin size={13} style={{ verticalAlign: "-2px", marginRight: "0.2rem" }} />កូដតំបន់ (Zone) — ខេត្ត / ស្រុក / ឃុំ / ភូមិ
                </label>
                {userZone ? (
                  <ZoneCascadeSelect hook={userZone} showVillage={true} />
                ) : (
                  <input
                    name="zone_code"
                    className="modern-form-input"
                    value={form.zone_code}
                    onChange={handleChange}
                    placeholder="បញ្ចូលកូដតំបន់..."
                    style={{ width: "100%" }}
                  />
                )}
              </div>
            </div>

            {!editing && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
                  <LuKey size={18} style={{ color: "#2563eb" }} />
                  <span>ពាក្យសម្ងាត់</span>
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: "700", fontSize: "0.85rem", color: "#334155" }}>ពាក្យសម្ងាត់ (Password) <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    name="password"
                    type="password"
                    className="modern-form-input"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="បញ្ចូលពាក្យសម្ងាត់យ៉ាងតិច ៦ តួ..."
                    required
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            )}

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#1e3a8a", fontWeight: "700", fontSize: "0.95rem" }}>
                <LuShieldCheck size={18} style={{ color: "#2563eb" }} />
                <span>តួនាទីក្នុងប្រព័ន្ធ (Roles) <span style={{ color: "#dc2626" }}>*</span></span>
              </div>
              <RoleCheckboxes roleOptions={roleOptions} roles={form.roles} onToggle={toggleRole} />
            </div>

            {error && <div className="alert alert-error" style={{ borderRadius: "10px" }}>{error}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #e2e8f0" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: "8px" }}>
              បោះបង់
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", fontWeight: "600" }}
            >
              <LuSave size={16} /> {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "បង្កើតអ្នកប្រើប្រាស់"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
