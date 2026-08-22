import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuSave, LuPlus,
  LuPencil, LuTrash2, LuChevronUp, LuChevronDown, LuLayers,
  LuHouse, LuSettings, LuUsers, LuUserCheck, LuWallet, LuFolder, LuClipboardList,
  LuFileText, LuActivity, LuMapPin, LuListOrdered
} from "react-icons/lu";
import { modulesAPI } from "../../api/modules";
import { adminAPI } from "../../api/admin";
import { useModules } from "../../hooks/useModules";
import { useToast } from "../../components/Toast";
import PageHeader from "../../components/PageHeader";
import Select from "../../components/Select";
import FormModal from "../../components/FormModal";

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
  dashboard: LuHouse,
  settings: LuSettings,
  membership: LuUsers,
  voters: LuUserCheck,
  finances: LuWallet,
  files: LuFolder,
  records: LuClipboardList,
  reports: LuFileText,
  performance: LuActivity,
  zone_chiefs: LuMapPin,
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
  const [originalSteps, setOriginalSteps] = useState({});
  const [draftSteps, setDraftSteps] = useState({});
  const [users, setUsers] = useState([]);

  // Workflow Modal State
  const [workflowModalKey, setWorkflowModalKey] = useState(null);

  const fetchUsersIfNeeded = () => {
    if (users.length === 0) {
      adminAPI.getUsers()
        .then((uRes) => {
          const uData = uRes.data?.data || uRes.data || [];
          setUsers(Array.isArray(uData) ? uData : []);
        })
        .catch(() => setUsers([]));
    }
  };

  const openWorkflowModal = (moduleKey) => {
    fetchUsersIfNeeded();
    setWorkflowModalKey(moduleKey);
  };

  useEffect(() => {
    setLoading(true);
    modulesAPI.list()
      .then((res) => {
        const data = res.data?.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setOriginal(arr);
        setDraft(JSON.parse(JSON.stringify(arr)));

        const stepsMap = {};
        arr.forEach((m) => {
          stepsMap[m.module_key] = Array.isArray(m.steps) ? m.steps : [];
        });
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

  const workflowModule = draft.find((m) => m.module_key === workflowModalKey) || null;

  const toggleEnabled = (mKey) => {
    if (mKey === "dashboard") return;
    setDraft((prev) => prev.map((x) => x.module_key === mKey ? { ...x, enabled: !x.enabled } : x));
  };

  const toggleApproval = (mKey) => {
    setDraft((prev) => prev.map((x) => {
      if (x.module_key !== mKey) return x;
      const willNeedApproval = !x.need_approval;
      if (willNeedApproval) {
        const current = draftSteps[mKey] || [];
        if (current.length === 0) {
          addStepLocal(mKey);
        }
      }
      return { ...x, need_approval: willNeedApproval };
    }));
  };

  const addStepLocal = (moduleKey) => {
    const current = draftSteps[moduleKey] || [];
    const maxOrder = current.reduce((max, s) => Math.max(max, s.step_order || 0), 0);
    const firstUser = users[0] || null;
    const tempStep = {
      id: "new-" + Date.now(),
      module_key: moduleKey,
      step_order: maxOrder + 1,
      step_label: "",
      approver_role: firstUser?.role || "district_chief",
      approver_id: firstUser?.id || null,
      can_reject: true,
      _new: true,
    };
    setDraftSteps((prev) => ({ ...prev, [moduleKey]: [...current, tempStep] }));
  };

  const removeStepLocal = (moduleKey, stepId) => {
    setDraftSteps((prev) => {
      const remaining = (prev[moduleKey] || []).filter((s) => s.id !== stepId);
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

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    const reordered = current.map((s, idx) => ({ ...s, step_order: idx + 1 }));
    setDraftSteps((prev) => ({ ...prev, [moduleKey]: reordered }));
  };

  const handleSave = async () => {
    for (const m of draft) {
      if (m.need_approval) {
        const curSteps = draftSteps[m.module_key] || [];
        if (curSteps.length === 0) {
          toast.error(`សូមបន្ថែមយ៉ាងហោចណាស់ ១ ជំហានអនុម័ត សម្រាប់ម៉ូឌុល ${MODULE_LABELS[m.module_key] || m.module_key}!`);
          setWorkflowModalKey(m.module_key);
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
        if (Object.keys(patch).length > 0) {
          await modulesAPI.update(m.module_key, patch);
        }

        const origSteps = originalSteps[m.module_key] || [];
        const curSteps = draftSteps[m.module_key] || [];

        for (const s of curSteps) {
          if (s._new) {
            await modulesAPI.createStep(m.module_key, {
              step_label: s.step_label || "",
              approver_role: s.approver_role,
              approver_id: s.approver_id || null,
              can_reject: s.can_reject,
            });
          } else {
            const origStep = origSteps.find((o) => o.id === s.id);
            if (origStep && (s.step_label !== origStep.step_label || s.approver_role !== origStep.approver_role || s.can_reject !== origStep.can_reject || s.approver_id !== origStep.approver_id || s.step_order !== origStep.step_order)) {
              await modulesAPI.updateStep(m.module_key, s.id, {
                step_label: s.step_label || "",
                approver_role: s.approver_role,
                approver_id: s.approver_id || null,
                can_reject: s.can_reject,
              });
            }
          }
        }

        const curIds = new Set(curSteps.filter((s) => !s._new).map((s) => s.id));
        for (const s of origSteps) {
          if (!curIds.has(s.id)) {
            await modulesAPI.deleteStep(m.module_key, s.id);
          }
        }
      }

      toast.success("រក្សាទុកការកែប្រែអ្នកអនុម័ត (Workflow) បានសម្រេច!");
      await refreshModules();

      const res = await modulesAPI.list();
      const data = res.data?.data || res.data;
      const arr = Array.isArray(data) ? data : [];
      setOriginal(arr);
      setDraft(JSON.parse(JSON.stringify(arr)));

      const newStepsMap = {};
      arr.forEach((m) => {
        newStepsMap[m.module_key] = Array.isArray(m.steps) ? m.steps : [];
      });
      setOriginalSteps(JSON.parse(JSON.stringify(newStepsMap)));
      setDraftSteps(JSON.parse(JSON.stringify(newStepsMap)));
      setWorkflowModalKey(null);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "រក្សាទុកមិនបានសម្រេច");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ paddingBottom: "2rem" }}>
      <PageHeader
        showBack={() => navigate("/settings")}
        title="អ្នកអនុម័ត (Workflow Approvers)"
        subtitle="បើក/បិទការអនុម័ត និងរៀបចំជំហានអនុម័តតាមម៉ូឌុល"
        icon={<LuListOrdered size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "អ្នកអនុម័ត" },
        ]}
        actions={
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !isDirty()}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.55rem 1.1rem", fontWeight: "600" }}
          >
            <LuSave size={18} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកែប្រែ"}
          </button>
        }
      />

      {loading && <div className="loading" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>កំពុងផ្ទុកបញ្ជីម៉ូឌុល...</div>}

      {fetchError && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && (
        <div className="card" style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "0.85rem 1.25rem", fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>ម៉ូឌុលប្រព័ន្ធ (Module)</th>
                <th style={{ textAlign: "left", padding: "0.85rem 1rem", fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>ស្ថានភាពម៉ូឌុល</th>
                <th style={{ textAlign: "left", padding: "0.85rem 1rem", fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>ការអនុម័ត (Need Approval)</th>
                <th style={{ textAlign: "center", padding: "0.85rem 0.75rem", fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>ចំនួនជំហាន</th>
                <th style={{ textAlign: "right", padding: "0.85rem 1.25rem", fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>សកម្មភាព (Actions)</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((m, idx) => {
                const isSystem = m.module_key === "dashboard";
                const currentSteps = (draftSteps[m.module_key] || []).sort((a, b) => a.step_order - b.step_order);
                const IconComp = MODULE_ICONS[m.module_key] || LuLayers;

                return (
                  <tr key={m.module_key} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#fafbfc" }}>
                    {/* Module Name & Icon */}
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div style={{ padding: "0.45rem", background: "#f0f9ff", borderRadius: "8px", color: "#0284c7", display: "flex" }}>
                          <IconComp size={19} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem" }}>
                            {MODULE_LABELS[m.module_key] || m.module_key}
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{m.module_key}</div>
                        </div>
                      </div>
                    </td>

                    {/* Enable Toggle */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "left" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, cursor: isSystem ? "not-allowed" : "pointer" }}>
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          disabled={isSystem}
                          onChange={() => toggleEnabled(m.module_key)}
                          style={{ width: "16px", height: "16px", accentColor: "#166534", cursor: isSystem ? "not-allowed" : "pointer" }}
                        />
                        {m.enabled ? <span style={{ color: "#15803d" }}>បើកដំណើរការ</span> : <span style={{ color: "#94a3b8" }}>បិទ</span>}
                      </label>
                    </td>

                    {/* Need Approval Toggle */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "left" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={m.need_approval}
                          onChange={() => toggleApproval(m.module_key)}
                          style={{ width: "16px", height: "16px", accentColor: "#0284c7", cursor: "pointer" }}
                        />
                        {m.need_approval ? <span style={{ color: "#0284c7" }}>ត្រូវការ</span> : <span style={{ color: "#64748b" }}>គ្មាន</span>}
                      </label>
                    </td>

                    {/* Workflow Step Counter */}
                    <td style={{ padding: "0.85rem 0.75rem", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "6px",
                          background: currentSteps.length > 0 ? "#f0f9ff" : "#f8fafc",
                          color: currentSteps.length > 0 ? "#0284c7" : "#94a3b8",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {currentSteps.length} ជំហាន
                      </span>
                    </td>

                    {/* Edit Workflow Button */}
                    <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openWorkflowModal(m.module_key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          borderRadius: "8px",
                          fontWeight: "600",
                          padding: "0.4rem 0.85rem",
                          fontSize: "0.82rem",
                          border: "1px solid #ddd6fe",
                          background: "#f5f3ff",
                          color: "#6d28d9",
                        }}
                        title="កំណត់អ្នកអនុម័ត (Workflow Steps)"
                      >
                        <LuPencil size={13} /> កែប្រែ Workflow ({currentSteps.length} ជំហាន)
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* WORKFLOW MODAL POPUP */}
      <FormModal
        open={!!workflowModule}
        onClose={() => setWorkflowModalKey(null)}
        title={`កំណត់អ្នកអនុម័ត ៖ ${MODULE_LABELS[workflowModule?.module_key] || workflowModule?.module_key || ""}`}
        subtitle={`គ្រប់គ្រង ជំហានអនុម័ត បុគ្គលទទួលខុសត្រូវ និងឈ្មោះជំហានផ្ទាល់ខ្លួន`}
        maxWidth="680px"
        showFooter={true}
        cancelText="បិទ"
        rightActions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setWorkflowModalKey(null)}
            style={{ borderRadius: "8px" }}
          >
            យល់ព្រម
          </button>
        }
      >
        {workflowModule && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Need Approval Card */}
            <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={workflowModule.need_approval}
                  onChange={() => toggleApproval(workflowModule.module_key)}
                  style={{ width: "18px", height: "18px", accentColor: "#0284c7" }}
                />
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>ត្រូវការការអនុម័ត (Need Approval Workflow)</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {workflowModule.need_approval ? "ត្រូវឆ្លងកាត់ជំហានពិនិត្យអនុម័តខាងក្រោម" : "គ្មានការអនុម័ត (ចេញផ្សាយផ្ទាល់)"}
                  </div>
                </div>
              </label>
            </div>

            {/* Steps Chain List */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <LuListOrdered size={16} style={{ color: "#0284c7" }} /> អ្នកអនុម័ត (Approval Chain):
                </h4>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addStepLocal(workflowModule.module_key)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", borderRadius: "8px", fontWeight: "600", padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                >
                  <LuPlus size={14} /> បន្ថែមជំហានពិនិត្យ
                </button>
              </div>

              {(draftSteps[workflowModule.module_key] || []).length === 0 ? (
                <div style={{ padding: "1.25rem", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                  មិនទាន់មានជំហានអនុម័តនៅឡើយទេ — ចុច «+ បន្ថែមជំហានពិនិត្យ» ដើម្បីរៀបចំ
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {(draftSteps[workflowModule.module_key] || []).sort((a, b) => a.step_order - b.step_order).map((step, idx) => (
                    <div
                      key={step.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.65rem",
                        padding: "0.85rem 1rem",
                        background: "#ffffff",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      }}
                    >
                      {/* Step Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0284c7", background: "#e0f2fe", padding: "0.25rem 0.6rem", borderRadius: "6px" }}>
                            ជំហានទី {idx + 1}
                          </span>
                          {/* Reorder Buttons */}
                          <div style={{ display: "flex", gap: "0.15rem" }}>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === 0}
                              onClick={() => moveStepOrder(workflowModule.module_key, idx, -1)}
                              title="លើកឡើងលើ"
                            >
                              <LuChevronUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === (draftSteps[workflowModule.module_key] || []).length - 1}
                              onClick={() => moveStepOrder(workflowModule.module_key, idx, 1)}
                              title="ទម្លាក់ចុះក្រោម"
                            >
                              <LuChevronDown size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Delete Step Button */}
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          onClick={() => removeStepLocal(workflowModule.module_key, step.id)}
                          title="លុបជំហាននេះ"
                        >
                          <LuTrash2 size={15} />
                        </button>
                      </div>

                      {/* Form Body: 2-Column Layout */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "0.75rem", alignItems: "center" }}>
                        {/* Step Label */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
                            ឈ្មោះជំហាន (Custom Step Label)
                          </label>
                          <input
                            type="text"
                            placeholder={`ឧទាហរណ៍ ៖ ពិនិត្យដំបូង, មេឃុំអនុម័ត`}
                            value={step.step_label || ""}
                            onChange={(e) => updateStepLocal(workflowModule.module_key, step.id, "step_label", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "0.45rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.82rem",
                              background: "#ffffff",
                            }}
                          />
                        </div>

                        {/* Approver Select */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
                            បុគ្គលអនុម័ត (Approver Person)
                          </label>
                          <Select
                            value={step.approver_id || ""}
                            onChange={(e) => {
                              const uid = e.target.value;
                              const u = users.find((x) => x.id === uid);
                              updateStepLocal(workflowModule.module_key, step.id, "approver_id", uid || null);
                              updateStepLocal(workflowModule.module_key, step.id, "approver_role", u?.role || step.approver_role);
                            }}
                            style={{ width: "100%", fontSize: "0.82rem" }}
                          >
                            <option value="">— ជ្រើសរើសបុគ្គលអនុម័ត —</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name} ({ROLES.find((r) => r.value === u.role)?.label || u.role})
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {/* Footer: Can Reject Checkbox */}
                      <div style={{ paddingTop: "0.35rem", borderTop: "1px dashed #f1f5f9" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", fontWeight: "600", color: "#334155", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={step.can_reject}
                            onChange={(e) => updateStepLocal(workflowModule.module_key, step.id, "can_reject", e.target.checked)}
                            style={{ cursor: "pointer", accentColor: "#dc2626" }}
                          />
                          អនុញ្ញាតឱ្យបុគ្គលនេះបដិសេធបាន (Allow Approver to Reject)
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
}
