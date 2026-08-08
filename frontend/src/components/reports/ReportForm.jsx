import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuSave, LuPencil, LuDownload,
  LuSend, LuX, LuCircleX, LuCircleCheck, LuClock, LuCalendar, LuRotateCcw,
  LuFileText, LuTag,
} from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import TextEditor from "../TextEditor";
import Modal from "../../pages/settings/Modal";
import {
  emptySimpleReportForm,
  buildSimpleReportPayload,
  docToSimpleForm,
} from "../../utils/reportForm";

const STATUS_LABEL = { draft: "ព្រាង", pending_review: "កំពុងពិនិត្យ", published: "បានចេញ", rejected: "បានបដិសេធ" };
const STATUS_BG   = { draft: "#fef3c7", pending_review: "#dbeafe", published: "#dcfce7", rejected: "#fecaca" };
const STATUS_FG   = { draft: "#92400e", pending_review: "#1e40af", published: "#166534", rejected: "#991b1b" };

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReportForm({ mode = "create", reportId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState(emptySimpleReportForm);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  /* ---- fetch ---- */
  useEffect(() => {
    if (!reportId || isCreate) { setLoading(false); return; }
    let ok = true;
    Promise.all([
      reportDocumentsAPI.getById(reportId),
      reportDocumentsAPI.getReviews(reportId),
    ]).then(([r1, r2]) => {
      if (!ok) return;
      const d = r1.data?.data ?? r1.data;
      setDoc(d);
      setForm(docToSimpleForm(d));
      setReviews(r2.data?.data ?? r2.data ?? []);
    }).catch(() => {}).finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, [reportId, isCreate]);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* ---- actions ---- */
  const doSave = async (e) => {
    e?.preventDefault();
    setError(""); setSaving(true);
    try {
      const p = buildSimpleReportPayload(form);
      if (isEdit) { await reportDocumentsAPI.updateSimple(reportId, p); navigate(`/reports/${reportId}`); return; }
      const r = await reportDocumentsAPI.createSimple(p);
      const d = r.data?.data ?? r.data;
      if (d?.id) navigate(`/reports/${d.id}`); else setError("រក្សាទុកមិនបាន");
    } catch (err) { setError(err.response?.data?.error || "រក្សាទុកមិនបាន"); }
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
    try { await reportDocumentsAPI.reject(reportId, rejectReason.trim()); setRejectOpen(false); setRejectReason(""); window.location.reload(); }
    catch (e) { setError(e?.response?.data?.error || "បដិសេធមិនបាន"); }
    finally { setRejecting(false); }
  };

  const canReview = user?.role === "district_chief" || user?.role === "commune_chief" || user?.role === "admin" || user?.role === "super_admin";
  const status = doc?.status || "draft";

  if (loading) return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;
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

        {error && <div className="alert alert-error report-form-msg" style={{ marginBottom: "1.25rem", borderRadius: "10px" }}>{error}</div>}

        {/* 70/30 split content */}
        <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* LEFT: Editor & Title (70%) */}
          <div style={{ flex: "3 1 640px", minWidth: "300px" }}>
            <div
              className="card"
              style={{
                padding: "1.5rem 2rem",
                marginBottom: "1.5rem",
                borderRadius: "16px",
                background: "#ffffff",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <input
                className="report-form-title"
                value={form.title}
                onChange={e => setField("title", e.target.value)}
                placeholder="ចំណងជើងរបាយការណ៍..."
                autoFocus={isCreate}
                style={{
                  width: "100%",
                  fontSize: "1.85rem",
                  fontWeight: "800",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#0f172a",
                  padding: "0.25rem 0",
                  fontFamily: "var(--font-khmer)",
                }}
              />
              <div style={{ height: "1px", background: "rgba(0, 0, 0, 0.06)", width: "100%" }} />
              <input
                className="report-form-desc"
                value={form.description}
                onChange={e => setField("description", e.target.value)}
                placeholder="ការពិពណ៌នាសង្ខេប (ជម្រើស)..."
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  padding: "0.25rem 0",
                  fontFamily: "var(--font-khmer)",
                }}
              />
            </div>

            <div className="report-form-editor">
              <TextEditor
                variant="full"
                value={form.content}
                onChange={v => setField("content", v)}
                placeholder="សូមបញ្ចូលខ្លឹមសាររបាយការណ៍..."
              />
            </div>
          </div>

          {/* RIGHT: Settings Panel (30%) */}
          <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
            <div
              className="card"
              style={{
                padding: "1.35rem",
                borderRadius: "12px",
                background: "#ffffff",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "1.15rem",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
                ការកំណត់របាយការណ៍
              </h4>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  ប្រភេទរបាយការណ៍
                </label>
                <select
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
              </div>

              <div className="form-group" style={{ margin: 0, marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                    <span style={{ fontWeight: "600", color: STATUS_FG[status] }}>{STATUS_LABEL[status]}</span>
                  </div>
                )}
              </div>
            </div>
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
          {reviews.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => setShowReviews(!showReviews)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuClock size={15} /> ប្រវត្តិ ({reviews.length})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={doDownload} disabled={downloading}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <LuDownload size={15} /> {downloading ? "កំពុងទាញយក..." : "ទាញយក PDF"}
          </button>
          {(status === "draft" || status === "rejected") && (
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
          {status === "pending_review" && (canReview || doc?.created_by === user?.id) && (
            <button className="btn btn-outline btn-sm" onClick={doRevertToDraft} disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuRotateCcw size={15} /> បង្វែរទៅជាព្រាង
            </button>
          )}
          {status === "pending_review" && canReview && (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => setRejectOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <LuCircleX size={15} /> បដិសេធ
              </button>
              <button className="btn btn-success btn-sm" onClick={doPublish} disabled={submitting}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <LuCircleCheck size={15} /> អនុម័តរបាយការណ៍
              </button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: "1.25rem", borderRadius: "8px" }}>{msg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: "1.25rem", borderRadius: "8px" }}>{error}</div>}

      {/* reviews (inline) */}
      {showReviews && reviews.length > 0 && (
        <div className="report-reviews" style={{
          background: "#ffffff", border: "1px solid var(--border)", borderRadius: "12px",
          padding: "1.25rem", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          {reviews.map((r, idx) => (
            <div key={r.id || idx} style={{
              display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem",
              paddingBottom: "0.6rem", borderBottom: idx === reviews.length - 1 ? "none" : "1px dashed var(--border)",
            }}>
              <span style={{
                padding: "0.15rem 0.55rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600",
                background: r.action === "confirm" ? "#dcfce7" : r.action === "reject" ? "#fee2e2" : "#dbeafe",
                color: r.action === "confirm" ? "#166534" : r.action === "reject" ? "#991b1b" : "#1e40af",
              }}>
                {r.action === "submit" ? "ដាក់ស្នើ" : r.action === "confirm" ? "បានអនុម័ត" : "បដិសេធ"}
              </span>
              {r.comment && <span style={{ color: "#475569", fontStyle: "italic" }}>— "{r.comment}"</span>}
              <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {new Date(r.created_at).toLocaleString("km-KH")}
              </span>
            </div>
          ))}
        </div>
      )}

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
              <span className="report-status-pill" style={{
                background: STATUS_BG[status], color: STATUS_FG[status],
                padding: "0.35rem 0.85rem", fontSize: "0.82rem", fontWeight: "600", borderRadius: "999px",
                display: "inline-flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap",
              }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: STATUS_FG[status] }} />
                {STATUS_LABEL[status]}
              </span>
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

          <div className="report-form-view-content">
            <TextEditor variant="full" value={form.content} readOnly />
          </div>
        </div>

        {/* RIGHT: Side Info */}
        <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
          <div className="card" style={{
            padding: "1.35rem", borderRadius: "12px", background: "#ffffff",
            border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem",
          }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
              ព័ត៌មានបន្ថែម
            </h4>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>ប្រភេទ៖</span>
              <span style={{ fontWeight: "600" }}>{form.category || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>តំបន់/ឃុំ៖</span>
              <span style={{ fontWeight: "500" }}>{doc?.zone_name || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="បដិសេធរបាយការណ៍">
        <div style={{ padding: "0.5rem 0" }}>
          <div className="form-group">
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "600", fontSize: "0.9rem" }}>
              មូលហេតុនៃការបដិសេធ <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              className="form-control"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="សូមបញ្ចូលមូលហេតុ ឬការណែនាំសម្រាប់អ្នកកែប្រែ..."
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.9rem" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button className="btn btn-secondary" onClick={() => setRejectOpen(false)}>
              បោះបង់
            </button>
            <button className="btn btn-danger" onClick={doReject} disabled={rejecting || !rejectReason.trim()}>
              {rejecting ? "កំពុងបដិសេធ..." : "បញ្ជាក់ការបដិសេធ"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
