import { useState, useEffect, useCallback } from "react";
import { LuArrowLeft, LuSave } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../api/admin";
import { FEATURE_LABELS } from "../utils/permissions";

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

  const toggle = (role, feature) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role]?.[feature],
      },
    }));
  };

  const saveRole = async (role) => {
    setSavingRole(role);
    setMessage("");
    setError("");
    try {
      await adminAPI.updateRolePermissions(role, matrix[role] || {});
      setMessage(`បានរក្សាទុកសិទ្ធិ ${ROLE_LABELS[role] || role}`);
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
        ROLE_ORDER.map((role) => (
          <div className="card mb-1" key={role}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 className="report-section-heading" style={{ margin: 0 }}>
                {ROLE_LABELS[role] || role}
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => saveRole(role)}
                disabled={savingRole === role}
              >
                <LuSave /> {savingRole === role ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
              </button>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th style={{ width: 120 }}>Allow</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature) => (
                    <tr key={`${role}-${feature}`}>
                      <td>{FEATURE_LABELS[feature] || feature}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!matrix[role]?.[feature]}
                          onChange={() => toggle(role, feature)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
