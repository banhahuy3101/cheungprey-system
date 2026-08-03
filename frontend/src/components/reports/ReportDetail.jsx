import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuPencil, LuCalendar, LuDownload, LuSend, LuX, LuClock } from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import TextEditor from "../TextEditor";
import Modal from "../../pages/settings/Modal";
import { clearDraft } from "../../utils/editorAutoSave";
import { docToSimpleForm } from "../../utils/reportForm";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS = { draft: "ព្រាង", pending_review: "កំពុងពិនិត្យ", published: "បានចេញ", rejected: "បានបដិសេធ" };
const STATUS_COLORS = { draft: "#92400e", pending_review: "#1e40af", published: "#166534", rejected: "#991b1b" };
const STATUS_BG = { draft: "#fef3c7", pending_review: "#dbeafe", published: "#dcfce7", rejected: "#fecaca" };

const CATEGORY_COLORS = {
  "សន្តិសុខ": "#dc2626",
  "សេដ្ឋកិច្ច": "#2563eb",
  "សង្គមកិច្ច": "#7c3aed",
  "ហិរញ្ញវត្ថុ": "#059669",
  "រដ្ឋបាល": "#d97706",
  "ផ្សេងៗ": "#6b7280",
};

export default function ReportDetail({ reportId }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [doc, setDoc] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reportDocumentsAPI.getById(reportId)
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data ?? res.data;
        setDoc(d);
        setForm(docToSimpleForm(d));
      })
      .catch(() => { if (!cancelled) setDoc(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    reportDocumentsAPI.getReviews(reportId)
      .then((res) => { if (!cancelled) setReviews(res.data?.data ?? res.data ?? []); })
      .catch(() => { });

    return () => { cancelled = true; };
  }, [reportId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await reportDocumentsAPI.submit(reportId);
      clearDraft(reportId);
      setMessage("បានដាក់ស្នើ");
      window.location.reload();
    }
    catch (e) { setError(e?.response?.data?.error || "ដាក់ស្នើមិនបាន"); }
    finally { setSubmitting(false); }
  };

  const handlePublish = async () => {
    setSubmitting(true);
    try {
      await reportDocumentsAPI.confirmStatus(reportId);
      clearDraft(reportId);
      setMessage("បានអនុម័ត");
      window.location.reload();
    }
    catch (e) { setError(e?.response?.data?.error || "អនុម័តមិនបាន"); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      await reportDocumentsAPI.reject(reportId, rejectReason.trim());
      setRejectOpen(false);
      setRejectReason("");
      window.location.reload();
    }
    catch (e) { setError(e?.response?.data?.error || "បដិសេធមិនបាន"); }
    finally { setRejecting(false); }
  };

  const handleDownload = async () => {
    setDownloading(true); setError("");
    try { await reportDocumentsAPI.downloadPDF(reportId, form?.title || "report"); }
    catch (err) { setError(err.message || "ទាញយក PDF មិនបាន"); }
    finally { setDownloading(false); }
  };

  const canReview = user?.role === "district_chief" || user?.role === "commune_chief" || user?.role === "admin" || user?.role === "super_admin";
  const status = doc?.status || "draft";

  if (loading) {
    return <div className="loading">កំពុងផ្ទុក...</div>;
  }

  return (
    <div className="page report-detail-page">
      {/* ---- TOP BAR ---- */}
      <div className="report-topbar" style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <button type="button" className="btn-icon" onClick={() => navigate("/reports")}>
          <LuArrowLeft size={20} />
        </button>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginLeft: "auto" }}>
          {reviews.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                document.getElementById("workflow-history-card")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <LuClock size={14} /> ប្រវត្តិ ({reviews.length})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={downloading}>
            <LuDownload size={14} /> {downloading ? "..." : "PDF"}
          </button>
          {(status === "draft" || status === "rejected") && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/reports/${reportId}/edit`)}>
              <LuPencil size={14} /> កែប្រែ
            </button>
          )}
          {(status === "draft" || status === "rejected") && (
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}>
              <LuSend size={14} /> {submitting ? "..." : "ដាក់ស្នើសម្រាប់ពិនិត្យ"}
            </button>
          )}
          {status === "pending_review" && canReview && (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => setRejectOpen(true)}>
                <LuX size={14} /> បដិសេធ
              </button>
              <button className="btn btn-success btn-sm" onClick={handlePublish} disabled={submitting}>
                <LuSend size={14} /> អនុម័ត
              </button>
            </>
          )}
        </div>
      </div>

      {message && <div className="alert alert-success" style={{ marginBottom: "1rem" }}>{message}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* LEFT COLUMN: Main Report Content (70% width) */}
        <div style={{ flex: 3, minWidth: "300px" }}>
          <h1 className="report-detail-title">{form?.title || "—"}</h1>

          <div className="report-detail-meta" style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              <LuCalendar size={14} /> {formatDate(doc?.updated_at)}
            </span>
            <span className="report-status-pill" style={{ background: STATUS_BG[status], color: STATUS_COLORS[status], padding: "0.15rem 0.65rem", fontSize: "0.75rem" }}>
              {STATUS_LABELS[status]}
            </span>
            {form?.category && (
              <span
                style={{
                  color: CATEGORY_COLORS[form.category] || "#6b7280",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                {form.category}
              </span>
            )}
          </div>

          {form?.description?.trim() && <p className="report-detail-desc">{form.description}</p>}
          <div className="report-detail-body">
            <TextEditor variant="full" value={form?.content || ""} readOnly />
          </div>
        </div>

        {/* RIGHT COLUMN: Workflow & History Panel (30% width) */}
        <div style={{ flex: 1, minWidth: "260px" }}>
          <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem", borderRadius: "10px" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: "600", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              ព័ត៌មានលម្អិត
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>ស្ថានភាព</span>
                <span style={{ color: STATUS_COLORS[status], fontWeight: "600" }}>{STATUS_LABELS[status]}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>ប្រភេទ</span>
                <span>{form?.category || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>តំបន់</span>
                <span>{doc?.zone_name || "—"}</span>
              </div>
            </div>
          </div>

          {reviews.length > 0 && (
            <div id="workflow-history-card" className="card" style={{ padding: "1.25rem", borderRadius: "10px" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: "600", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                ប្រវត្តិនៃការត្រួតពិនិត្យ ({reviews.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", borderBottom: "1px dashed var(--border)", paddingBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: "600",
                        background: r.action === "confirm" ? "#dcfce7" : r.action === "reject" ? "#fee2e2" : "#f1f5f9",
                        color: r.action === "confirm" ? "#166534" : r.action === "reject" ? "#991b1b" : "#475569"
                      }}>
                        {r.action === "submit" ? "ដាក់ស្នើ" : r.action === "confirm" ? "បានអនុម័ត" : "បដិសេធ"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "auto" }}>
                        {new Date(r.created_at).toLocaleDateString("km-KH")}
                      </span>
                    </div>
                    {r.comment && <div style={{ color: "var(--text)", fontStyle: "italic", marginTop: "0.15rem" }}>"{r.comment}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- REJECT MODAL ---- */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="បដិសេធរបាយការណ៍">
        <div className="form-group">
          <label>មូលហេតុ *</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="បញ្ចូលមូលហេតុ..." />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button className="btn btn-danger" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
            {rejecting ? "..." : "បដិសេធ"}
          </button>
          <button className="btn btn-secondary" onClick={() => setRejectOpen(false)}>បោះបង់</button>
        </div>
      </Modal>
    </div>
  );
}
