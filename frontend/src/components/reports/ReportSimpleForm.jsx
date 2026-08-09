import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSave, LuArrowLeft, LuPencil, LuCalendar, LuDownload } from "react-icons/lu";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import TextEditor from "../TextEditor";
import ReportHero from "./ReportHero";
import {
  emptySimpleReportForm,
  buildSimpleReportPayload,
  docToSimpleForm,
  isEmptyContent,
} from "../../utils/reportForm";

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

export default function ReportSimpleForm({ mode = "create", reportId, initialDoc }) {
  const navigate = useNavigate();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [form, setForm] = useState(() => (initialDoc ? docToSimpleForm(initialDoc) : emptySimpleReportForm()));
  const [meta, setMeta] = useState(() =>
    initialDoc ? { status: initialDoc.status, updated_at: initialDoc.updated_at } : null,
  );
  const [loading, setLoading] = useState((isView || isEdit) && !initialDoc);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationPopup, setValidationPopup] = useState(null);

  useEffect(() => {
    if (!reportId || isCreate || initialDoc) return;
    let cancelled = false;
    setLoading(true);
    reportDocumentsAPI
      .getById(reportId)
      .then((res) => {
        if (cancelled) return;
        const doc = res.data?.data ?? res.data;
        setForm(docToSimpleForm(doc));
        setMeta({ status: doc.status, updated_at: doc.updated_at });
      })
      .catch(() => {
        if (!cancelled) setError("ផ្ទុករបាយការណ៍មិនបាន");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, isCreate, initialDoc]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    setValidationPopup(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setError(""); setFieldErrors({}); setSaving(true);
    try {
      const payload = buildSimpleReportPayload(form);
      if (isEdit) {
        await reportDocumentsAPI.updateSimple(reportId, payload);
        navigate(`/reports/${reportId}`);
        return;
      }
      const res = await reportDocumentsAPI.createSimple(payload);
      const doc = res.data?.data ?? res.data;
      if (!doc?.id) {
        setError("រក្សាទុកមិនបាន — មិនទទួលបាន id");
        return;
      }
      navigate(`/reports/${doc.id}`);
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setValidationPopup(err.response.data.errors);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || "រក្សាទុកមិនបាន");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      await reportDocumentsAPI.downloadPDF(reportId, undefined, form.title);
    } catch (err) {
      setError(err.message || "ទាញយក PDF មិនបាន");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="report-create-page" lang="km" style={{ padding: "0 0.5rem 2rem 0.5rem" }}>
        <div className="report-create-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.25rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.85)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <Skeleton w={40} h={40} r={8} />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Skeleton w={90} h={34} r={8} />
            <Skeleton w={110} h={34} r={8} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "900px" }}>
          <Skeleton w="100%" h={56} r={10} />
          <Skeleton w="100%" h={44} r={10} />
          <Skeleton w="100%" h={300} r={10} />
        </div>
      </div>
    );
  }

  const backBtn = (
    <button
      type="button"
      className="btn-icon report-back-btn"
      onClick={() => navigate("/reports")}
      title="ត្រឡប់"
    >
      <LuArrowLeft size={20} />
    </button>
  );

  if (isView) {
    return (
      <>
        <div className="report-form-topbar">
          {backBtn}
          <ReportHero
            variant="view"
            title="មើលរបាយការណ៍"
            subtitle={form.title || "—"}
            actions={
              <>
                <button type="button" className="btn btn-secondary" onClick={handleDownload} disabled={downloading}>
                  <LuDownload size={14} /> {downloading ? "..." : "ទាញយក PDF"}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => navigate(`/reports/${reportId}/edit`)}>
                  <LuPencil size={14} /> កែប្រែ
                </button>
              </>
            }
          />
        </div>

      {error && Object.keys(fieldErrors).length === 0 && <div className="alert alert-error report-flash">{error}</div>}

      {validationPopup && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px",
          padding: "1rem 1.25rem", marginBottom: "1rem",
          display: "flex", gap: "0.75rem", alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#991b1b", marginBottom: "0.4rem" }}>សូមបំពេញព័ត៌មានឲ្យបានគ្រប់</div>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#7f1d1d", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {Object.entries(validationPopup).map(([k, v]) => (
                <li key={k} style={{ cursor: "pointer" }} onClick={() => setValidationPopup(null)}>{v}</li>
              ))}
            </ul>
            <button
              onClick={() => setValidationPopup(null)}
              style={{ marginTop: "0.6rem", padding: "0.25rem 0.9rem", borderRadius: "6px", border: "1px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: "0.78rem", cursor: "pointer", fontWeight: "500" }}
            >បិទ</button>
          </div>
        </div>
      )}

        <div className="card report-view-card">
          <div className="report-view-meta">
            <span className="report-status-badge" data-status={meta?.status || "draft"}>
              {meta?.status === "pending_review" ? "កំពុងពិនិត្យ"
                : meta?.status === "rejected" ? "បានបដិសេធ"
                : meta?.status === "published" ? "បានចេញ"
                : "ព្រាង"}
            </span>
            <span className="report-view-date">
              <LuCalendar size={14} aria-hidden />
              កែប្រែចុងក្រោយ: {formatDate(meta?.updated_at)}
            </span>
          </div>

          <header className="report-view-header">
            <h1 className="report-view-title">{form.title || "—"}</h1>
            {form.description?.trim() && (
              <p className="report-view-description">{form.description}</p>
            )}
          </header>

          <div className="report-view-body">
            {form.content?.startsWith("UEs") ? (
              <PdfViewer reportId={reportId} />
            ) : (
              <TextEditor variant="full" value={form.content} readOnly />
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <form
      id="report-simple-form"
      className="report-create-page"
      lang="km"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="report-create-toolbar">
        {backBtn}
        <div className="report-create-toolbar-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
          >
            បោះបង់
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <LuSave size={14} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error report-flash">{error}</div>}

      <div className="report-create-fields">
        <input
          type="text"
          className="report-create-title"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          required
          placeholder="ចំណងជើងរបាយការណ៍ *"
          autoFocus={isCreate}
        />
        {fieldErrors.title && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.1rem", display: "block" }}>{fieldErrors.title}</span>}
        <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b", marginTop: "0.5rem" }}>ការពិពណ៌នា <span style={{ color: "#dc2626" }}>*</span></label>
        <input
          type="text"
          className="report-create-description"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="ការពិពណ៌នា *"
        />
        {fieldErrors.description && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.1rem", display: "block" }}>{fieldErrors.description}</span>}
      </div>

      <div className="report-create-editor">
        <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b", marginBottom: "0.5rem", display: "block" }}>ខ្លឹមសារ <span style={{ color: "#dc2626" }}>*</span></label>
        <TextEditor
          variant="full"
          value={form.content}
          onChange={(val) => setField("content", val)}
          placeholder="សូមបញ្ចូលខ្លឹមសាររបាយការណ៍ *"
        />
        {fieldErrors.content && <span className="field-error" style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: "500", marginTop: "0.25rem", display: "block" }}>{fieldErrors.content}</span>}
      </div>
    </form>
  );
}

function PdfViewer({ reportId }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("access_token");
    fetch(`/api/report-documents/${reportId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) setBlobUrl(URL.createObjectURL(blob));
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [reportId]);

  if (!blobUrl) return <div style={{ padding: "2rem" }}>កំពុងទាញយក PDF...</div>;

  return (
    <iframe
      title="report-pdf"
      src={blobUrl}
      style={{ width: "100%", height: "70vh", border: "none" }}
    />
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
