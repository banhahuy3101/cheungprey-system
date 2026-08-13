import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuPencil, LuTrash2, LuSearch, LuKey, LuUser
} from "react-icons/lu";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../settings/Modal";
import DataTable from "../../components/DataTable";
import { canAccess, FEATURES, isAdmin } from "../../utils/permissions";
import { useRoleOptions } from "../../hooks/useRoleOptions";
import AdminHeader from "./AdminHeader";
import AdminStats from "./AdminStats";
import {
  getDefaultUserPassword,
  createUserFormDefaults,
} from "../../config/userSettings";

const ROLE_OPTIONS_FALLBACK = [
  { value: "super_admin", label: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់" },
  { value: "admin", label: "អ្នកគ្រប់គ្រង" },
  { value: "province_chief", label: "ប្រធានខេត្ត" },
  { value: "district_chief", label: "ប្រធានស្រុក" },
  { value: "commune_chief", label: "ប្រធានឃុំ" },
  { value: "commune_clerk", label: "ស្មៀនឃុំ" },
  { value: "village_chief", label: "ប្រធានភូមិ" },
  { value: "recorder", label: "អ្នកកត់ត្រា" },
  { value: "regular_user", label: "អ្នកប្រើប្រាស់ធម្មតា" },
];

const ROLE_BADGE_STYLES = {
  super_admin: { background: "#fce4ec", color: "#c62828", border: "1px solid #f8bbd0" },
  admin: { background: "#e8eaf6", color: "#283593", border: "1px solid #c5cae9" },
  province_chief: { background: "#f3e5f5", color: "#7b1fa2", border: "1px solid #e1bee7" },
  district_chief: { background: "#e0f2f1", color: "#00695c", border: "1px solid #b2dfdb" },
  commune_chief: { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" },
  commune_clerk: { background: "#ede7f6", color: "#4527a0", border: "1px solid #d1c4e9" },
  village_chief: { background: "#fff3e0", color: "#e65100", border: "1px solid #ffe0b2" },
  recorder: { background: "#f1f8e9", color: "#558b2f", border: "1px solid #dedede" },
  regular_user: { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" },
};

function formatDate(value) {
  if (!value || value.startsWith("0001-01-01")) return "-";
  return value.slice(0, 10);
}

function RoleCheckboxes({ roleOptions, roles, onToggle }) {
  const options = roleOptions.length ? roleOptions : ROLE_OPTIONS_FALLBACK;
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

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { roleOptions, roleLabelMap } = useRoleOptions();
  const canCreate = canAccess(user, FEATURES.users, "create");
  const canUpdate = canAccess(user, FEATURES.users, "update");
  const canDelete = canAccess(user, FEATURES.users, "delete");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(createUserFormDefaults());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState(getDefaultUserPassword());
  const [actionMessage, setActionMessage] = useState("");
  const [resettingId, setResettingId] = useState(null);
  const [resetTargetUser, setResetTargetUser] = useState(null);

  // Profile modal state
  const [profileUser, setProfileUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", phone_number: "", zone_code: "", role: "recorder", roles: ["recorder"], password: "" });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  useEffect(() => {
    const syncPassword = () => setDefaultPassword(getDefaultUserPassword());
    syncPassword();
    window.addEventListener("default-password-changed", syncPassword);
    window.addEventListener("focus", syncPassword);
    return () => {
      window.removeEventListener("default-password-changed", syncPassword);
      window.removeEventListener("focus", syncPassword);
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.getUsers({ search, page, limit: 20 }),
        adminAPI.getStatistics(),
      ]);
      const userInner = usersRes.data?.data || usersRes.data;
      setUsers(Array.isArray(userInner) ? userInner : userInner?.users || []);
      setTotal(Array.isArray(userInner) ? userInner.length : userInner?.total || 0);
      setStats(statsRes.data?.data || statsRes.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(createUserFormDefaults());
    setError("");
    setShowModal(true);
  };

  const toggleFormRole = (roleValue) => {
    setForm((prev) => {
      const roles = prev.roles || [];
      const next = roles.includes(roleValue)
        ? roles.filter((r) => r !== roleValue)
        : [...roles, roleValue];
      return { ...prev, roles: next.length ? next : [roleValue], role: next[0] || roleValue };
    });
  };

  const toggleProfileRole = (roleValue) => {
    setProfileForm((prev) => {
      const roles = prev.roles || [];
      const next = roles.includes(roleValue)
        ? roles.filter((r) => r !== roleValue)
        : [...roles, roleValue];
      return { ...prev, roles: next.length ? next : [roleValue], role: next[0] || roleValue };
    });
  };

  const openEdit = (u) => {
    const roles = u.roles?.length ? u.roles : [u.role || "recorder"];
    setEditing(u);
    setForm({
      name: u.full_name || u.name || "",
      email: u.email || "",
      phone_number: u.phone_number || "",
      zone_code: u.zone_code || "",
      password: "",
      role: roles[0],
      roles,
    });
    setError("");
    setShowModal(true);
  };

  const openProfile = (u) => {
    const roles = u.roles?.length ? u.roles : [u.role || "recorder"];
    setProfileUser(u);
    setProfileForm({
      full_name: u.full_name || u.name || "",
      email: u.email || "",
      phone_number: u.phone_number || "",
      zone_code: u.zone_code || "",
      role: roles[0],
      roles,
      password: "",
    });
    setProfileEditing(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleResetPassword = async (u) => {
    setResettingId(u.id);
    setActionMessage("");
    try {
      await adminAPI.resetPassword(u.id, defaultPassword);
      setActionMessage(`ពាក្យសម្ងាត់សម្រាប់ ${u.full_name || u.email} ត្រូវបានកំណត់ឡើងវិញទៅ៖ ${defaultPassword}`);
      setResetTargetUser(null);
      setTimeout(() => setActionMessage(""), 6000);
    } catch {
      setActionMessage("កំណត់ពាក្យសម្ងាត់ឡើងវិញមិនបានសម្រេច");
    } finally {
      setResettingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.name,
        email: form.email,
        phone_number: form.phone_number || undefined,
        zone_code: form.zone_code || undefined,
        roles: form.roles?.length ? form.roles : [form.role],
      };
      if (editing) {
        await adminAPI.updateUser(editing.id, payload);
      } else {
        await adminAPI.createUser({
          ...payload,
          password: form.password,
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "ប្រតិបត្តិការមិនបានសម្រេច");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileSaving(true);
    try {
      const payload = {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone_number: profileForm.phone_number,
        zone_code: profileForm.zone_code,
        roles: profileForm.roles?.length ? profileForm.roles : [profileForm.role],
      };
      if (profileForm.password?.trim()) {
        payload.password = profileForm.password.trim();
      }
      await adminAPI.updateUser(profileUser.id, payload);
      setProfileSuccess("ធ្វើបច្ចុប្បន្នភាពព័ត៌មានរូបដោយជោគជ័យ!");
      setProfileEditing(false);
      fetchData();
      const updated = { ...profileUser, ...payload, role: payload.roles[0] };
      setProfileUser(updated);
    } catch (err) {
      setProfileError(err.response?.data?.message || "រក្សាទុកមិនបានសម្រេច");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបអ្នកប្រើប្រាស់នេះឬ?")) return;
    try {
      await adminAPI.deleteUser(id);
      fetchData();
    } catch {
      //
    }
  };

  const totalPages = Math.ceil(total / 20);

  if (!isAdmin(user)) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  const columns = [
    {
      key: "name",
      label: "អ្នកប្រើប្រាស់ / ឈ្មោះ",
      render: (_, u) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#dbeafe",
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "0.9rem",
              border: "1px solid #bfdbfe",
              flexShrink: 0,
            }}
          >
            {(u.full_name || u.name || u.email || "U").charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            className="link-button"
            onClick={() => openProfile(u)}
            title="មើលប្រវត្តិរូប"
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}
          >
            <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.88rem" }}>{u.full_name || u.name || "-"}</span>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>{u.email || "-"}</span>
          </button>
        </div>
      ),
    },
    {
      key: "phone_number",
      label: "លេខទូរស័ព្ទ",
      render: (val) => <span style={{ color: "#475569" }}>{val || "—"}</span>,
    },
    {
      key: "zone_name",
      label: "តំបន់ / ឃុំ",
      render: (val, row) => <span style={{ color: "#475569" }}>{val || row.zone_code || "—"}</span>,
    },
    {
      key: "roles",
      label: "តួនាទី (Roles)",
      render: (_, u) => {
        const userRoles = u.roles?.length ? u.roles : [u.role || "regular_user"];
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {userRoles.map((r) => (
              <span
                key={r}
                style={{
                  padding: "0.15rem 0.55rem",
                  borderRadius: "20px",
                  fontSize: "0.74rem",
                  fontWeight: "600",
                  display: "inline-block",
                  ...(ROLE_BADGE_STYLES[r] || { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }),
                }}
              >
                {roleLabelMap[r] || r}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "created_at",
      label: "កាលបរិច្ឆេទបង្កើត",
      render: (val) => <span style={{ color: "#64748b" }}>{formatDate(val)}</span>,
    },
    {
      key: "actions",
      label: "សកម្មភាព",
      align: "right",
      width: "140px",
      render: (_, u) => (
        <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => openProfile(u)}
            title="មើលប្រវត្តិរូប (Profile)"
          >
            <LuUser />
          </button>
          {canUpdate && <button
            type="button"
            className="btn-icon"
            onClick={() => setResetTargetUser(u)}
            title="កំណត់ពាក្យសម្ងាត់ឡើងវិញ (Reset Password)"
            disabled={resettingId === u.id}
          >
            <LuKey />
          </button>}
          {canUpdate && <button
            type="button"
            className="btn-icon"
            onClick={() => openEdit(u)}
            title="កែប្រែ (Edit)"
          >
            <LuPencil />
          </button>}
          {canDelete && <button
            type="button"
            className="btn-icon btn-danger"
            onClick={() => handleDelete(u.id)}
            title="លុបអ្នកប្រើប្រាស់"
            disabled={u.id === user?.id}
          >
            <LuTrash2 />
          </button>}
        </div>
      ),
    },
  ];

  return (
    <div className="page rbac-shell">
      <AdminHeader navigate={navigate} onCreate={canCreate ? openCreate : null} />

      {actionMessage && (
        <div className="alert alert-success" style={{ marginBottom: "1.25rem", borderRadius: "10px" }}>
          {actionMessage}
        </div>
      )}

      <AdminStats stats={stats} total={total} users={users} />

      {/* Search Input Bar */}
      <div className="search-bar" style={{ marginBottom: "1.25rem" }}>
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកតាមឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="គ្មានទិន្នន័យអ្នកប្រើប្រាស់"
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Create / Edit User Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? "📝 កែប្រែព័ត៌មានអ្នកប្រើប្រាស់" : "👤 បន្ថែមអ្នកប្រើប្រាស់ថ្មី"}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  គោត្តនាម និងនាម (Full Name) <span style={{ color: "#dc2626" }}>*</span>
                </label>
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

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  អ៊ីមែល (Email) <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  className="modern-form-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  លេខទូរស័ព្ទ (Phone Number)
                </label>
                <input
                  name="phone_number"
                  className="modern-form-input"
                  value={form.phone_number}
                  onChange={handleChange}
                  placeholder="ឧ. 012 345 678"
                  style={{ width: "100%" }}
                />
              </div>

              {!editing && (
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                    ពាក្យសម្ងាត់ (Password) <span style={{ color: "#dc2626" }}>*</span>
                  </label>
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
              )}

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                  តួនាទីក្នុងប្រព័ន្ធ (Roles) <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <RoleCheckboxes roleOptions={roleOptions} roles={form.roles} onToggle={toggleFormRole} />
              </div>

              {error && <div className="alert alert-error" style={{ fontSize: "0.85rem" }}>{error}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  បោះបង់
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "បង្កើតអ្នកប្រើប្រាស់"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Password Reset Confirmation Modal */}
      {resetTargetUser && (
        <Modal
          open={!!resetTargetUser}
          onClose={() => setResetTargetUser(null)}
          title="🔑 កំណត់ពាក្យសម្ងាត់ឡើងវិញ (Reset Password)"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
            <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>
              តើអ្នកពិតជាចង់កំណត់ពាក្យសម្ងាត់សម្រាប់ <strong>{resetTargetUser.full_name || resetTargetUser.email}</strong> ឡើងវិញទៅជាពាក្យសម្ងាត់ដើម (Default Password) មែនទេ?
            </div>
            <div style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748b" }}>ពាក្យសម្ងាត់ដើម៖ </span>
              <code style={{ fontWeight: 700, color: "#1d4ed8", fontSize: "0.95rem" }}>{defaultPassword}</code>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setResetTargetUser(null)}>
                បោះបង់
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleResetPassword(resetTargetUser)}
                disabled={resettingId === resetTargetUser.id}
              >
                {resettingId === resetTargetUser.id ? "កំពុងកំណត់..." : "បញ្ជាក់ការកំណត់"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Profile Detail & Edit Modal */}
      {profileUser && (
        <Modal
          open={!!profileUser}
          onClose={() => setProfileUser(null)}
          title={`👤 ប្រវត្តិរូប — ${profileUser.full_name || profileUser.email}`}
        >
          <form onSubmit={handleProfileSave}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
              {profileSuccess && <div className="alert alert-success">{profileSuccess}</div>}
              {profileError && <div className="alert alert-error">{profileError}</div>}

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  គោត្តនាម និងនាម (Full Name)
                </label>
                <input
                  className="modern-form-input"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  disabled={!profileEditing}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                    អ៊ីមែល (Email)
                  </label>
                  <input
                    type="email"
                    className="modern-form-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    disabled={!profileEditing}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                    លេខទូរស័ព្ទ (Phone)
                  </label>
                  <input
                    className="modern-form-input"
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                    disabled={!profileEditing}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                  តួនាទី (Roles)
                </label>
                {profileEditing ? (
                  <RoleCheckboxes roleOptions={roleOptions} roles={profileForm.roles} onToggle={toggleProfileRole} />
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {profileForm.roles?.map((r) => (
                      <span
                        key={r}
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "20px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          ...(ROLE_BADGE_STYLES[r] || { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }),
                        }}
                      >
                        {roleLabelMap[r] || r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {profileEditing && (
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                    ពាក្យសម្ងាត់ថ្មី (New Password - ទុកទទេប្រសិនបើមិនផ្លាស់ប្តូរ)
                  </label>
                  <input
                    type="password"
                    className="modern-form-input"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                    placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី..."
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                {!profileEditing ? (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => setProfileUser(null)}>
                      បិទ
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => setProfileEditing(true)}>
                      <LuPencil size={16} /> កែប្រែប្រវត្តិរូប
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => setProfileEditing(false)}>
                      បោះបង់
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                      {profileSaving ? "រក្សាទុក..." : "រក្សាទុកកែប្រែ"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
