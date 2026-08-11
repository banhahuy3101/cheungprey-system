import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuShieldCheck, LuPlus, LuX, LuSave } from "react-icons/lu";
import { modulesAPI } from "../../api/modules";
import { useModules } from "../../hooks/useModules";
import { useToast } from "../../components/Toast";
import Select from "../../components/Select";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "district_chief", label: "District Chief" },
  { value: "commune_chief", label: "Commune Chief" },
  { value: "commune_clerk", label: "Commune Clerk" },
  { value: "village_chief", label: "Village Chief" },
  { value: "recorder", label: "Recorder" },
  { value: "regular_user", label: "Regular User" },
];

const MODULE_LABELS = {
  dashboard: "ទំព័រដើម",
  settings: "ការកំណត់",
  membership: "សមាជិក",
  voters: "អ្នកបោះឆ្នោត",
  finances: "ហិរញ្ញវត្ថុ",
  files: "ឯកសារ",
  records: "កំណត់ត្រា",
  reports: "របាយការណ៍",
  performance: "លទ្ធផលការងារ",
};

export default function ModuleSettings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshModules } = useModules();
  const [original, setOriginal] = useState([]);
  const [draft, setDraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [originalSteps, setOriginalSteps] = useState({});
  const [draftSteps, setDraftSteps] = useState({});

  useEffect(() => {
    modulesAPI.list()
      .then((res) => {
        const data = res.data?.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setOriginal(arr);
        setDraft(JSON.parse(JSON.stringify(arr)));
      })
      .catch((err) => {
        setFetchError(err.response?.data?.error || err.message || "Failed to load modules");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadSteps = async (key) => {
    if (draftSteps[key]) return;
    try {
      const res = await modulesAPI.listSteps(key);
      const arr = res.data?.data || res.data || [];
      setOriginalSteps((prev) => ({ ...prev, [key]: JSON.parse(JSON.stringify(arr)) }));
      setDraftSteps((prev) => ({ ...prev, [key]: JSON.parse(JSON.stringify(arr)) }));
    } catch {}
  };

  const isDirty = () => {
    return JSON.stringify(draft) !== JSON.stringify(original)
      || JSON.stringify(draftSteps) !== JSON.stringify(originalSteps);
  };

  const toggleEnabled = (m) => {
    if (m.module_key === "dashboard" || m.module_key === "settings") return;
    setDraft((prev) => prev.map((x) => x.module_key === m.module_key ? { ...x, enabled: !x.enabled } : x));
  };

  const toggleApproval = (m) => {
    setDraft((prev) => prev.map((x) => x.module_key === m.module_key ? { ...x, need_approval: !x.need_approval } : x));
  };

  const addStepLocal = (moduleKey) => {
    const current = draftSteps[moduleKey] || [];
    const maxOrder = current.reduce((max, s) => Math.max(max, s.step_order), 0);
    const tempStep = {
      id: "new-" + Date.now(),
      module_key: moduleKey,
      step_order: maxOrder + 1,
      approver_role: "district_chief",
      can_reject: true,
      _new: true,
    };
    setDraftSteps((prev) => ({ ...prev, [moduleKey]: [...current, tempStep] }));
  };

  const removeStepLocal = (moduleKey, stepId) => {
    setDraftSteps((prev) => ({
      ...prev,
      [moduleKey]: (prev[moduleKey] || []).filter((s) => s.id !== stepId),
    }));
  };

  const updateStepLocal = (moduleKey, stepId, field, value) => {
    setDraftSteps((prev) => ({
      ...prev,
      [moduleKey]: (prev[moduleKey] || []).map((s) => s.id === stepId ? { ...s, [field]: value } : s),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const m of draft) {
        const orig = original.find((o) => o.module_key === m.module_key);
        if (!orig) continue;
        const patch = {};
        if (m.enabled !== orig.enabled) patch.enabled = m.enabled;
        if (m.need_approval !== orig.need_approval) patch.need_approval = m.need_approval;
        if (Object.keys(patch).length > 0) {
          await modulesAPI.update(m.module_key, patch);
        }

        if (m.need_approval) {
          const origSteps = originalSteps[m.module_key] || [];
          const curSteps = draftSteps[m.module_key] || [];

          for (const s of curSteps) {
            if (s._new) {
              await modulesAPI.createStep(m.module_key, {
                approver_role: s.approver_role,
                can_reject: s.can_reject,
              });
            } else {
              const origStep = origSteps.find((o) => o.id === s.id);
              if (origStep && (s.approver_role !== origStep.approver_role || s.can_reject !== origStep.can_reject)) {
                await modulesAPI.updateStep(m.module_key, s.id, {
                  approver_role: s.approver_role,
                  can_reject: s.can_reject,
                });
              }
            }
          }

          const origIds = new Set(origSteps.map((s) => s.id));
          const curIds = new Set(curSteps.filter((s) => !s._new).map((s) => s.id));
          for (const s of origSteps) {
            if (!curIds.has(s.id)) {
              await modulesAPI.deleteStep(m.module_key, s.id);
            }
          }
        }
      }

      setOriginal(JSON.parse(JSON.stringify(draft)));
      const cleanSteps = {};
      for (const [k, v] of Object.entries(draftSteps)) {
        cleanSteps[k] = v.map((s) => ({ ...s, _new: undefined }));
      }
      setOriginalSteps(JSON.parse(JSON.stringify(cleanSteps)));
      setDraftSteps(JSON.parse(JSON.stringify(cleanSteps)));

      toast.success("បានរក្សាទុកការកំណត់");
      refreshModules();
    } catch (err) {
      toast.error("ការរក្សាទុកបរាជ័យ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")}><LuArrowLeft /></button>
          <h2 className="section-title">ការគ្រប់គ្រងម៉ូឌុល</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !isDirty()}
          >
            <LuSave /> {saving ? "រក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      </div>

      {loading && <div className="loading">កំពុងផ្ទុក...</div>}

      {fetchError && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && draft.length === 0 && (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          No modules found
        </div>
      )}

      {!loading && draft.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {draft.map((m) => {
            const isSystem = m.module_key === "dashboard" || m.module_key === "settings";
            const isExpanded = expanded === m.module_key;
            const currentSteps = draftSteps[m.module_key] || [];
            return (
              <div key={m.module_key} className="card" style={{ overflow: "hidden" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", cursor: m.need_approval ? "pointer" : "default" }}
                  onClick={() => m.need_approval && (isExpanded ? setExpanded(null) : (loadSteps(m.module_key), setExpanded(m.module_key)))}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{MODULE_LABELS[m.module_key] || m.module_key}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{m.module_key}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {m.need_approval && (
                      <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                        <LuShieldCheck size={14} /> {currentSteps.length} steps
                      </span>
                    )}
                    <span style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        disabled={isSystem}
                        onChange={() => toggleEnabled(m)}
                        style={{ width: "auto", margin: 0 }}
                      />
                      {m.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <input
                        type="checkbox"
                        checked={m.need_approval}
                        onChange={() => toggleApproval(m)}
                        style={{ width: "auto", margin: 0 }}
                      />
                      Approval
                    </span>
                  </div>
                </div>

                {isExpanded && m.need_approval && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "1rem 1.25rem", background: "var(--bg)" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                      Approval Chain — {MODULE_LABELS[m.module_key] || m.module_key}
                    </div>
                    {currentSteps
                      .sort((a, b) => a.step_order - b.step_order)
                      .map((step) => (
                        <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0.5rem", background: "#fff", borderRadius: "6px", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--primary)", flexShrink: 0, minWidth: "50px" }}>Step {step.step_order}</span>
                          <Select value={step.approver_role} onChange={(e) => updateStepLocal(m.module_key, step.id, "approver_role", e.target.value)}>
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </Select>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                            <input type="checkbox" checked={step.can_reject} onChange={(e) => updateStepLocal(m.module_key, step.id, "can_reject", e.target.checked)} style={{ width: "auto", margin: 0 }} />
                            Reject
                          </label>
                          <button className="btn-icon" onClick={() => removeStepLocal(m.module_key, step.id)} title="Remove"><LuX size={14} /></button>
                        </div>
                      ))}
                    <button className="btn btn-secondary" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }} onClick={() => addStepLocal(m.module_key)}>
                      <LuPlus size={14} /> Add Step
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
