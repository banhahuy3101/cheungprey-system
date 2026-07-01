import { useState, useEffect, useCallback } from "react";
import { LuArrowLeft, LuSave, LuPencil } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../api/admin";
import { FEATURE_LABELS } from "../utils/permissions";
import Modal from "./settings/Modal";

const ROLE_ORDER = [
  "super_admin",
  "admin",
  "district_chief",
  "commune_chief",
  "commune_clerk",
  "village_chief",
  "recorder",
  "regular_user",
];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  district_chief: "District Chief",
  commune_chief: "Commune Chief",
  commune_clerk: "Commune Clerk",
  village_chief: "Village Chief",
  recorder: "Recorder",
  regular_user: "Regular User",
};

export default function SettingsRolePermissions() {
  const navigate = useNavigate();
  const [matrix, setMatrix] = useState({});
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [modalPerms, setModalPerms] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [permRes, featRes] = await Promise.all([
        adminAPI.getRolePermissions(),
        adminAPI.getFeatures(),
      ]);
      const rows = permRes.data?.data ?? permRes.data ?? [];
      const featList = featRes.data?.data ?? featRes.data ?? [];
      const next = {};
      for (const row of rows) {
        next[row.role] = { ...(row.permissions || {}) };
      }
      setMatrix(next);
      setFeatures(featList.map((f) => f.key || f));
    } catch {
      setError("ផ្ទុកសិទ្ធិមិនបាន");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (role) => {
    setSelectedRole(role);
    setModalPerms({ ...(matrix[role] || {}) });
    setModalOpen(true);
    setMessage("");
    setError("");
  };

  const toggleModal = (feature) => {
    setModalPerms((prev) => ({ ...prev, [feature]: !prev[feature] }));
  };

  const saveModal = async () => {
    if (!selectedRole) return;
    setSavingRole(selectedRole);
    setMessage("");
    setError("");
    try {
      await adminAPI.updateRolePermissions(selectedRole, modalPerms);
      setMatrix((prev) => ({ ...prev, [selectedRole]: { ...modalPerms } }));
      setMessage(`បានរក្សាទុកសិទ្ធិ ${ROLE_LABELS[selectedRole] || selectedRole}`);
      setModalOpen(false);
    } catch {
      setError("រក្សាទុកមិនបាន");
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">សិទ្ធិតួនាទី (Allow / None)</h2>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <p className="user-settings-help">
        អ្នកប្រើប្រាស់មួយអាចមាន role ច្រើន — បើ role ណាមួយ allow feature មួយ អ្នកប្រើនឹងឃើញ feature នោះ។
      </p>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>តួនាទី</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ORDER.map((role) => (
                  <tr key={role}>
                    <td style={{ fontWeight: 500 }}>{ROLE_LABELS[role] || role}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(role)}>
                        <LuPencil /> កែ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`កែសិទ្ធិ — ${ROLE_LABELS[selectedRole] || selectedRole}`}>
        <div className="table-responsive" style={{ maxHeight: "60vh" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Feature</th>
                <th style={{ width: 80 }}>Allow</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature}>
                  <td>{FEATURE_LABELS[feature] || feature}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!modalPerms[feature]}
                      onChange={() => toggleModal(feature)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn" onClick={() => setModalOpen(false)}>បោះបង់</button>
          <button className="btn btn-primary" onClick={saveModal} disabled={savingRole === selectedRole}>
            <LuSave /> {savingRole === selectedRole ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
