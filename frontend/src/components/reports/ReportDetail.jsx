import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuPencil,
  LuCalendar,
  LuDownload,
  LuSend,
  LuX,
  LuClock,
  LuCircleCheck,
  LuCircleX,
  LuFileText,
  LuUser,
  LuMapPin,
  LuTag,
  LuInfo,
  LuHistory,
  LuRotateCcw,
} from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import TextEditor from "../TextEditor";
import Modal from "../../pages/settings/Modal";
import { clearDraft } from "../../utils/editorAutoSave";
import { docToSimpleForm } from "../../utils/reportForm";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS = {
  draft: "ព្រាង",
  pending_review: "កំពុងពិនិត្យ",
  published: "បានចេញ",
  rejected: "បានបដិសេធ",
};

const STATUS_COLORS = {
  draft: "#92400e",
  pending_review: "#1e40af",
  published: "#166534",
  rejected: "#991b1b",
};

const STATUS_BG = {
  draft: "#fef3c7",
  pending_review: "#dbeafe",
  published: "#dcfce7",
  rejected: "#fecaca",
};

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
    reportDocumentsAPI
      .getById(reportId)
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data ?? res.data;
        setDoc(d);
        setForm(docToSimpleForm(d));
      })
      .catch(() => {
        if (!cancelled) setDoc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    reportDocumentsAPI
      .getReviews(reportId)
      .then((res) => {
        if (!cancelled) setReviews(res.data?.data ?? res.data ?? []);
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await reportDocumentsAPI.submit(reportId);
      clearDraft(reportId);
      setMessage("បានដាក់ស្នើរបាយការណ៍ដោយជោគជ័យ");
      window.location.reload();
    } catch (e) {
      setError(e?.response?.data?.error || "ដាក់ស្នើមិនបាន");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (doc?.require_signature && !user?.signature) {
      setError("សូមកំណត់ហត្ថលេខាក្នុងទំព័រប្រវត្តិរូបរបស់អ្នកជាមុនសិន ទើបអាចអនុម័តរបាយការណ៍បាន។");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await reportDocumentsAPI.confirmStatus(reportId);
      clearDraft(reportId);
      setMessage("បានអនុម័តរបាយការណ៍ដោយជោគជ័យ");
      window.location.reload();
    } catch (e) {
      setError(e?.response?.data?.error || "អនុម័តមិនបាន");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevertToDraft = async () => {
    setSubmitting(true);
    setError("");
    try {
      await reportDocumentsAPI.revertToDraft(reportId);
      setMessage("បានបង្វែររបាយការណ៍ទៅជាព្រាងវិញដោយជោគជ័យ");
      window.location.reload();
    } catch (e) {
      setError(e?.response?.data?.error || "បង្វែរទៅជាព្រាងមិនបាន");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    setError("");
    try {
      await reportDocumentsAPI.reject(reportId, rejectReason.trim());
      setRejectOpen(false);
      setRejectReason("");
      window.location.reload();
    } catch (e) {
      setError(e?.response?.data?.error || "បដិសេធមិនបាន");
    } finally {
      setRejecting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      await reportDocumentsAPI.downloadPDF(reportId, form?.title || "report");
    } catch (err) {
      setError(err.message || "ទាញយក PDF មិនបាន");
    } finally {
      setDownloading(false);
    }
  };

  const canReview =
    user?.role === "district_chief" ||
    user?.role === "commune_chief" ||
    user?.role === "admin" ||
    user?.role === "super_admin";
  const status = doc?.status || "draft";

  if (loading) {
    return (
      <div className="report-detail-loading" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
        <div className="loading" style={{ fontSize: "1rem" }}>កំពុងផ្ទុកទិន្នន័យរបាយការណ៍...</div>
      </div>
    );
  }

  return (
    <div className="page report-detail-page" style={{ maxWidth: "1350px", margin: "0 auto", padding: "0 1rem 2rem 1rem" }}>
      {/* ---- TOP BAR NAVIGATION & ACTIONS ---- */}
      <div
        className="report-topbar"
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
          flexWrap: "wrap",
          position: "sticky",
          top: "0",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/reports")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: "600",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              transition: "all 0.2s ease",
            }}
          >
            <LuArrowLeft size={16} /> ត្រឡប់ក្រោយ
          </button>
          <div style={{ height: "24px", width: "1px", background: "rgba(0, 0, 0, 0.08)" }} />
          <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LuFileText size={18} style={{ color: "#2563eb" }} /> ព័ត៌មានលម្អិតរបាយការណ៍
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          {reviews.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                document.getElementById("workflow-history-card")?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.5rem 0.85rem" }}
            >
              <LuClock size={16} /> ប្រវត្តិ ({reviews.length})
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              border: "1px solid rgba(0, 0, 0, 0.08)",
            }}
          >
            <LuDownload size={16} /> {downloading ? "កំពុងទាញយក..." : "ទាញយក PDF"}
          </button>

          {(status === "draft" || status === "rejected") && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate(`/reports/${reportId}/edit`)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.5rem 1rem" }}
            >
              <LuPencil size={16} /> កែប្រែ
            </button>
          )}

          {(status === "draft" || status === "rejected") && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                borderRadius: "8px",
                padding: "0.5rem 1.25rem",
                boxShadow: "0 2px 4px rgba(37, 99, 235, 0.15)",
              }}
            >
              <LuSend size={16} /> {submitting ? "កំពុងដាក់ស្នើ..." : "ដាក់ស្នើសម្រាប់ពិនិត្យ"}
            </button>
          )}

          {status === "pending_review" && (canReview || doc?.created_by === user?.id) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleRevertToDraft}
              disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.5rem 1rem" }}
            >
              <LuRotateCcw size={16} /> បង្វែរទៅជាព្រាង
            </button>
          )}

          {status === "pending_review" && canReview && (
            <>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setRejectOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.5rem 1rem" }}
              >
                <LuCircleX size={16} /> បដិសេធ
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handlePublish}
                disabled={submitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  borderRadius: "8px",
                  padding: "0.5rem 1.25rem",
                  boxShadow: "0 2px 4px rgba(22, 101, 52, 0.15)",
                }}
              >
                <LuCircleCheck size={16} /> អនុម័តរបាយការណ៍
              </button>
            </>
          )}
        </div>
      </div>

      {message && <div className="alert alert-success" style={{ marginBottom: "1.25rem", borderRadius: "10px", boxShadow: "0 2px 6px rgba(16, 185, 129, 0.08)" }}>{message}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: "1.25rem", borderRadius: "10px", boxShadow: "0 2px 6px rgba(239, 68, 68, 0.08)" }}>{error}</div>}

      {/* ---- 70/30 SPLIT CONTAINER ---- */}
      <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* LEFT COLUMN: Main Report Content (70% width) */}
        <div style={{ flex: "3 1 640px", minWidth: "300px" }}>
          <div
            className="card"
            style={{
              padding: "2rem 2.25rem",
              marginBottom: "1.5rem",
              borderRadius: "16px",
              background: "#ffffff",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <h1 className="report-detail-title" style={{ margin: 0, fontSize: "1.95rem", fontWeight: "800", lineHeight: "1.35", color: "#0f172a", letterSpacing: "-0.01em" }}>
                {form?.title || "—"}
              </h1>
              <span
                className="report-status-pill"
                style={{
                  background: STATUS_BG[status],
                  color: STATUS_COLORS[status],
                  border: `1px solid ${STATUS_COLORS[status]}25`,
                  padding: "0.45rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  whiteSpace: "nowrap",
                  boxShadow: `0 2px 6px -1px ${STATUS_COLORS[status]}15`,
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: STATUS_COLORS[status] }} />
                {STATUS_LABELS[status]}
              </span>
            </div>

            <div className="report-detail-meta" style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", paddingBottom: "1rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <LuCalendar size={16} /> ធ្វើបច្ចុប្បន្នភាព៖ {formatDate(doc?.updated_at || doc?.created_at)}
              </span>
              {form?.category && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: CATEGORY_COLORS[form.category] || "#4b5563",
                    fontWeight: "700",
                    background: `${CATEGORY_COLORS[form.category] || "#6b7280"}12`,
                    border: `1px solid ${CATEGORY_COLORS[form.category] || "#6b7280"}20`,
                    padding: "0.25rem 0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                  }}
                >
                  <LuTag size={14} /> {form.category}
                </span>
              )}
            </div>

            {form?.description?.trim() && (
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.03)",
                  borderLeft: "4px solid #3b82f6",
                  padding: "1rem 1.25rem",
                  borderRadius: "0 10px 10px 0",
                  fontSize: "0.98rem",
                  color: "#334155",
                  lineHeight: "1.65",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                }}
              >
                <LuInfo size={18} style={{ color: "#3b82f6", marginTop: "0.15rem", flexShrink: 0 }} />
                <span>{form.description}</span>
              </div>
            )}
          </div>

          {/* READ-ONLY TEXT EDITOR (A4 SHEET CANVAS VIEW) */}
          <div className="report-detail-body">
            <TextEditor variant="full" value={form?.content || ""} readOnly />
          </div>
        </div>

        {/* RIGHT COLUMN: Metadata & Workflow History Panel (30% width) */}
        <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
          {/* Metadata Card */}
          <div className="card" style={{ padding: "1.35rem", marginBottom: "1.25rem", borderRadius: "12px", background: "#ffffff", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuInfo size={16} style={{ color: "#2563eb" }} /> ព័ត៌មានលម្អិតរបាយការណ៍
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <LuTag size={14} /> ប្រភេទ៖
                </span>
                <span style={{ fontWeight: "600", color: CATEGORY_COLORS[form?.category] || "var(--text)" }}>{form?.category || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <LuMapPin size={14} /> តំបន់/ឃុំ៖
                </span>
                <span style={{ fontWeight: "500" }}>{doc?.zone_name || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <LuUser size={14} /> អ្នកបង្កើត៖
                </span>
                <span style={{ fontWeight: "500" }}>{doc?.creator_name || doc?.author || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <LuCalendar size={14} /> កាលបរិច្ឆេទបង្កើត៖
                </span>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{formatDate(doc?.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Workflow Review History Card */}
          {reviews.length > 0 && (
            <div
              id="workflow-history-card"
              className="card"
              style={{
                padding: "1.35rem",
                borderRadius: "12px",
                background: "#ffffff",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: "700", color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <LuHistory size={16} style={{ color: "#059669" }} /> ប្រវត្តិនៃការត្រួតពិនិត្យ ({reviews.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {reviews.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      fontSize: "0.825rem",
                      paddingBottom: "0.75rem",
                      borderBottom: idx === reviews.length - 1 ? "none" : "1px dashed var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
                      <span
                        style={{
                          padding: "0.15rem 0.55rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: r.action === "confirm" ? "#dcfce7" : r.action === "reject" ? "#fee2e2" : "#dbeafe",
                          color: r.action === "confirm" ? "#166534" : r.action === "reject" ? "#991b1b" : "#1e40af",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        {r.action === "confirm" ? <LuCircleCheck size={12} /> : r.action === "reject" ? <LuCircleX size={12} /> : <LuSend size={12} />}
                        {r.action === "submit" ? "បានដាក់ស្នើ" : r.action === "confirm" ? "បានអនុម័ត" : "បានបដិសេធ"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{formatDate(r.created_at)}</span>
                    </div>
                    {r.reviewer_name && (
                      <div style={{ color: "var(--text)", fontWeight: "500", fontSize: "0.8rem" }}>
                        អ្នកពិនិត្យ៖ {r.reviewer_name}
                      </div>
                    )}
                    {r.comment && (
                      <div style={{ background: "#f8fafc", padding: "0.4rem 0.65rem", borderRadius: "6px", borderLeft: "2px solid #cbd5e1", color: "#475569", fontStyle: "italic", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                        "{r.comment}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- REJECT REASON MODAL ---- */}
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
            <button className="btn btn-danger" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
              {rejecting ? "កំពុងបដិសេធ..." : "បញ្ជាក់ការបដិសេធ"}
            </button>
          </div>
        </div>
      </Modal>
    </div >
  );
}

