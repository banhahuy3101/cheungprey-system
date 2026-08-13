import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuSave, LuPlus,
  LuPencil, LuTrash2, LuChevronUp, LuChevronDown
} from "react-icons/lu";
import { modulesAPI } from "../../api/modules";
import { useModules } from "../../hooks/useModules";
import { useToast } from "../../components/Toast";
import Select from "../../components/Select";

const ROLES = [
  { value: "super_admin", label: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់ (Super Admin)" },
  { value: "admin", label: "អ្នកគ្រប់គ្រង (Admin)" },
  { value: "district_chief", label: "ប្រធានស្រុក (District Chief)" },
  { value: "commune_chief", label: "មេឃុំ/ប្រធានឃុំ (Commune Chief)" },
  { value: "commune_clerk", label: "ស្មៀនឃុំ (Commune Clerk)" },
  { value: "village_chief", label: "ប្រធានភូមិ (Village Chief)" },
  { value: "recorder", label: "អ្នកកត់ត្រា (Recorder)" },
  { value: "regular_user", label: "អ្នកប្រើប្រាស់ទូទៅ (Regular User)" },
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
  zone_chiefs: "ថ្នាក់ដឹកនាំតំបន់",
};

const MODULE_ICONS = {
  dashboard: "🏠",
  settings: "⚙️",
  membership: "👥",
  voters: "🗳️",
  finances: "💰",
  files: "📁",
  records: "📋",
  reports: "📄",
  performance: "📊",
  zone_chiefs: "🗺️",
};

const DEFAULT_ACTIONS = { read: true, create: true, update: true, delete: true };
const ACTION_LABELS = [
  { key: "read", label: "👁️ មើល", color: "#2563eb" },
  { key: "create", label: "➕ បង្កើត", color: "#166534" },
  { key: "update", label: "✏️ កែប្រែ", color: "#b45309" },
  { key: "delete", label: "🗑️ លុប", color: "#dc2626" },
];

function moduleActions(m) {
  const stored = (m.settings && m.settings.actions) || {};
  return { ...DEFAULT_ACTIONS, ...stored };
}

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
    setLoading(true);
    modulesAPI.list()
      .then(async (res) => {
        const data = res.data?.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setOriginal(arr);
        setDraft(JSON.parse(JSON.stringify(arr)));

        // Fetch actual workflow steps for all modules
        const stepsMap = {};
        await Promise.all(
          arr.map(async (m) => {
            try {
              const sRes = await modulesAPI.listSteps(m.module_key);
              const sData = sRes.data?.data || sRes.data || [];
              stepsMap[m.module_key] = Array.isArray(sData) ? sData : [];
            } catch {
              stepsMap[m.module_key] = [];
            }
          })
        );
        setOriginalSteps(JSON.parse(JSON.stringify(stepsMap)));
        setDraftSteps(JSON.parse(JSON.stringify(stepsMap)));
      })
      .catch((err) => {
        setFetchError(err.response?.data?.error || err.message || "Failed to load modules");
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty = () => {
    return JSON.stringify(draft) !== JSON.stringify(original)
      || JSON.stringify(draftSteps) !== JSON.stringify(originalSteps);
  };

  const toggleEnabled = (m) => {
    if (m.module_key === "dashboard") return;
    setDraft((prev) => prev.map((x) => x.module_key === m.module_key ? { ...x, enabled: !x.enabled } : x));
  };

  const toggleApproval = (m) => {
    const willNeedApproval = !m.need_approval;
    setDraft((prev) => prev.map((x) => x.module_key === m.module_key ? { ...x, need_approval: willNeedApproval } : x));

    if (willNeedApproval) {
      setExpanded(m.module_key);
      const current = draftSteps[m.module_key] || [];
      if (current.length === 0) {
        addStepLocal(m.module_key);
      }
    }
  };

  const toggleAllowEdit = (m) => {
    setDraft((prev) => prev.map((x) => x.module_key === m.module_key ? { ...x, allow_edit: !(x.allow_edit !== false) } : x));
  };

  const toggleAction = (m, actionKey) => {
    setDraft((prev) => prev.map((x) => {
      if (x.module_key !== m.module_key) return x;
      const actions = { ...moduleActions(x), [actionKey]: !moduleActions(x)[actionKey] };
      return { ...x, settings: { ...(x.settings || {}), actions } };
    }));
  };

  const toggleAllActions = (m) => {
    const current = moduleActions(m);
    const allOn = Object.keys(current).every((k) => current[k]);
    const next = Object.fromEntries(Object.keys(DEFAULT_ACTIONS).map((k) => [k, !allOn]));
    setDraft((prev) => prev.map((x) => x.module_key === m.module_key
      ? { ...x, settings: { ...(x.settings || {}), actions: next } }
      : x));
  };

  const toggleExpand = (moduleKey) => {
    setExpanded((prev) => (prev === moduleKey ? null : moduleKey));
  };

  const addStepLocal = (moduleKey) => {
    const current = draftSteps[moduleKey] || [];
    const maxOrder = current.reduce((max, s) => Math.max(max, s.step_order || 0), 0);
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
    setDraftSteps((prev) => {
      const remaining = (prev[moduleKey] || []).filter((s) => s.id !== stepId);
      // Re-index step_order sequentially
      const reindexed = remaining.map((s, idx) => ({ ...s, step_order: idx + 1 }));
      return { ...prev, [moduleKey]: reindexed };
    });
  };

  const updateStepLocal = (moduleKey, stepId, field, value) => {
    setDraftSteps((prev) => ({
      ...prev,
      [moduleKey]: (prev[moduleKey] || []).map((s) => s.id === stepId ? { ...s, [field]: value } : s),
    }));
  };

  const moveStepOrder = (moduleKey, index, direction) => {
    const current = [...(draftSteps[moduleKey] || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    // Swap elements
    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    // Update step_order values sequentially
    const reordered = current.map((s, idx) => ({ ...s, step_order: idx + 1 }));
    setDraftSteps((prev) => ({ ...prev, [moduleKey]: reordered }));
  };

  const handleSave = async () => {
    // Validate that approval modules have at least 1 step
    for (const m of draft) {
      if (m.need_approval) {
        const curSteps = draftSteps[m.module_key] || [];
        if (curSteps.length === 0) {
          toast.error(`សូមបន្ថែមយ៉ាងហោចណាស់ ១ ជំហានអនុម័ត សម្រាប់ម៉ូឌុល ${MODULE_LABELS[m.module_key] || m.module_key}!`);
          setExpanded(m.module_key);
          return;
        }
      }
    }

    setSaving(true);
    try {
      for (const m of draft) {
        const orig = original.find((o) => o.module_key === m.module_key);
        if (!orig) continue;
        const patch = {};
        if (m.enabled !== orig.enabled) patch.enabled = m.enabled;
        if (m.need_approval !== orig.need_approval) patch.need_approval = m.need_approval;
        if (m.allow_edit !== orig.allow_edit) patch.allow_edit = m.allow_edit;
        const origActions = JSON.stringify(moduleActions(orig));
        const newActions = JSON.stringify(moduleActions(m));
        if (origActions !== newActions) {
          patch.settings = { ...(m.settings || {}), actions: moduleActions(m) };
        }
        if (Object.keys(patch).length > 0) {
          await modulesAPI.update(m.module_key, patch);
        }

        const origSteps = originalSteps[m.module_key] || [];
        const curSteps = draftSteps[m.module_key] || [];

        // Save changes to workflow steps if module needs approval or has existing steps
        for (const s of curSteps) {
          if (s._new) {
            await modulesAPI.createStep(m.module_key, {
              approver_role: s.approver_role,
              can_reject: s.can_reject,
            });
          } else {
            const origStep = origSteps.find((o) => o.id === s.id);
            if (origStep && (s.approver_role !== origStep.approver_role || s.can_reject !== origStep.can_reject || s.step_order !== origStep.step_order)) {
              await modulesAPI.updateStep(m.module_key, s.id, {
                approver_role: s.approver_role,
                can_reject: s.can_reject,
              });
            }
          }
        }

        // Delete removed steps
        const curIds = new Set(curSteps.filter((s) => !s._new).map((s) => s.id));
        for (const s of origSteps) {
          if (!curIds.has(s.id)) {
            await modulesAPI.deleteStep(m.module_key, s.id);
          }
        }
      }

      toast.success("រក្សាទុកកែប្រែការកំណត់ម៉ូឌុល និង Workflow បានសម្រេច!");
      await refreshModules();

      // Refresh local steps state from backend
      const updatedOriginal = JSON.parse(JSON.stringify(draft));
      setOriginal(updatedOriginal);

      const newStepsMap = {};
      await Promise.all(
        draft.map(async (m) => {
          try {
            const sRes = await modulesAPI.listSteps(m.module_key);
            newStepsMap[m.module_key] = sRes.data?.data || sRes.data || [];
          } catch {
            newStepsMap[m.module_key] = [];
          }
        })
      );
      setOriginalSteps(JSON.parse(JSON.stringify(newStepsMap)));
      setDraftSteps(JSON.parse(JSON.stringify(newStepsMap)));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "រក្សាទុកមិនបានសម្រេច");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft />
          </button>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: "1.35rem" }}>
              ការគ្រប់គ្រងម៉ូឌុល និង Workflow (Module & Approval Settings)
            </h2>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              កំណត់ដំណើរការអនុម័ត ជំហានពិនិត្យ (Approval Steps) និងបើក/បិទម៉ូឌុលប្រព័ន្ធ
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !isDirty()}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "10px", padding: "0.6rem 1.25rem", fontWeight: "600" }}
          >
            <LuSave size={18} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកែប្រែ"}
          </button>
        </div>
      </div>

      {loading && <div className="loading" style={{ padding: "2rem", textAlign: "center" }}>កំពុងផ្ទុកការកំណត់...</div>}

      {fetchError && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && draft.length === 0 && (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          មិនមានម៉ូឌុលក្នុងប្រព័ន្ធ
        </div>
      )}

      {!loading && draft.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Module CRUD Actions Table */}
          <div className="card" style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                ម៉ូឌុលប្រព័ន្ធ (Module) — កំណត់សិទ្ធិមើល/បង្កើត/កែប្រែ/លុប
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem" }}>
                Tick/Untick ដើម្បីបើក/បិទសកម្មភាពនីមួយៗនៃម៉ូឌុលនីមួយៗ
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem 1.25rem", fontSize: "0.8rem", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>ម៉ូឌុលប្រព័ន្ធ (Module)</th>
                  {ACTION_LABELS.map((a) => (
                    <th key={a.key} style={{ textAlign: "center", padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                      {a.label}
                    </th>
                  ))}
                  <th style={{ textAlign: "center", padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                    បើកទាំងអស់
                  </th>
                  <th style={{ textAlign: "center", padding: "0.75rem 1.25rem", fontSize: "0.8rem", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>សកម្មភាព (Actions)</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((m, idx) => {
                  const actions = moduleActions(m);
                  const allOn = Object.keys(actions).every((k) => actions[k]);
                  return (
                    <tr key={m.module_key} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fafbfc" }}>
                      <td style={{ padding: "0.65rem 1.25rem", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: "1.15rem" }}>{MODULE_ICONS[m.module_key] || "📦"}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>
                              {MODULE_LABELS[m.module_key] || m.module_key}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{m.module_key}</div>
                          </div>
                        </div>
                      </td>
                      {ACTION_LABELS.map((a) => (
                        <td key={a.key} style={{ textAlign: "center", padding: "0.65rem 0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                          <input
                            type="checkbox"
                            checked={!!actions[a.key]}
                            onChange={() => toggleAction(m, a.key)}
                            style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: a.color }}
                            title={a.label}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: "center", padding: "0.65rem 0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                        <input
                          type="checkbox"
                          checked={allOn}
                          onChange={() => toggleAllActions(m)}
                          style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#334155" }}
                          title="បើកទាំងអស់ (Enable All)"
                        />
                      </td>
                      <td style={{ textAlign: "center", padding: "0.65rem 1.25rem", borderBottom: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleExpand(m.module_key)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", borderRadius: "8px", fontWeight: "600", padding: "0.35rem 0.7rem", fontSize: "0.78rem" }}
                        >
                          <LuPencil size={13} /> Workflow ({moduleActions(m) && (draftSteps[m.module_key] || []).length} ជំហាន)
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {draft.map((m) => {
            const isSystem = m.module_key === "dashboard";
            const isExpanded = expanded === m.module_key;
            const currentSteps = (draftSteps[m.module_key] || []).sort((a, b) => a.step_order - b.step_order);

            return (
              <div
                key={m.module_key}
                className="card"
                style={{
                  overflow: "hidden",
                  borderRadius: "14px",
                  border: isExpanded ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                  boxShadow: isExpanded ? "0 4px 12px rgba(59, 130, 246, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    background: isExpanded ? "#f8fafc" : "#ffffff",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {MODULE_LABELS[m.module_key] || m.module_key}
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", background: "#f1f5f9", padding: "0.1rem 0.45rem", borderRadius: "6px" }}>
                        {m.module_key}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    {/* Enable Checkbox */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: "600", cursor: isSystem ? "not-allowed" : "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        disabled={isSystem}
                        onChange={() => toggleEnabled(m)}
                        style={{ cursor: isSystem ? "not-allowed" : "pointer" }}
                      />
                      {m.enabled ? <span style={{ color: "#166534" }}>បើកដំណើរការ (Enabled)</span> : <span style={{ color: "#94a3b8" }}>បិទ (Disabled)</span>}
                    </label>

                    {/* Need Approval Checkbox */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={m.need_approval}
                        onChange={() => toggleApproval(m)}
                        style={{ cursor: "pointer" }}
                      />
                      {m.need_approval ? <span style={{ color: "#2563eb" }}>ត្រូវការការអនុម័ត (Approval)</span> : <span style={{ color: "#64748b" }}>គ្មានការអនុម័ត</span>}
                    </label>

                    {/* Allow Edit in Transaction Checkbox */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={m.allow_edit !== false}
                        onChange={() => toggleAllowEdit(m)}
                        style={{ cursor: "pointer" }}
                      />
                      {m.allow_edit !== false ? <span style={{ color: "#7c3aed" }}>អនុញ្ញាតឱ្យកែប្រែ (Allow Edit)</span> : <span style={{ color: "#94a3b8" }}>បិទការកែប្រែ</span>}
                    </label>

                    {/* Step Count & Expand Button */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleExpand(m.module_key)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        borderRadius: "8px",
                        fontWeight: "600",
                        padding: "0.4rem 0.85rem",
                        fontSize: "0.82rem",
                        background: isExpanded ? "#eff6ff" : "#f8fafc",
                        borderColor: isExpanded ? "#93c5fd" : "#cbd5e1",
                        color: isExpanded ? "#1d4ed8" : "#475569",
                      }}
                    >
                      <LuPencil size={14} /> ⚙️ កែប្រែ Workflow ({currentSteps.length} ជំហាន)
                    </button>
                  </div>
                </div>

                {/* Workflow Steps Editor Panel */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid #e2e8f0",
                      padding: "1.25rem",
                      background: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#334155" }}>
                        📋 ខ្សែសង្វាក់អនុម័ត — {MODULE_LABELS[m.module_key] || m.module_key} (Approval Chain)
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        {m.need_approval ? "មាតិកាក្នុងម៉ូឌុលនេះត្រូវឆ្លងកាត់ជំហានខាងក្រោម" : "⚠️ ម៉ូឌុលនេះបានបិទការអនុម័ត (រាល់មាតិកានឹងចេញផ្សាយផ្ទាល់)"}
                      </span>
                    </div>

                    {currentSteps.length === 0 ? (
                      <div style={{ padding: "1.25rem", textAlign: "center", background: "#ffffff", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                        មិនទាន់មានជំហានអនុម័តនៅឡើយទេ — ចុច «+ បន្ថែមជំហានពិនិត្យ» ដើម្បីរៀបចំ
                      </div>
                    ) : (
                      currentSteps.map((step, idx) => (
                        <div
                          key={step.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            background: "#ffffff",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#2563eb",
                              background: "#eff6ff",
                              padding: "0.25rem 0.65rem",
                              borderRadius: "6px",
                              flexShrink: 0,
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            ជំហានទី {idx + 1}
                          </span>

                          <div style={{ flex: 1, minWidth: "220px" }}>
                            <Select
                              value={step.approver_role}
                              onChange={(e) => updateStepLocal(m.module_key, step.id, "approver_role", e.target.value)}
                              style={{ width: "100%", fontSize: "0.85rem" }}
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontSize: "0.82rem",
                              fontWeight: "600",
                              color: "#334155",
                              cursor: "pointer",
                              userSelect: "none",
                              padding: "0.35rem 0.65rem",
                              background: "#f1f5f9",
                              borderRadius: "6px",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={step.can_reject}
                              onChange={(e) => updateStepLocal(m.module_key, step.id, "can_reject", e.target.checked)}
                              style={{ cursor: "pointer" }}
                            />
                            អាចបដិសេធបាន (Can Reject)
                          </label>

                          {/* Move up / down buttons */}
                          <div style={{ display: "flex", gap: "0.2rem" }}>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === 0}
                              onClick={() => moveStepOrder(m.module_key, idx, -1)}
                              title="លើកឡើងលើ"
                            >
                              <LuChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === currentSteps.length - 1}
                              onClick={() => moveStepOrder(m.module_key, idx, 1)}
                              title="ទម្លាក់ចុះក្រោម"
                            >
                              <LuChevronDown size={16} />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn-icon btn-danger"
                            onClick={() => removeStepLocal(m.module_key, step.id)}
                            title="លុបជំហាននេះ"
                          >
                            <LuTrash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.25rem" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => addStepLocal(m.module_key)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", borderRadius: "8px", fontWeight: "600" }}
                      >
                        <LuPlus size={16} /> + បន្ថែមជំហានពិនិត្យ (Add Step)
                      </button>
                    </div>
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
