import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuSave, LuPencil, LuDownload,
  LuSend, LuCircleX, LuCircleCheck, LuCalendar, LuRotateCcw,
  LuFileText, LuTag, LuSettings, LuChevronRight, LuMaximize2, LuMinimize2,
} from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { useModules } from "../../hooks/useModules";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import { approvalsAPI } from "../../api/modules";
import TextEditor from "../TextEditor";
import Modal from "../../pages/settings/Modal";
import {
  emptySimpleReportForm,
  buildSimpleReportPayload,
  docToSimpleForm,
  isEmptyContent,
} from "../../utils/reportForm";
import { canAccess, FEATURES } from "../../utils/permissions";
import ReportStatusBadge from "./ReportStatusBadge";
import ReportMoreInfoCard from "./ReportMoreInfoCard";
import ReportWorkflowCard from "./ReportWorkflowCard";
import ReportHistoryCard from "./ReportHistoryCard";
import RejectReportModal from "./RejectReportModal";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReportForm({ mode = "create", reportId }) {
  const { user } = useAuth();
  const { canEditInTransaction, needsApproval } = useModules();
  const allowTransactionEdit = canEditInTransaction("reports");
  const reportsNeedApproval = needsApproval("reports");
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState(emptySimpleReportForm);
  const [reviews, setReviews] = useState([]);
  const [workflow, setWorkflow] = useState([]);
  const [loading, setLoading] = useState(Boolean(reportId) && !isCreate);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationPopup, setValidationPopup] = useState(null);
  const [msg, setMsg] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [showMoreInfo, setShowMoreInfo] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  /* ---- fetch ---- */
  useEffect(() => {
    if (!reportId || isCreate) return;
    let ok = true;
    Promise.all([
      reportDocumentsAPI.getById(reportId),
      reportDocumentsAPI.getReviews(reportId),
      approvalsAPI.history("reports", reportId).catch(() => ({ data: [] })),
    ]).then(([r1, r2, r3]) => {
      if (!ok) return;
      const d = r1.data?.data ?? r1.data;
      setDoc(d);
      setForm(docToSimpleForm(d));
      setReviews(r2.data?.data ?? r2.data ?? []);
      setWorkflow(r3.data?.data ?? r3.data ?? []);
    }).catch(() => { }).finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, [reportId, isCreate]);

  const setField = (k, v) => { setForm(p => ({ ...p, [k]: v })); setFieldErrors(prev => { const n = { ...prev }; delete n[k]; return n; }); setValidationPopup(null); };

  /* ---- actions ---- */
  const doSave = async (e) => {
    e?.preventDefault();
    setError(""); setFieldErrors({});

    const errs = {};
    if (!form.title?.trim()) errs.title = "សូមបញ្ចូលចំណងជើងរបាយការណ៍";
    if (!form.description?.trim()) errs.description = "សូមបញ្ចូលការពិពណ៌នា";
    if (isEmptyContent(form.content)) errs.content = "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setValidationPopup(errs);
      return;
    }

    setSaving(true);
    try {
      const p = buildSimpleReportPayload(form);
      if (isEdit) { await reportDocumentsAPI.updateSimple(reportId, p); navigate(`/reports/${reportId}`); return; }
      const r = await reportDocumentsAPI.createSimple(p);
      const d = r.data?.data ?? r.data;
      if (d?.id) navigate(`/reports/${d.id}`); else setError("រក្សាទុកមិនបាន");
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setValidationPopup(err.response.data.errors);
      } else {
        setError(err.response?.data?.error || "រក្សាទុកមិនបាន");
      }
    }
    finally { setSaving(false); }
  };

  const doDownload = async () => {
    setDownloading(true);
    try { await reportDocumentsAPI.downloadPDF(reportId, form.title); }
    catch (err) { setError(err.message || "ទាញយក PDF មិនបាន"); }
    finally { setDownloading(false); }
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try { await reportDocumentsAPI.submit(reportId); setMsg("បានដាក់ស្នើ"); window.location.reload(); }
    catch (e) { setError(e?.response?.data?.error || "ដាក់ស្នើមិនបាន"); }
    finally { setSubmitting(false); }
  };

  const doPublish = async () => {
    if (reportsNeedApproval) {
      if (!activePending?.id) return;
      setSubmitting(true);
      try {
        await approvalsAPI.approve(activePending.id, { notes: "" });
        setMsg("បានអនុម័តជំហាននេះ");
        window.location.reload();
      }
      catch (e) { setError(e?.response?.data?.error || e?.message || "អនុម័តមិនបាន"); }
      finally { setSubmitting(false); }
      return;
    }
    if (doc?.require_signature && !user?.signature) {
      setError("សូមកំណត់ហត្ថលេខាក្នុងទំព័រប្រវត្តិរូបរបស់អ្នកជាមុនសិន ទើបអាចអនុម័តរបាយការណ៍បាន។");
      return;
    }
    setSubmitting(true);
    try { await reportDocumentsAPI.confirmStatus(reportId); setMsg("បានអនុម័ត"); window.location.reload(); }
    catch (e) { setError(e?.response?.data?.error || "អនុម័តមិនបាន"); }
    finally { setSubmitting(false); }
  };

  const doRevertToDraft = async () => {
    setSubmitting(true);
    try {
      await reportDocumentsAPI.revertToDraft(reportId);
      setMsg("បានបង្វែររបាយការណ៍ទៅជាព្រាងវិញដោយជោគជ័យ");
      window.location.reload();
    }
    catch (e) { setError(e?.response?.data?.error || "បង្វែរទៅជាព្រាងមិនបាន"); }
    finally { setSubmitting(false); }
  };

  const doReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      if (reportsNeedApproval && activePending?.id) {
        await approvalsAPI.reject(activePending.id, { notes: rejectReason.trim() });
      } else {
        await reportDocumentsAPI.reject(reportId, rejectReason.trim());
      }
      setRejectOpen(false); setRejectReason(""); window.location.reload();
    }
    catch (e) { setError(e?.response?.data?.error || "បដិសេធមិនបាន"); }
    finally { setRejecting(false); }
  };

  const canReview = canAccess(user, FEATURES.reports, "update") || canAccess(user, FEATURES.reports, "create");

  const status = doc?.status || "draft";

  const activePending = workflow.find((s) => s.status === "pending");
  const isAssignedApprover =
    !!activePending?.approver_id &&
    user?.id &&
    String(user.id) === String(activePending.approver_id);
  const canActOnPending = (status === "pending_review") && isAssignedApprover;

  if (loading) return (
    <div className="page report-form-page" style={{ maxWidth: "1350px", margin: "0 auto", padding: "0 0.5rem 2rem 0.5rem" }}>
      {/* Toolbar skeleton */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", marginBottom: "1.75rem", background: "rgba(255,255,255,0.85)", borderRadius: "16px", border: "1px solid var(--border)" }}>
        <Skeleton w={180} h={34} r={8} />
        <Skeleton w={100} h={34} r={8} />
      </div>

      {/* 70/30 split skeleton */}
      <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* LEFT 70% */}
        <div style={{ flex: "3 1 640px", minWidth: "300px" }}>
          <div style={{ padding: "1.5rem 2rem", borderRadius: "16px", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem" }}>
            <Skeleton w="80%" h={42} r={6} />
            <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", width: "100%" }} />
            <Skeleton w="55%" h={18} r={4} />
          </div>
          <Skeleton w="100%" h={280} r={10} />
        </div>
        {/* RIGHT 30% */}
        <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
          <div style={{ padding: "1.35rem", borderRadius: "12px", background: "#fff", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1.15rem" }}>
            <Skeleton w="60%" h={16} r={4} />
            <Skeleton w="100%" h={38} r={8} />
            <Skeleton w="100%" h={18} r={4} />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Skeleton w="100%" h={14} r={4} />
              <Skeleton w="100%" h={14} r={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  if (!doc && !isCreate) return <div className="page"><div className="alert alert-error">រកមិនឃើញរបាយការណ៍</div></div>;

  /* ============================================
     CREATE / EDIT
     ============================================ */
  if (isCreate || isEdit) return (
    <div className="page report-form-page" style={{ maxWidth: "1350px", margin: "0 auto", padding: "0 1rem 2rem 1rem" }}>
      <form onSubmit={doSave} noValidate>
        {/* sticky toolbar */}
        <div
          className="report-toolbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1rem 1.5rem",
            marginBottom: "1.75rem",
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: "16px",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
            position: "sticky",
            top: "0",
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", borderRadius: "8px", padding: "0.5rem 1rem", border: "1px solid rgba(0, 0, 0, 0.08)" }}
            >
              <LuArrowLeft size={16} /> ត្រឡប់
            </button>
            <div style={{ height: "24px", width: "1px", background: "rgba(0, 0, 0, 0.08)" }} />
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text)" }}>
              {isCreate ? "បង្កើតរបាយការណ៍ថ្មី" : "កែប្រែរបាយការណ៍"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
              style={{ borderRadius: "8px", padding: "0.5rem 1rem" }}
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.5rem 1.25rem", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.15)" }}
            >
              <LuSave size={16} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
            </button>
          </div>
        </div>

        {error && Object.keys(fieldErrors).length === 0 && <div className="alert alert-error report-form-msg" style={{ marginBottom: "1.25rem", borderRadius: "10px" }}>{error}</div>}

        {validationPopup && (
          <Modal
            open={!!validationPopup}
            onClose={() => setValidationPopup(null)}
            title="⚠️ សូមបំពេញព័ត៌មានឲ្យបានគ្រប់"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
              <div style={{ color: "#7f1d1d", fontSize: "0.9rem" }}>
                សូមពិនិត្យ និងបំពេញព័ត៌មានដែលខ្វះចន្លោះខាងក្រោម៖
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#991b1b", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {Object.entries(validationPopup).map(([k, v]) => (
                  <li key={k} style={{ fontWeight: "500" }}>{v}</li>
                ))}
              </ul>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setValidationPopup(null)}
                  style={{ minWidth: "90px" }}
                >
                  បិទ
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Side-by-Side Grid: Left Editor & Title (Flex 1) + Right Settings Sidebar (Card or Icon-Only) */}
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", width: "100%" }}>

          {/* LEFT COLUMN: Title, Description & TextEditor Workspace */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              className="card"
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "12px",
                background: "#ffffff",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <input
                className="report-form-title"
                value={form.title}
                onChange={e => setField("title", e.target.value)}
                required
                placeholder="ចំណងជើងរបាយការណ៍ *"
                autoFocus={isCreate}
                style={{
                  width: "100%",
                  fontSize: "1.35rem",
                  fontWeight: "700",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#0f172a",
                  padding: "0.15rem 0",
                  fontFamily: "var(--font-khmer)",
                }}
              />
              {fieldErrors.title && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.1rem", display: "block" }}>{fieldErrors.title}</span>}
              <div style={{ height: "1px", background: "rgba(0, 0, 0, 0.05)", width: "100%" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: "600", color: "#64748b", flexShrink: 0 }}>ការពិពណ៌នា <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  className="report-form-desc"
                  value={form.description}
                  onChange={e => setField("description", e.target.value)}
                  required
                  placeholder="ការពិពណ៌នាសង្ខេប *"
                  style={{
                    width: "100%",
                    fontSize: "0.88rem",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    padding: "0.1rem 0",
                    fontFamily: "var(--font-khmer)",
                  }}
                />
              </div>
            </div>

            <div className="report-form-editor" style={{ width: "100%" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                ខ្លឹមសារ <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <TextEditor
                variant="full"
                value={form.content}
                onChange={v => setField("content", v)}
                placeholder="សូមបញ្ចូលខ្លឹមសាររបាយការណ៍ *"
              />
              {fieldErrors.content && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.25rem", display: "block" }}>{fieldErrors.content}</span>}
            </div>
          </div>

          {/* RIGHT COLUMN: Settings Panel (Expanded Card 300px OR Collapsed Icon-Only 52px with left-right slide animation) */}
          <div
            style={{
              width: isSettingsOpen ? "300px" : "52px",
              minHeight: "52px",
              flexShrink: 0,
              position: "relative",
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* EXPANDED SETTINGS CARD (Slides in from right) */}
            <div
              className="card"
              style={{
                width: "300px",
                padding: "1.35rem",
                borderRadius: "14px",
                background: "#ffffff",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "1.15rem",
                position: "absolute",
                top: 0,
                right: 0,
                boxSizing: "border-box",
                opacity: isSettingsOpen ? 1 : 0,
                transform: isSettingsOpen ? "translateX(0)" : "translateX(30px)",
                pointerEvents: isSettingsOpen ? "auto" : "none",
                transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <div
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.6rem",
                  userSelect: "none"
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <LuSettings size={17} /> ការកំណត់របាយការណ៍
                </h4>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.2rem",
                    borderRadius: "6px"
                  }}
                  title="បង្រួម (Collapse to Icon)"
                >
                  <LuChevronRight size={18} />
                </button>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  ប្រភេទរបាយការណ៍ <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  required
                  value={form.category || "ផ្សេងៗ"}
                  onChange={e => setField("category", e.target.value)}
                  className="form-select"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    background: "#ffffff",
                  }}
                >
                  <option value="សន្តិសុខ">សន្តិសុខ</option>
                  <option value="សេដ្ឋកិច្ច">សេដ្ឋកិច្ច</option>
                  <option value="សង្គមកិច្ច">សង្គមកិច្ច</option>
                  <option value="ហិរញ្ញវត្ថុ">ហិរញ្ញវត្ថុ</option>
                  <option value="រដ្ឋបាល">រដ្ឋបាល</option>
                  <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                </select>
                {fieldErrors.category && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.15rem", display: "block" }}>{fieldErrors.category}</span>}
              </div>

              <div className="form-group" style={{ margin: 0, marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="require_signature"
                  checked={form.require_signature !== false}
                  onChange={e => setField("require_signature", e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="require_signature" style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
                  តម្រូវឲ្យមានហត្ថលេខាអនុម័ត
                </label>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>របៀប៖</span>
                  <span style={{ fontWeight: "600", color: "var(--text)" }}>{isCreate ? "បង្កើតថ្មី" : "កែប្រែ"}</span>
                </div>
                {doc && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>ស្ថានភាព៖</span>
                    <ReportStatusBadge status={status} />
                  </div>
                )}
              </div>
            </div>

            {/* COLLAPSED ICON ONLY (52px) */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="card"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "#ffffff",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#2563eb",
                position: "absolute",
                top: 0,
                right: 0,
                opacity: isSettingsOpen ? 0 : 1,
                transform: isSettingsOpen ? "scale(0.7) translateX(15px)" : "scale(1) translateX(0)",
                pointerEvents: isSettingsOpen ? "none" : "auto",
                transition: "opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              title="បើកការកំណត់របាយការណ៍ (Expand Settings Panel)"
            >
              <LuSettings size={22} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  /* ============================================
     VIEW
     ============================================ */
  return (
    <div className="page report-detail-page" style={{ maxWidth: "1350px", margin: "0 auto", padding: "0 0.5rem 2rem 0.5rem" }}>
      {/* ---- TOP BAR NAVIGATION & ACTIONS ---- */}
      <div
        className="report-topbar"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
          padding: "0.85rem 1.25rem", marginBottom: "1.5rem", background: "#ffffff",
          borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate("/reports")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "500" }}>
            <LuArrowLeft size={16} /> ត្រឡប់ក្រោយ
          </button>
          <div style={{ height: "18px", width: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <LuFileText size={16} style={{ color: "#2563eb" }} /> ព័ត៌មានលម្អិតរបាយការណ៍
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={doDownload} disabled={downloading}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <LuDownload size={15} /> {downloading ? "កំពុងទាញយក..." : "ទាញយក PDF"}
          </button>
          {allowTransactionEdit && (status === "draft" || status === "rejected") && (canReview || doc?.created_by === user?.id) && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/reports/${reportId}/edit`)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuPencil size={15} /> កែប្រែ
            </button>
          )}
          {(status === "draft" || status === "rejected") && (
            <button className="btn btn-primary btn-sm" onClick={doSubmit} disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuSend size={15} /> {submitting ? "កំពុងដាក់ស្នើ..." : "ដាក់ស្នើសម្រាប់ពិនិត្យ"}
            </button>
          )}
          {status === "pending_review" && canActOnPending && (
            <button className="btn btn-outline btn-sm" onClick={doRevertToDraft} disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuRotateCcw size={15} /> បង្វែរទៅជាព្រាង
            </button>
          )}
          {status === "pending_review" && canActOnPending && (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => setRejectOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <LuCircleX size={15} /> បដិសេធ
              </button>
              <button className="btn btn-success btn-sm" onClick={doPublish} disabled={submitting}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <LuCircleCheck size={15} /> {reportsNeedApproval ? "អនុម័តជំហាននេះ" : "អនុម័តរបាយការណ៍"}
              </button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: "1.25rem", borderRadius: "8px" }}>{msg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: "1.25rem", borderRadius: "8px" }}>{error}</div>}

      {/* ---- 70/30 SPLIT ---- */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* LEFT: Main Content */}
        <div style={{ flex: "3 1 640px", minWidth: "300px" }}>
          <div className="card" style={{
            padding: "1.75rem 2rem", marginBottom: "1.25rem", borderRadius: "12px",
            background: "#ffffff", border: "1px solid var(--border)", boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", lineHeight: "1.35", color: "var(--text)" }}>
                {form?.title || "—"}
              </h1>
              <ReportStatusBadge status={status} />
            </div>

            <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <LuCalendar size={15} /> ធ្វើបច្ចុប្បន្នភាព៖ {fmtDate(doc?.updated_at || doc?.created_at)}
              </span>
              {form?.category && (
                <span style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  color: "#4b5563", fontWeight: "600",
                  background: "#f3f4f6", padding: "0.15rem 0.5rem", borderRadius: "6px",
                }}>
                  <LuTag size={13} /> {form.category}
                </span>
              )}
            </div>

            {form?.description?.trim() && (
              <div style={{
                background: "#f8fafc", borderLeft: "3px solid #3b82f6",
                padding: "0.85rem 1.15rem", borderRadius: "0 8px 8px 0",
                fontSize: "0.95rem", color: "#334155", lineHeight: "1.6",
              }}>
                {form.description}
              </div>
            )}
          </div>

          <div className="card report-form-view-content" style={{
            padding: "1.75rem 2rem", borderRadius: "12px",
            background: "#ffffff", border: "1px solid var(--border)", boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.85rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#334155" }}>ខ្លឹមសាររបាយការណ៍</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFullscreenOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <LuMaximize2 size={14} /> មើលពេញអេក្រង់
              </button>
            </div>
            <TextEditor variant="full" value={form.content} readOnly />
          </div>
        </div>

        {/* RIGHT: Side Info */}
        <div style={{ flex: "1 1 320px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <ReportMoreInfoCard
            category={form.category}
            zoneName={doc?.zone_name}
            open={showMoreInfo}
            onToggle={() => setShowMoreInfo(!showMoreInfo)}
          />

          <ReportWorkflowCard
            workflow={workflow}
            open={showWorkflow}
            onToggle={() => setShowWorkflow(!showWorkflow)}
          />

          <ReportHistoryCard
            reviews={reviews}
            open={showReviews}
            onToggle={() => setShowReviews(!showReviews)}
          />
        </div>
      </div>

      <RejectReportModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onConfirm={doReject}
        rejecting={rejecting}
        error={fieldErrors.description}
      />

{fullscreenOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#eef2f7",
          overflow: "auto",
          padding: "2rem 1rem 4rem 1rem",
        }}>
          <button
            type="button"
            onClick={() => setFullscreenOpen(false)}
            title="បិទ"
            style={{
              position: "fixed", top: "1.25rem", right: "1.25rem", zIndex: 1,
              width: "42px", height: "42px", borderRadius: "50%",
              background: "#ffffff", border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#475569",
            }}
          >
            <LuMinimize2 size={20} />
          </button>

          <div style={{
            maxWidth: "850px", margin: "0 auto",
            background: "#ffffff", borderRadius: "4px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            padding: "3rem 3.5rem",
          }}>
            <TextEditor variant="full" value={form.content} readOnly />
          </div>
        </div>
      )}
    </div>
  );
}

function Skeleton({ w, h, r = 6 }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: r,
        background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}
