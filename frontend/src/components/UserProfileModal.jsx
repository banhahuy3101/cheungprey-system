import { useState, useEffect } from "react";
import { LuPencil, LuTrash2, LuKey } from "react-icons/lu";
import FormModal from "./FormModal";
import { adminAPI } from "../api/admin";
import { useRoleOptions, getRoleBadgeStyle } from "../hooks/useRoleOptions";

function RoleCheckboxes({ roleOptions, roles, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {roleOptions.map((opt) => {
        const checked = roles.includes(opt.value);
        return (
          <label
            key={opt.value}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.65rem",
              borderRadius: "8px",
              border: checked ? "1px solid #4f46e5" : "1px solid #e2e8f0",
              background: checked ? "#eeeffe" : "#ffffff",
              fontSize: "0.83rem",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(opt.value)}
              style={{ accentColor: "#4f46e5" }}
            />
            <span style={{ fontWeight: checked ? 600 : 400, color: checked ? "#3730a3" : "#475569" }}>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function UserProfileModal({
  user,
  open,
  onClose,
  onSaved,
  canUpdate = true,
  canDelete = false,
  currentUserId = "",
  roleOptions: customRoleOptions,
  onResetPassword,
  onDeleteUser,
  maxWidth = "700px",
}) {
  const { roleOptions: defaultRoleOptions, roleLabelMap } = useRoleOptions();
  const roleOptions = customRoleOptions || defaultRoleOptions;

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    zone_code: "",
    role: "",
    roles: [],
    password: "",
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user && open) {
      const userRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
      setForm({
        full_name: user.full_name || user.name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        zone_code: user.zone_code || "",
        role: userRoles[0] || "",
        roles: userRoles,
        password: "",
      });
      setEditing(false);
      setError("");
      setSuccess("");
    }
  }, [user, open]);

  if (!open || !user) return null;

  const toggleRole = (r) => {
    setForm((prev) => {
      const has = prev.roles.includes(r);
      const next = has ? prev.roles.filter((x) => x !== r) : [...prev.roles, r];
      return { ...prev, roles: next, role: next[0] || "" };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setError("");
    setSuccess("");
    const email = form.email?.trim();
    const phone = form.phone_number?.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("សូមបញ្ចូលអ៊ីមែលឲ្យបានត្រឹមត្រូវ (ឧ. name@example.com)");
      setSaving(false);
      return;
    }
    if (phone && !/^(?:0[0-9]{8,9}|\+855[0-9]{8,9})$/.test(phone)) {
      setError("លេខទូរស័ព្ទត្រូវមានទម្រង់ 0xx ឬ +855 (9-13 ខ្ទង់)");
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        email,
        phone_number: phone,
        zone_code: form.zone_code,
        roles: form.roles?.length ? form.roles : (form.role ? [form.role] : []),
      };
      if (form.password?.trim()) {
        payload.password = form.password.trim();
      }
      await adminAPI.updateUser(user.id, payload);
      setSuccess("ធ្វើបច្ចុប្បន្នភាពព័ត៌មានរូបដោយជោគជ័យ!");
      setEditing(false);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "រក្សាទុកមិនបានសម្រេច");
    } finally {
      setSaving(false);
    }
  };

  const leftActions = !editing ? (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {canDelete && onDeleteUser && user.id !== currentUserId && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ color: "#dc2626", borderColor: "#fecaca" }}
          onClick={() => {
            const targetId = user.id;
            onClose?.();
            onDeleteUser(targetId);
          }}
        >
          <LuTrash2 size={16} /> លុប
        </button>
      )}
      {canUpdate && onResetPassword && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onResetPassword(user)}
        >
          <LuKey size={16} /> កំណត់ពាក្យសម្ងាត់
        </button>
      )}
    </div>
  ) : null;

  const rightActions = !editing ? (
    canUpdate ? (
      <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
        <LuPencil size={16} /> កែប្រែ
      </button>
    ) : null
  ) : (
    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
      បោះបង់
    </button>
  );

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`👤 ព័ត៌មានអ្នកប្រើប្រាស់ — ${form.full_name || user.email}`}
      maxWidth={maxWidth}
      onSubmit={editing ? handleSave : undefined}
      saving={saving}
      submitText="រក្សាទុកកែប្រែ"
      cancelText={editing ? undefined : "បិទ"}
      error={error}
      success={success}
      leftActions={leftActions}
      rightActions={rightActions}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Information Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
              គោត្តនាម និងនាម (Full Name)
            </label>
            <input
              className="modern-form-input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              disabled={!editing}
              placeholder="បញ្ចូលឈ្មោះ..."
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
              លេខទូរស័ព្ទ (Phone)
            </label>
            <input
              className="modern-form-input"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              disabled={!editing}
              placeholder="បញ្ចូលលេខទូរស័ព្ទ..."
              inputMode="tel"
              maxLength={13}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
              អ៊ីមែល (Email)
            </label>
            <input
              type="email"
              className="modern-form-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!editing}
              placeholder="បញ្ចូលអ៊ីមែល..."
              maxLength={100}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
              កូដតំបន់ (Zone Code)
            </label>
            <input
              className="modern-form-input"
              value={form.zone_code}
              onChange={(e) => setForm({ ...form, zone_code: e.target.value })}
              disabled={!editing}
              placeholder="បញ្ចូលកូដតំបន់..."
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Roles Section */}
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.5rem", display: "block" }}>
            តួនាទី (Roles)
          </label>
          {editing ? (
            <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <RoleCheckboxes roleOptions={roleOptions} roles={form.roles} onToggle={toggleRole} />
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.4rem 0" }}>
              {form.roles?.map((r) => (
                <span
                  key={r}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: "0.83rem",
                    fontWeight: "600",
                    ...getRoleBadgeStyle(r),
                  }}
                >
                  {roleLabelMap[r] || r}
                </span>
              ))}
            </div>
          )}
        </div>

        {editing && (
          <div>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
              ពាក្យសម្ងាត់ថ្មី (New Password)
            </label>
            <input
              type="password"
              className="modern-form-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មីប្រសិនបើចង់ផ្លាស់ប្តូរ (ទុកទទេបើមិនដូរ)..."
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </FormModal>
  );
}
