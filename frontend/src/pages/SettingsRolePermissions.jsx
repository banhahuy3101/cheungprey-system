import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuSave, LuPlus, LuTrash2, LuSearch, LuEye, LuPencil, LuUndo2,
  LuShield, LuShieldCheck, LuShieldOff, LuKey, LuUserCog, LuInfo,
} from "react-icons/lu";
import { adminAPI } from "../api/admin";
import { FEATURE_LABELS } from "../utils/permissions";
import ConfirmDialog from "../components/ConfirmDialog";

const ROLE_ORDER = [
  "super_admin", "admin", "province_chief", "district_chief",
  "commune_chief", "commune_clerk", "village_chief", "recorder", "regular_user",
];

const ROLE_LABELS = {
  super_admin: "Super Admin", admin: "Admin", province_chief: "Province Chief",
  district_chief: "District Chief", commune_chief: "Commune Chief",
  commune_clerk: "Commune Clerk", village_chief: "Village Chief",
  recorder: "Recorder", regular_user: "Regular User",
};

const ROLE_COLORS = {
  super_admin: "#7c3aed", admin: "#4f46e5", province_chief: "#0891b2",
  district_chief: "#059669", commune_chief: "#d97706", commune_clerk: "#ca8a04",
  village_chief: "#dc2626", recorder: "#6b7280", regular_user: "#9ca3af",
};

const ROLE_GRADIENTS = {
  super_admin: "linear-gradient(135deg, #7c3aed, #a855f7)",
  admin: "linear-gradient(135deg, #4f46e5, #6366f1)",
  province_chief: "linear-gradient(135deg, #0891b2, #06b6d4)",
  district_chief: "linear-gradient(135deg, #059669, #10b981)",
  commune_chief: "linear-gradient(135deg, #d97706, #f59e0b)",
  commune_clerk: "linear-gradient(135deg, #ca8a04, #eab308)",
  village_chief: "linear-gradient(135deg, #dc2626, #ef4444)",
  recorder: "linear-gradient(135deg, #6b7280, #9ca3af)",
  regular_user: "linear-gradient(135deg, #9ca3af, #cbd5e1)",
};

const FEATURE_GROUPS = [
  { label: "ទូទៅ", icon: "🏠", keys: ["dashboard", "settings"] },
  { label: "សមាជិក", icon: "👥", keys: ["members", "membership_write", "membership_dues", "membership_admin", "membership_cards", "membership_delete"] },
  { label: "ម៉ូឌុល", icon: "📦", keys: ["voters", "files", "records", "reports", "performance", "performance_admin", "finances"] },
  { label: "ប្រព័ន្ធ", icon: "⚙️", keys: ["users", "technical"] },
];

export default function SettingsRolePermissions() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [originalPerms, setOriginalPerms] = useState({});
  const [draftPerms, setDraftPerms] = useState({});
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("view");
  const [selectedRole, setSelectedRole] = useState(null);
  const [search, setSearch] = useState("");
  const [newRole, setNewRole] = useState({ role: "", label: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleRes, permRes, featRes] = await Promise.all([
        adminAPI.getRoles(), adminAPI.getRolePermissions(), adminAPI.getFeatures(),
      ]);
      const roleList = roleRes.data?.data ?? roleRes.data ?? [];
      const rows = permRes.data?.data ?? permRes.data ?? [];
      const featList = featRes.data?.data ?? featRes.data ?? [];

      const merged = [...roleList];
      const known = new Set(merged.map((r) => r.role));
      for (const row of rows) {
        if (!known.has(row.role)) {
          merged.push({ role: row.role, label: row.role, is_system: false });
          known.add(row.role);
        }
      }
      merged.sort((a, b) => {
        const ai = ROLE_ORDER.indexOf(a.role), bi = ROLE_ORDER.indexOf(b.role);
        if (ai >= 0 && bi >= 0) return ai - bi;
        if (ai >= 0) return -1; if (bi >= 0) return 1;
        return a.role.localeCompare(b.role);
      });

      const permsObj = {};
      for (const row of rows) permsObj[row.role] = { ...(row.permissions || {}) };

      setRoles(merged);
      setOriginalPerms(permsObj);
      setDraftPerms(JSON.parse(JSON.stringify(permsObj)));
      setFeatures(featList.map((f) => f.key || f));
      if (merged.length > 0) setSelectedRole(merged[0].role);
    } catch {
      showToast("Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentPerms = draftPerms[selectedRole] || {};
  const originalForRole = originalPerms[selectedRole] || {};
  const isDirty = JSON.stringify(currentPerms) !== JSON.stringify(originalForRole);

  const togglePermission = (f) => {
    setDraftPerms((prev) => ({
      ...prev, [selectedRole]: { ...(prev[selectedRole] || {}), [f]: !(prev[selectedRole]?.[f]) },
    }));
  };

  const setAllInGroup = (keys, v) => {
    setDraftPerms((prev) => {
      const p = { ...(prev[selectedRole] || {}) };
      keys.forEach((k) => { p[k] = v; });
      return { ...prev, [selectedRole]: p };
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await adminAPI.updateRolePermissions(selectedRole, currentPerms);
      setOriginalPerms((p) => ({ ...p, [selectedRole]: { ...currentPerms } }));
      showToast(`Saved — ${ROLE_LABELS[selectedRole] || selectedRole}`);
    } catch {
      showToast("Save failed", "error");
    } finally { setSaving(false); }
  };

  const handleUndo = () => {
    setDraftPerms((p) => ({ ...p, [selectedRole]: { ...(originalPerms[selectedRole] || {}) } }));
  };

  const handleCreate = async () => {
    const key = newRole.role.trim(), label = newRole.label.trim();
    if (!key || !label) return;
    setCreating(true); setCreateError("");
    try {
      await adminAPI.createRole({ role: key, label });
      setNewRole({ role: "", label: "" }); setMode("view");
      await load();
      showToast(`Created — ${label}`);
    } catch (err) {
      setCreateError(err.response?.data?.error || "Failed");
    } finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteRole(deleteTarget);
      if (selectedRole === deleteTarget) setSelectedRole(null);
      await load();
      showToast(`Deleted — ${deleteTarget}`);
    } catch { showToast("Delete failed", "error"); }
    finally { setDeleteTarget(null); }
  };

  const switchMode = (m) => {
    setMode(m); setSearch("");
    if (m === "view") setDraftPerms(JSON.parse(JSON.stringify(originalPerms)));
    if (m === "update" && !selectedRole && roles.length > 0) setSelectedRole(roles[0].role);
  };

  const selectedRoleObj = roles.find((r) => r.role === selectedRole);
  const grantedCount = mode === "view"
    ? Object.values(originalPerms[selectedRole] || {}).filter(Boolean).length
    : Object.values(currentPerms).filter(Boolean).length;
  const customRoles = roles.filter((r) => !r.is_system);

  const filteredGroups = FEATURE_GROUPS.map((g) => ({
    ...g,
    keys: g.keys.filter((k) => {
      if (!features.includes(k)) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (FEATURE_LABELS[k] || k).toLowerCase().includes(s) || k.toLowerCase().includes(s);
    }),
  })).filter((g) => g.keys.length > 0);

  const roleKeyValid = newRole.role.trim() ? /^[a-z][a-z0-9_]*$/.test(newRole.role.trim()) : null;

  if (loading) {
    return (
      <div className="page">
        <div style={{ padding: "5rem 2rem", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid #e5e7eb", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 1.5rem" }} />
          <div style={{ color: "#9ca3af", fontWeight: 500 }}>កំពុងផ្ទុកតួនាទី...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 1000,
          padding: "0.75rem 1.25rem", borderRadius: "12px",
          background: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
          color: toast.type === "error" ? "#dc2626" : "#059669",
          fontWeight: 600, fontSize: "0.85rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => navigate("/settings")}
            style={{ width: 36, height: 36, borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}
          ><LuArrowLeft size={18} /></button>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>តួនាទី & សិទ្ធិ</h1>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>Manage role-based access control for all system features</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Roles", value: roles.length, icon: <LuShield size={18} />, color: "#4f46e5" },
          { label: "System Roles", value: roles.filter((r) => r.is_system).length, icon: <LuShieldCheck size={18} />, color: "#059669" },
          { label: "Custom Roles", value: customRoles.length, icon: <LuKey size={18} />, color: "#d97706" },
          { label: "Features", value: features.length, icon: <LuUserCog size={18} />, color: "#0891b2" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "14px", padding: "1rem 1.25rem", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "0.85rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 42, height: 42, borderRadius: "11px", background: `${s.color}12`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500, marginTop: "0.1rem" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mode Tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.5rem", padding: "0.3rem", background: "#f8fafc", borderRadius: "14px", width: "fit-content" }}>
        {[
          { key: "view", label: "មើល", icon: <LuEye size={15} /> },
          { key: "create", label: "បង្កើត", icon: <LuPlus size={15} /> },
          { key: "update", label: "កែប្រែ", icon: <LuPencil size={15} /> },
          { key: "delete", label: "លុប", icon: <LuTrash2 size={15} /> },
        ].map((t) => (
          <button
            key={t.key} onClick={() => switchMode(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600,
              border: "none", borderRadius: "11px", cursor: "pointer",
              background: mode === t.key ? "#fff" : "transparent",
              color: mode === t.key ? "#4f46e5" : "#64748b",
              boxShadow: mode === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* VIEW MODE */}
      {mode === "view" && (
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
          {/* Role sidebar */}
          <div style={{ width: 260, flexShrink: 0, background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "0.85rem 1.1rem", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>តួនាទី</div>
            <div style={{ maxHeight: "58vh", overflow: "auto" }}>
              {roles.map((r) => {
                const color = ROLE_COLORS[r.role] || "#4f46e5";
                const active = selectedRole === r.role;
                const count = Object.values(originalPerms[r.role] || {}).filter(Boolean).length;
                const pct = Math.round((count / features.length) * 100);
                return (
                  <div
                    key={r.role} onClick={() => setSelectedRole(r.role)}
                    style={{
                      padding: "0.7rem 1.1rem", cursor: "pointer",
                      borderLeft: active ? `3px solid ${color}` : "3px solid transparent",
                      background: active ? "#f8fafc" : undefined,
                      transition: "all 0.1s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "9px",
                        background: active ? ROLE_GRADIENTS[r.role] || color : `${color}18`,
                        color: active ? "#fff" : color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "0.9rem",
                        transition: "all 0.15s",
                      }}>
                        {(ROLE_LABELS[r.role] || r.role)[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: active ? 700 : 500, fontSize: "0.8rem", color: "#0f172a" }}>{ROLE_LABELS[r.role] || r.label || r.role}</div>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{r.role}</div>
                      </div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: color }}>
                        {count}/{features.length}
                      </div>
                    </div>
                    <div style={{ marginTop: "0.4rem", height: 3, borderRadius: "2px", background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "2px", background: color, width: `${pct}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permission cards */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {!selectedRole ? (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", padding: "4rem 2rem", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <LuShield size={48} style={{ color: "#e2e8f0", marginBottom: "1rem" }} />
                <div style={{ fontWeight: 600, fontSize: "1rem", color: "#64748b" }}>ជ្រើសរើសតួនាទី</div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.25rem" }}>Click a role from the sidebar to view its permissions</div>
              </div>
            ) : (
              filteredGroups.map((g) => (
                <div key={g.label} style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                  <div style={{ padding: "0.55rem 1.1rem", background: "#fafafa", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {g.icon} {g.label}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {g.keys.map((f) => {
                      const allowed = !!(originalPerms[selectedRole] || {})[f];
                      return (
                        <div key={f} style={{ width: "50%", padding: "0.5rem 1.1rem", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#334155" }}>{FEATURE_LABELS[f] || f}</div>
                            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{f}</div>
                          </div>
                          <div style={{
                            display: "flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.2rem 0.5rem", borderRadius: "6px",
                            fontSize: "0.68rem", fontWeight: 600,
                            background: allowed ? "#ecfdf5" : "#fef2f2",
                            color: allowed ? "#059669" : "#dc2626",
                          }}>
                            {allowed ? <LuShieldCheck size={12} /> : <LuShieldOff size={12} />}
                            {allowed ? "Allow" : "None"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE MODE */}
      {mode === "create" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "11px", background: "#eff6ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}><LuKey size={18} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>បង្កើតតួនាទីថ្មី</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Create a custom role with specific permissions</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.82rem" }}>Role Key <span style={{ fontWeight: 400, color: "#94a3b8" }}>(snake_case)</span></label>
                  <input
                    value={newRole.role}
                    onChange={(e) => setNewRole({ ...newRole, role: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                    placeholder="my_custom_role"
                    autoFocus
                    style={{
                      borderColor: roleKeyValid === false ? "#dc2626" : roleKeyValid === true ? "#10b981" : undefined,
                      borderRadius: "10px", padding: "0.6rem 0.85rem",
                    }}
                  />
                  {roleKeyValid === true && <div style={{ fontSize: "0.7rem", color: "#10b981", marginTop: "0.2rem" }}>✓ Valid</div>}
                  {roleKeyValid === false && <div style={{ fontSize: "0.7rem", color: "#dc2626", marginTop: "0.2rem" }}>Only a-z, 0-9, underscore. Start with a letter.</div>}
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.82rem" }}>Display Label</label>
                  <input value={newRole.label} onChange={(e) => setNewRole({ ...newRole, label: e.target.value })} placeholder="តួនាទីផ្ទាល់ខ្លួន" style={{ borderRadius: "10px", padding: "0.6rem 0.85rem" }} />
                </div>
                {createError && <div style={{ padding: "0.6rem 0.85rem", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", fontSize: "0.82rem", fontWeight: 500 }}>{createError}</div>}
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-secondary" onClick={() => { setNewRole({ role: "", label: "" }); setCreateError(""); }} style={{ borderRadius: "10px" }}>សម្អាត</button>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !roleKeyValid || !newRole.label.trim()} style={{ borderRadius: "10px" }}>
                    <LuPlus size={14} /> {creating ? "Creating..." : "បង្កើត"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE MODE */}
      {mode === "update" && (
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
          <div style={{ width: 260, flexShrink: 0, background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "0.85rem 1.1rem", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>តួនាទី</div>
            <div style={{ maxHeight: "58vh", overflow: "auto" }}>
              {roles.map((r) => {
                const color = ROLE_COLORS[r.role] || "#4f46e5";
                const active = selectedRole === r.role;
                const count = Object.values(draftPerms[r.role] || {}).filter(Boolean).length;
                const origCount = Object.values(originalPerms[r.role] || {}).filter(Boolean).length;
                const changed = count !== origCount;
                return (
                  <div key={r.role} onClick={() => setSelectedRole(r.role)} style={{ padding: "0.7rem 1.1rem", cursor: "pointer", borderLeft: active ? `3px solid ${color}` : "3px solid transparent", background: active ? "#f8fafc" : undefined }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "9px", background: active ? ROLE_GRADIENTS[r.role] || color : `${color}18`, color: active ? "#fff" : color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}>{(ROLE_LABELS[r.role] || r.role)[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: active ? 700 : 500, fontSize: "0.8rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          {ROLE_LABELS[r.role] || r.role}
                          {changed && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{count} / {features.length} features</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {!selectedRole ? (
              <div style={{ background: "#fff", borderRadius: "16px", padding: "4rem 2rem", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <LuPencil size={48} style={{ color: "#e2e8f0", marginBottom: "1rem" }} />
                <div style={{ fontWeight: 600, color: "#64748b" }}>Select a role to edit</div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                {/* Sticky toolbar */}
                <div style={{ padding: "0.85rem 1.1rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", position: "sticky", top: 0, zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "10px", background: ROLE_GRADIENTS[selectedRole] || ROLE_COLORS[selectedRole], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.95rem" }}>{(ROLE_LABELS[selectedRole] || selectedRole)[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{ROLE_LABELS[selectedRole] || selectedRole}</div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {grantedCount}/{features.length} granted
                        {isDirty && <span style={{ color: "#f59e0b", marginLeft: "0.4rem", fontWeight: 600 }}>• Unsaved</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {isDirty && <button onClick={handleUndo} style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}><LuUndo2 size={13} /> Undo</button>}
                    <button onClick={handleSave} disabled={saving || !isDirty} style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem", borderRadius: "8px", border: "none", background: isDirty ? "#4f46e5" : "#e2e8f0", color: isDirty ? "#fff" : "#94a3b8", cursor: isDirty ? "pointer" : "default", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}><LuSave size={13} /> {saving ? "..." : "Save"}</button>
                  </div>
                </div>

                {/* Search */}
                <div style={{ padding: "0.6rem 1.1rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ position: "relative" }}>
                    <LuSearch size={14} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input placeholder="Filter features..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "0.45rem 0.85rem 0.45rem 2rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.78rem", width: "100%", outline: "none" }} />
                  </div>
                </div>

                {/* Features */}
                <div style={{ maxHeight: "50vh", overflow: "auto" }}>
                  {filteredGroups.map((g) => (
                    <div key={g.label}>
                      <div style={{ padding: "0.35rem 1.1rem", background: "#fafafa", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{g.icon} {g.label}</span>
                        <div style={{ display: "flex", gap: "0.2rem" }}>
                          <button onClick={() => setAllInGroup(g.keys, true)} style={{ fontSize: "0.6rem", padding: "0.15rem 0.4rem", borderRadius: "5px", border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#059669", cursor: "pointer", fontWeight: 600 }}>All</button>
                          <button onClick={() => setAllInGroup(g.keys, false)} style={{ fontSize: "0.6rem", padding: "0.15rem 0.4rem", borderRadius: "5px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontWeight: 600 }}>None</button>
                        </div>
                      </div>
                      {g.keys.map((f) => (
                        <label key={f} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.45rem 1.1rem", cursor: "pointer", borderBottom: "1px solid #f8fafc" }}>
                          <div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#334155" }}>{FEATURE_LABELS[f] || f}</div>
                            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{f}</div>
                          </div>
                          <input type="checkbox" checked={!!currentPerms[f]} onChange={() => togglePermission(f)} style={{ width: "1.05rem", height: "1.05rem", margin: 0, cursor: "pointer", accentColor: "#4f46e5" }} />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODE */}
      {mode === "delete" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}><LuTrash2 size={16} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>លុបតួនាទី</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Only custom roles can be deleted</div>
                </div>
              </div>
            </div>
            {customRoles.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <LuInfo size={36} style={{ color: "#e2e8f0", marginBottom: "0.75rem" }} />
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#64748b" }}>No custom roles to delete</div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.2rem" }}>System roles are permanent and cannot be removed</div>
              </div>
            ) : (
              customRoles.map((r) => (
                <div key={r.role} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>{r.label || r.role}</div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{r.role}</div>
                  </div>
                  <button onClick={() => setDeleteTarget(r.role)} style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}><LuTrash2 size={13} /> លុប</button>
                </div>
              ))
            )}
            <div style={{ padding: "0.75rem 1.25rem", background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                System roles: {roles.filter((r) => r.is_system).map((r) => r.role).join(" · ")}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget} title="លុបតួនាទី"
        message={`Delete "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="លុប" danger
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
