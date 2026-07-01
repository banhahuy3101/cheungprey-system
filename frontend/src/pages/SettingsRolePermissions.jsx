import { useState, useEffect, useCallback } from "react";
import { LuArrowLeft, LuSave, LuPlus, LuTrash2, LuPencil } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../api/admin";
import { FEATURE_LABELS } from "../utils/permissions";
import Modal from "./settings/Modal";

export default function SettingsRolePermissions() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [modalPerms, setModalPerms] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ role: "", label: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [roleRes, permRes, featRes] = await Promise.all([
        adminAPI.getRoles(),
        adminAPI.getRolePermissions(),
        adminAPI.getFeatures(),
      ]);
      const roleList = roleRes.data?.data ?? roleRes.data ?? [];
      const rows = permRes.data?.data ?? permRes.data ?? [];
      const featList = featRes.data?.data ?? featRes.data ?? [];

      const mergedRoles = [...roleList];
      const known = new Set(mergedRoles.map((r) => r.role));
      for (const row of rows) {
        if (!known.has(row.role)) {
          mergedRoles.push({ role: row.role, label: row.role, is_system: false });
          known.add(row.role);
        }
      }

      const next = {};
      for (const row of rows) next[row.role] = { ...(row.permissions || {}) };

      setRoles(mergedRoles);
      setMatrix(next);
      setFeatures(featList.map((f) => f.key || f));
    } catch {
      setError("ផ្ទុកសិទ្ធិមិនបាន");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEditPerms = (roleKey) => {
    setSelectedRole(roleKey);
    setModalPerms({ ...(matrix[roleKey] || {}) });
    setModalOpen(true);
    setMessage(""); setError("");
  };

  const toggleModal = (feature) => {
    setModalPerms((prev) => ({ ...prev, [feature]: !prev[feature] }));
  };

  const saveModal = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await adminAPI.updateRolePermissions(selectedRole, modalPerms);
      setMatrix((prev) => ({ ...prev, [selectedRole]: { ...modalPerms } }));
      setMessage(`បានរក្សាទុកសិទ្ធិ ${selectedRole}`);
      setModalOpen(false);
    } catch {
      setError("រក្សាទុកមិនបាន");
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setNewRole({ role: "", label: "" });
    setCreateOpen(true);
    setMessage(""); setError("");
  };

  const createRole = async () => {
    if (!newRole.role || !newRole.label) return;
    setSaving(true);
    try {
      await adminAPI.createRole(newRole);
      setCreateOpen(false);
      await load();
      setMessage(`បានបង្កើតតួនាទី ${newRole.label}`);
    } catch {
      setError("បង្កើតមិនបាន");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleKey) => {
    if (!confirm(`លុបតួនាទី ${roleKey}?`)) return;
    setSaving(true);
    try {
      await adminAPI.deleteRole(roleKey);
      await load();
      setMessage(`បានលុប ${roleKey}`);
    } catch {
      setError("លុបមិនបាន");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">គ្រប់គ្រងតួនាទី</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <LuPlus /> បង្កើតតួនាទីថ្មី
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>តួនាទី</th>
                  <th>Label</th>
                  <th style={{ width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.role}>
                    <td style={{ fontFamily: "monospace" }}>{r.role}</td>
                    <td>{r.label}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditPerms(r.role)} style={{ marginRight: 4 }}>
                        <LuPencil /> សិទ្ធិ
                      </button>
                      {!r.is_system && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRole(r.role)}>
                          <LuTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`កែសិទ្ធិ — ${selectedRole}`}>
        <div className="table-responsive" style={{ maxHeight: "60vh" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Feature</th>
                <th style={{ width: 80 }}>Allow</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f}>
                  <td>{FEATURE_LABELS[f] || f}</td>
                  <td>
                    <input type="checkbox" checked={!!modalPerms[f]} onChange={() => toggleModal(f)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn" onClick={() => setModalOpen(false)}>បោះបង់</button>
          <button className="btn btn-primary" onClick={saveModal} disabled={saving}>
            <LuSave /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="បង្កើតតួនាទីថ្មី">
        <div className="form-group">
          <label>Role key (snake_case)</label>
          <input value={newRole.role} onChange={(e) => setNewRole({ ...newRole, role: e.target.value })} placeholder="my_role" />
        </div>
        <div className="form-group">
          <label>Label (Khmer/English)</label>
          <input value={newRole.label} onChange={(e) => setNewRole({ ...newRole, label: e.target.value })} placeholder="តួនាទីថ្មី" />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn" onClick={() => setCreateOpen(false)}>បោះបង់</button>
          <button className="btn btn-primary" onClick={createRole} disabled={saving || !newRole.role || !newRole.label}>
            <LuPlus /> បង្កើត
          </button>
        </div>
      </Modal>
    </div>
  );
}
