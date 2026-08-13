import { useState, useEffect, useCallback } from "react";
import {
  LuShieldCheck,
  LuClock,
  LuCheckCircle2,
  LuXCircle,
  LuChevronRight,
  LuUserCheck,
  LuMessageSquare,
  LuPenTool,
  LuAlertCircle,
} from "react-icons/lu";
import { approvalsAPI, modulesAPI } from "../../api/modules";
import { useAuth } from "../../hooks/useAuth";

const ROLE_LABELS_KM = {
  super_admin: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់ (Super Admin)",
  admin: "អ្នកគ្រប់គ្រង (Admin)",
  province_chief: "ប្រធានខេត្ត (Province Chief)",
  district_chief: "អភិបាលស្រុក (District Chief)",
  commune_chief: "ប្រធានឃុំ (Commune Chief)",
  commune_clerk: "ស្ទើរឃុំ (Commune Clerk)",
  village_chief: "មេភូមិ (Village Chief)",
  recorder: "មន្ត្រីត្រួតពិនិត្យ (Recorder)",
  regular_user: "អ្នកប្រើប្រាស់ទូទៅ (Regular User)",
};

export default function PendingWorkflowCard({
  moduleKey = "reports",
  itemId,
  status,
  onStatusChange,
}) {
  const { user } = useAuth();
  const [steps, setSteps] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError("");
    try {
      const [stepsRes, histRes] = await Promise.all([
        modulesAPI.listSteps(moduleKey).catch(() => ({ data: [] })),
        approvalsAPI.history(moduleKey, itemId).catch(() => ({ data: [] })),
      ]);

      const fetchedSteps = stepsRes.data?.data ?? stepsRes.data ?? [];
      const fetchedHist = histRes.data?.data ?? histRes.data ?? [];

      setSteps(Array.isArray(fetchedSteps) ? fetchedSteps : []);
      setHistory(Array.isArray(fetchedHist) ? fetchedHist : []);
    } catch {
      setError("មិនអាចទាញយកទិន្នន័យ Workflow តាមកំណត់ប្រព័ន្ធបានទេ");
    } finally {
      setLoading(false);
    }
  }, [moduleKey, itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!itemId || (steps.length === 0 && history.length === 0 && !loading)) {
    return null;
  }

  // Determine current active pending approval step
  const activeApproval = history.find((h) => h.status === "pending");
  const approvedStepsCount = history.filter((h) => h.status === "approved").length;
  const isRejected = status === "rejected" || history.some((h) => h.status === "rejected");
  const isPublished = status === "published";

  // Find step definition for active pending approval
  const activeStepDef = activeApproval
    ? steps.find((s) => s.step_order === activeApproval.step_order)
    : null;

  // Check if current user is authorized for the active step
  const requiredRole = activeStepDef?.approver_role;
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canUserApprove =
    !!activeApproval &&
    (canAccess(user, FEATURES.settings) ||
      canAccess(user, FEATURES.users) ||
      canAccess(user, moduleKey, "update") ||
      canAccess(user, `${moduleKey}_admin`) ||
      (requiredRole && userRoles.includes(requiredRole)));

  const handleApproveStep = async () => {
    if (!activeApproval) return;
    setProcessing(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await approvalsAPI.approve(activeApproval.id, { notes: notes.trim() });
      const msg = res.data?.message || "បានអនុម័តជំហាននេះដោយជោគជ័យ";
      setSuccessMsg(msg);
      setNotes("");
      setShowRejectInput(false);
      await loadData();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "អនុម័តមិនបានសម្រេច");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectStep = async () => {
    if (!activeApproval) return;
    if (!notes.trim()) {
      setError("សូមបញ្ចូលមូលហេតុនៃការបដិសេធ");
      return;
    }
    setProcessing(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await approvalsAPI.reject(activeApproval.id, { notes: notes.trim() });
      const msg = res.data?.message || "បានបដិសេធជំហាននេះ";
      setSuccessMsg(msg);
      setNotes("");
      setShowRejectInput(false);
      await loadData();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "បដិសេធមិនបានសម្រេច");
    } finally {
      setProcessing(false);
    }
  };

  const totalStepsCount = steps.length || history.length || 1;
  const progressPercent = Math.min(
    100,
    Math.round((approvedStepsCount / totalStepsCount) * 100)
  );

  return (
    <div
      className="card"
      style={{
        borderRadius: "16px",
        border: isRejected
          ? "1px solid #fca5a5"
          : isPublished
          ? "1px solid #86efac"
          : "1px solid #bfdbfe",
        background: isRejected
          ? "#fef2f2"
          : isPublished
          ? "#f0fdf4"
          : "#ffffff",
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        marginBottom: "1.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: isRejected
            ? "#fee2e2"
            : isPublished
            ? "#dcfce7"
            : "#eff6ff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: isRejected
                ? "#dc2626"
                : isPublished
                ? "#166534"
                : "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LuShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
              ដំណាក់កាលអនុម័តតាម Workflow (Module Workflow Status)
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {isPublished
                ? "បានអនុម័តគ្រប់ជំហានរួចរាល់ (Workflow Complete)"
                : isRejected
                ? "បានបដិសេធត្រឹមជំហាននេះ (Workflow Suspended)"
                : `ជំហានទី ${approvedStepsCount + 1} នៃ ${totalStepsCount} ៖ កំពុងរង់ចាំការពិនិត្យ`}
            </div>
          </div>
        </div>

        {/* Progress Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "120px",
              height: "8px",
              borderRadius: "4px",
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${isPublished ? 100 : progressPercent}%`,
                height: "100%",
                background: isRejected
                  ? "#dc2626"
                  : isPublished
                  ? "#166534"
                  : "#2563eb",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: isRejected
                ? "#dc2626"
                : isPublished
                ? "#166534"
                : "#2563eb",
            }}
          >
            {isPublished ? "100%" : `${progressPercent}%`}
          </span>
        </div>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {/* Workflow Timeline Stepper */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "0.75rem",
            marginBottom: "1.25rem",
            borderBottom: "1px dashed #cbd5e1",
          }}
        >
          {(steps.length > 0 ? steps : history).map((s, idx) => {
            const stepNum = s.step_order || idx + 1;
            const histItem = history.find((h) => h.step_order === stepNum);
            const isDone = histItem?.status === "approved";
            const isStepRejected = histItem?.status === "rejected";
            const isCurrent = activeApproval?.step_order === stepNum;
            const roleName =
              ROLE_LABELS_KM[s.approver_role] ||
              s.approver_role ||
              `ជំហានទី ${stepNum}`;

            return (
              <div
                key={stepNum}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: "10px",
                    background: isDone
                      ? "#f0fdf4"
                      : isStepRejected
                      ? "#fef2f2"
                      : isCurrent
                      ? "#eff6ff"
                      : "#f8fafc",
                    border: isDone
                      ? "1px solid #86efac"
                      : isStepRejected
                      ? "1px solid #fca5a5"
                      : isCurrent
                      ? "1.5px solid #2563eb"
                      : "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.8rem",
                    fontWeight: isCurrent ? 700 : 600,
                    color: isDone
                      ? "#166534"
                      : isStepRejected
                      ? "#dc2626"
                      : isCurrent
                      ? "#1e40af"
                      : "#64748b",
                  }}
                >
                  {isDone ? (
                    <LuCheckCircle2 size={16} color="#166534" />
                  ) : isStepRejected ? (
                    <LuXCircle size={16} color="#dc2626" />
                  ) : isCurrent ? (
                    <LuClock size={16} color="#2563eb" />
                  ) : (
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#cbd5e1",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                      }}
                    >
                      {stepNum}
                    </span>
                  )}
                  <span>
                    {stepNum}. {roleName}
                  </span>
                </div>

                {idx < (steps.length || history.length) - 1 && (
                  <LuChevronRight size={16} color="#94a3b8" />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Active Step Action Banner */}
        {activeApproval && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              background: canUserApprove ? "#eff6ff" : "#f8fafc",
              border: canUserApprove
                ? "1px solid #bfdbfe"
                : "1px solid #e2e8f0",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: canUserApprove ? "#1e40af" : "#334155",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <LuUserCheck size={18} />
                  <span>
                    រង់ចាំការពិនិត្យពី ៖{" "}
                    <strong>
                      {ROLE_LABELS_KM[requiredRole] ||
                        requiredRole ||
                        "អ្នកគ្រប់គ្រង"}
                    </strong>
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#64748b",
                    marginTop: "0.2rem",
                  }}
                >
                  {canUserApprove ? (
                    <span style={{ color: "#166534", fontWeight: 700 }}>
                      ✓ អ្នកមានសិទ្ធិពិនិត្យ និងអនុម័តក្នុងជំហាននេះ
                    </span>
                  ) : (
                    `គណនីរបស់អ្នកមិនមានតួនាទីជា ${
                      ROLE_LABELS_KM[requiredRole] || requiredRole
                    } ទេ`
                  )}
                </div>
              </div>

              {/* Action Buttons for Authorized Approver */}
              {canUserApprove && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowRejectInput(!showRejectInput)}
                    disabled={processing}
                    style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                  >
                    <LuXCircle size={15} /> បដិសេធ
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleApproveStep}
                    disabled={processing}
                    style={{ fontWeight: 700 }}
                  >
                    <LuCheckCircle2 size={15} />{" "}
                    {processing ? "កំពុងអនុម័ត..." : "អនុម័តជំហាននេះ"}
                  </button>
                </div>
              )}
            </div>

            {/* Notes / Reason Input Field */}
            {canUserApprove && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ position: "relative" }}>
                  <LuMessageSquare
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="មតិយោបល់ ឬសម្គាល់បន្ថែម (កាតព្វកិច្ចពេលបដិសេធ)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: "100%",
                      paddingLeft: "2.2rem",
                      fontSize: "0.82rem",
                      height: "36px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                </div>

                {showRejectInput && (
                  <div
                    style={{
                      display: "flex",
                      justify: "flex-end",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleRejectStep}
                      disabled={processing || !notes.trim()}
                      style={{ fontWeight: 700 }}
                    >
                      {processing ? "កំពុងបដិសេធ..." : "បញ្ជាក់ការបដិសេធ"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: "1rem",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <LuAlertCircle size={16} /> {error}
          </div>
        )}
        {successMsg && (
          <div
            className="alert alert-success"
            style={{
              marginBottom: "1rem",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <LuCheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* Approval History Logs */}
        {history.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "0.5rem",
              }}
            >
              📋 កំណត់ត្រាប្រវត្តិការអនុម័ត (Approval Log Trail)
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        background:
                          h.status === "approved"
                            ? "#dcfce7"
                            : h.status === "rejected"
                            ? "#fecaca"
                            : "#fef3c7",
                        color:
                          h.status === "approved"
                            ? "#166534"
                            : h.status === "rejected"
                            ? "#991b1b"
                            : "#92400e",
                      }}
                    >
                      {h.status === "approved"
                        ? "✓ អនុម័ត"
                        : h.status === "rejected"
                        ? "✕ បដិសេធ"
                        : "⏳ កំពុងរង់ចាំ"}
                    </span>
                    <span style={{ color: "#334155", fontWeight: 600 }}>
                      ជំហានទី {h.step_order}
                    </span>
                    {h.notes && (
                      <span style={{ color: "#64748b", fontStyle: "italic" }}>
                        — "{h.notes}"
                      </span>
                    )}
                  </div>

                  <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                    {h.updated_at
                      ? new Date(h.updated_at).toLocaleString("km-KH")
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
