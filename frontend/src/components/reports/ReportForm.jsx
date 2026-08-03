import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuSave, LuPencil, LuDownload,
  LuSend, LuX, LuClock, LuCalendar,
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
    setSubmitting(true);
    try { await reportDocumentsAPI.confirmStatus(reportId); setMsg("បានអនុម័ត"); window.location.reload(); }
    catch (e) { setError(e?.response?.data?.error || "អនុម័តមិនបាន"); }
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
    <div className="page report-form-page">
      <form onSubmit={doSave} noValidate>
        {/* toolbar */}
        <div className="report-toolbar">
          <button type="button" className="report-toolbar-btn" onClick={() => navigate("/reports")} title="ត្រឡប់">
            <LuArrowLeft size={18} />
          </button>
          <div className="report-toolbar-spacer" />
          <button type="button" className="report-toolbar-btn" onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}>
            បោះបង់
          </button>
          <button type="submit" className="report-toolbar-btn primary" disabled={saving}>
            <LuSave size={14} /> {saving ? "..." : "រក្សាទុក"}
          </button>
        </div>

        {error && <div className="alert alert-error report-form-msg">{error}</div>}

        {/* content */}
        <div className="report-form-body">
          <input
            className="report-form-title"
            value={form.title}
            onChange={e => setField("title", e.target.value)}
            placeholder="ចំណងជើងរបាយការណ៍"
            autoFocus={isCreate}
          />
          <input
            className="report-form-desc"
            value={form.description}
            onChange={e => setField("description", e.target.value)}
            placeholder="ការពិពណ៌នា (ជម្រើស)"
          />
          <div className="report-form-editor">
            <TextEditor
              variant="full"
              value={form.content}
              onChange={v => setField("content", v)}
              placeholder="សូមបញ្ចូលខ្លឹមសារ..."
            />
          </div>
        </div>
      </form>
    </div>
  );

  /* ============================================
     VIEW
     ============================================ */
  return (
    <div className="page report-form-page">
      {/* toolbar */}
      <div className="report-toolbar">
        <button type="button" className="report-toolbar-btn" onClick={() => navigate("/reports")} title="ត្រឡប់">
          <LuArrowLeft size={18} />
        </button>

        <span className="report-toolbar-pill" style={{ background: STATUS_BG[status], color: STATUS_FG[status] }}>
          {STATUS_LABEL[status]}
        </span>

        <div className="report-toolbar-spacer" />

        <button className="report-toolbar-btn" onClick={doDownload} disabled={downloading}>
          <LuDownload size={14} /> {downloading ? "..." : "PDF"}
        </button>
        {(status === "draft" || status === "rejected") && (
          <button className="report-toolbar-btn" onClick={() => navigate(`/reports/${reportId}/edit`)}>
            <LuPencil size={14} /> កែប្រែ
          </button>
        )}
      </div>

      {/* workflow bar */}
      <div className="report-bar">
        {(status === "draft" || status === "rejected") && (
          <button className="report-bar-btn primary" onClick={doSubmit} disabled={submitting}>
            <LuSend size={14} /> {submitting ? "..." : "ដាក់ស្នើសម្រាប់ពិនិត្យ"}
          </button>
        )}
        {status === "pending_review" && canReview && (
          <>
            <button className="report-bar-btn success" onClick={doPublish} disabled={submitting}><LuSend size={14} /> អនុម័ត</button>
            <button className="report-bar-btn danger" onClick={() => setRejectOpen(true)}><LuX size={14} /> បដិសេធ</button>
          </>
        )}
        {reviews.length > 0 && (
          <button className="report-bar-btn ghost" onClick={() => setShowReviews(!showReviews)}>
            <LuClock size={14} /> ប្រវត្តិ ({reviews.length})
          </button>
        )}
      </div>

      {msg && <div className="alert alert-success report-form-msg">{msg}</div>}
      {error && <div className="alert alert-error report-form-msg">{error}</div>}

      {/* reviews (inline) */}
      {showReviews && reviews.length > 0 && (
        <div className="report-reviews">
          {reviews.map(r => (
            <div key={r.id} className="report-review-line">
              <span className={`report-review-dot ${r.action}`}><LuClock size={10} /></span>
              <span className="report-review-line-action">{r.action === "submit" ? "ដាក់ស្នើ" : "បដិសេធ"}</span>
              {r.comment && <span className="report-review-line-comment">— {r.comment}</span>}
              <span className="report-review-line-time">{new Date(r.created_at).toLocaleString("km-KH")}</span>
            </div>
          ))}
        </div>
      )}

      {/* body */}
      <div className="report-form-body">
        <div className="report-form-meta">
          <LuCalendar size={14} /> {fmtDate(doc?.updated_at)}
        </div>

        <h1 className="report-form-view-title">{form.title || "—"}</h1>
        {form.description?.trim() && <p className="report-form-view-desc">{form.description}</p>}

        <div className="report-form-view-content">
          <TextEditor variant="full" value={form.content} readOnly />
        </div>
      </div>

      {/* reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="បដិសេធរបាយការណ៍">
        <div className="form-group">
          <label>មូលហេតុ *</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="បញ្ចូលមូលហេតុ..." />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button className="btn btn-danger" onClick={doReject} disabled={rejecting || !rejectReason.trim()}>{rejecting ? "..." : "បដិសេធ"}</button>
          <button className="btn btn-secondary" onClick={() => setRejectOpen(false)}>បោះបង់</button>
        </div>
      </Modal>
    </div>
  );
}
