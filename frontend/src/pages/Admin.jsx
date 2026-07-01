import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuX, LuKey, LuUser, LuLock, LuCheck, LuMapPin, LuPhone, LuMail, LuShield } from "react-icons/lu";
import { adminAPI } from "../api/admin";
import { useAuth } from "../hooks/useAuth";
import Select from "../components/Select";
import { isAdmin } from "../utils/permissions";
import {
  getDefaultUserPassword,
  createUserFormDefaults,
} from "../config/userSettings";

const ROLE_OPTIONS = [
  { value: "recorder", label: "Recorder" },
  { value: "village_chief", label: "Village Chief" },
  { value: "commune_clerk", label: "Commune Clerk" },
  { value: "commune_chief", label: "Commune Chief" },
  { value: "district_chief", label: "District Chief" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_LABEL_MAP = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

function formatDate(value) {
  if (!value || value.startsWith("0001-01-01")) return "-";
  return value.slice(0, 10);
}

export default function Admin() {
  const { user } = useAuth();
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

  const closeProfile = () => {
    setProfileUser(null);
    setProfileEditing(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      await adminAPI.updateUser(profileUser.id, {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone_number: profileForm.phone_number || undefined,
        zone_code: profileForm.zone_code || undefined,
        roles: profileForm.roles,
      });
      if (profileForm.password) {
        await adminAPI.resetUserPassword(profileUser.id, profileForm.password);
      }
      setProfileSuccess("បានរក្សាទុកដោយជោគជ័យ");
      setProfileEditing(false);
      // Refresh the user data in the list
      fetchData();
      // Update local profile reference
      setProfileUser({
        ...profileUser,
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone_number: profileForm.phone_number || null,
        zone_code: profileForm.zone_code || null,
        role: profileForm.roles?.[0] || profileForm.role,
        roles: profileForm.roles,
      });
      setTimeout(() => setProfileSuccess(""), 2500);
    } catch (err) {
      setProfileError(err.response?.data?.message || "ការរក្សាទុកបរាជ័យ");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileResetPassword = () => {
    setResetTargetUser(profileUser);
  };

  const closeResetPasswordModal = () => {
    if (!resettingId) setResetTargetUser(null);
  };

  const confirmResetPassword = async () => {
    if (!resetTargetUser) return;
    setResettingId(resetTargetUser.id);
    setProfileError("");
    setProfileSuccess("");
    try {
      await adminAPI.resetUserPassword(resetTargetUser.id, defaultPassword);
      const name = resetTargetUser.full_name || resetTargetUser.email;
      setActionMessage(`បាន reset ពាក្យសម្ងាត់: ${name}`);
      setProfileSuccess(`បាន reset ពាក្យសម្ងាត់ទៅដើម`);
      setTimeout(() => {
        setActionMessage("");
        setProfileSuccess("");
      }, 3000);
      setResetTargetUser(null);
    } catch {
      setError("Reset password failed.");
      setProfileError("Reset password failed.");
    } finally {
      setResettingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (editing) {
        await adminAPI.updateUser(editing.id, {
          full_name: form.name,
          email: form.email,
          roles: form.roles?.length ? form.roles : [form.role],
        });
      } else {
        await adminAPI.createUser({
          full_name: form.name,
          email: form.email,
          password: form.password,
          roles: form.roles?.length ? form.roles : [form.role],
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
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

  const RoleCheckboxes = ({ roles, onToggle }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
      {ROLE_OPTIONS.map((r) => (
        <label key={r.value} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={(roles || []).includes(r.value)}
            onChange={() => onToggle(r.value)}
          />
          {r.label}
        </label>
      ))}
    </div>
  );

  const openResetPasswordModal = (u) => {
    setResetTargetUser(u);
  };

  const totalPages = Math.ceil(total / 20);

  if (!isAdmin(user)) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">គ្រប់គ្រងអ្នកប្រើប្រាស់</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <LuPlus /> បន្ថែមអ្នកប្រើប្រាស់
        </button>
      </div>

      {actionMessage && (
        <div className="alert alert-success mb-1">{actionMessage}</div>
      )}

      {stats && (
        <div className="stats-grid mb-1">
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value">{stats.total_users || stats.users_count || 0}</span>
              <span className="stat-label">អ្នកប្រើប្រាស់សរុប</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value">{stats.total_members || stats.members_count || 0}</span>
              <span className="stat-label">សមាជិកសរុប</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value">{stats.total_records || stats.records_count || 0}</span>
              <span className="stat-label">កំណត់ត្រាសរុប</span>
            </div>
          </div>
        </div>
      )}

      <div className="search-bar">
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកអ្នកប្រើប្រាស់..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ឈ្មោះ</th>
                  <th>អ៊ីមែល</th>
                  <th>ទូរស័ព្ទ</th>
                  <th>តំបន់</th>
                  <th>តួនាទី</th>
                  <th>កាលបរិច្ឆេទបង្កើត</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="text-center">គ្មានទិន្នន័យ</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <button
                          className="profile-link-btn"
                          onClick={() => openProfile(u)}
                          title="មើលប្រវត្តិរូប"
                        >
                          {u.full_name || u.name || "-"}
                        </button>
                      </td>
                      <td>{u.email || "-"}</td>
                      <td>{u.phone_number || "-"}</td>
                      <td>{u.zone_name || u.zone_code || "-"}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {(u.roles?.length ? u.roles : [u.role]).map((r) => (
                            <span key={r} className="badge">{ROLE_LABEL_MAP[r] || r}</span>
                          ))}
                        </div>
                      </td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn-icon"
                            onClick={() => openProfile(u)}
                            title="មើលប្រវត្តិរូប"
                          >
                            <LuUser />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => openResetPasswordModal(u)}
                            title="Reset to default password"
                            disabled={resettingId === u.id}
                          >
                            <LuKey />
                          </button>
                          <button className="btn-icon" onClick={() => openEdit(u)} title="កែប្រែ">
                            <LuPencil />
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => handleDelete(u.id)}
                            title="លុប"
                            disabled={u.id === user?.id}
                          >
                            <LuTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>មុន</button>
              <span>ទំព័រ {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>បន្ទាប់</button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? "កែប្រែអ្នកប្រើប្រាស់" : "បន្ថែមអ្នកប្រើប្រាស់ថ្មី"}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><LuX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>ឈ្មោះ *</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>អ៊ីមែល *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ពាក្យសម្ងាត់ {editing ? "(ទុកទទេរបើមិនប្តូរ)" : "*"}</label>
                  <div className="password-field-row">
                    <input
                      name="password"
                      type="text"
                      value={form.password}
                      onChange={handleChange}
                      required={!editing}
                      minLength={6}
                    />
                    {!editing && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setForm({ ...form, password: defaultPassword })}
                      >
                        ប្រើដើម
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>តួនាទី (អាចជ្រើសច្រើន)</label>
                  <RoleCheckboxes roles={form.roles} onToggle={toggleFormRole} />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileUser && (
        <div className="modal-overlay" onClick={closeProfile}>
          <div className="modal modal-profile" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="profile-avatar">
                  <LuUser size={20} />
                </div>
                <h3>ប្រវត្តិរូប</h3>
              </div>
              <button className="btn-icon" onClick={closeProfile}><LuX /></button>
            </div>
            <div className="modal-body">
              {profileSuccess && (
                <div className="alert alert-success">{profileSuccess}</div>
              )}
              {profileError && (
                <div className="alert alert-error">{profileError}</div>
              )}

              {!profileEditing ? (
                <>
                  {/* View mode */}
                  <div className="profile-detail-grid">
                    <div className="profile-detail-item">
                      <span className="profile-detail-label"><LuUser size={14} /> ឈ្មោះ</span>
                      <span className="profile-detail-value">{profileForm.full_name || "-"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label"><LuMail size={14} /> អ៊ីមែល</span>
                      <span className="profile-detail-value">{profileForm.email || "-"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label"><LuPhone size={14} /> លេខទូរស័ព្ទ</span>
                      <span className="profile-detail-value">{profileForm.phone_number || "-"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label"><LuMapPin size={14} /> តំបន់</span>
                      <span className="profile-detail-value">{profileUser.zone_name || profileForm.zone_code || "-"}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label"><LuShield size={14} /> តួនាទី</span>
                      <span className="profile-detail-value">
                        {(profileForm.roles || [profileForm.role]).map((r) => (
                          <span key={r} className="badge" style={{ marginRight: "0.25rem" }}>
                            {ROLE_LABEL_MAP[r] || r}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">ចូលប្រើតាំងពី</span>
                      <span className="profile-detail-value">{formatDate(profileUser.created_at)}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</span>
                      <span className="profile-detail-value">{formatDate(profileUser.updated_at)}</span>
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={handleProfileResetPassword}
                      disabled={profileSaving}
                    >
                      <LuLock size={14} /> Reset ពាក្យសម្ងាត់ទៅដើម
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => setProfileEditing(true)}
                    >
                      <LuPencil size={14} /> កែប្រែប្រវត្តិរូប
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit mode */}
                  <div className="form-group">
                    <label>ឈ្មោះ</label>
                    <input name="full_name" value={profileForm.full_name} onChange={handleProfileChange} />
                  </div>
                  <div className="form-group">
                    <label>អ៊ីមែល</label>
                    <input name="email" type="email" value={profileForm.email} onChange={handleProfileChange} />
                  </div>
                  <div className="form-group">
                    <label>លេខទូរស័ព្ទ</label>
                    <input name="phone_number" value={profileForm.phone_number} onChange={handleProfileChange} />
                  </div>
                  <div className="form-group">
                    <label>តំបន់ (Zone Code)</label>
                    <input name="zone_code" value={profileForm.zone_code} onChange={handleProfileChange} />
                  </div>
                  <div className="form-group">
                    <label>តួនាទី (អាចជ្រើសច្រើន)</label>
                    <RoleCheckboxes roles={profileForm.roles} onToggle={toggleProfileRole} />
                  </div>
                  <div className="form-group">
                    <label>ពាក្យសម្ងាត់ថ្មី (ទុកទទេរបើមិនប្តូរ)</label>
                    <input
                      name="password"
                      type="text"
                      value={profileForm.password}
                      onChange={handleProfileChange}
                      placeholder="ទុកទទេរ"
                    />
                  </div>
                  <div className="profile-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setProfileEditing(false);
                        setProfileForm({
                          ...profileForm,
                          full_name: profileUser.full_name || profileUser.name || "",
                          email: profileUser.email || "",
                          phone_number: profileUser.phone_number || "",
                          zone_code: profileUser.zone_code || "",
                          role: profileUser.role || "recorder",
                          password: "",
                        });
                      }}
                      disabled={profileSaving}
                    >
                      បោះបង់
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                    >
                      {profileSaving ? (
                        "រក្សាទុក..."
                      ) : (
                        <><LuCheck size={14} /> រក្សាទុក</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirm Modal */}
      {resetTargetUser && (
        <div className="modal-overlay modal-overlay-top" onClick={closeResetPasswordModal}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LuKey size={18} />
                <h3>Reset ពាក្យសម្ងាត់</h3>
              </div>
              <button className="btn-icon" onClick={closeResetPasswordModal} disabled={!!resettingId}>
                <LuX />
              </button>
            </div>
            <div className="modal-body">
              <p className="reset-confirm-text">
                Reset password for{" "}
                <strong>{resetTargetUser.full_name || resetTargetUser.name || resetTargetUser.email}</strong>{" "}
                to default?
              </p>
              <div className="reset-confirm-password">
                <span className="reset-confirm-label">ពាក្យសម្ងាត់ដើម</span>
                <code className="default-password-tag">{defaultPassword}</code>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeResetPasswordModal}
                disabled={!!resettingId}
              >
                បោះបង់
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmResetPassword}
                disabled={!!resettingId}
              >
                {resettingId ? "កំពុង reset..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}