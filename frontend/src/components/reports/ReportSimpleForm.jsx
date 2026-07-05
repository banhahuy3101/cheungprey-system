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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) return;
    setError("");
    setSaving(true);
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
      setError(err.response?.data?.error || err.response?.data?.message || "រក្សាទុកមិនបាន");
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
    return <div className="loading">កំពុងផ្ទុក...</div>;
  }

  const viewActions = (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => navigate("/reports")}>
        ត្រឡប់
      </button>
      <button type="button" className="btn btn-secondary" onClick={handleDownload} disabled={downloading}>
        <LuDownload /> {downloading ? "កំពុងទាញយក..." : "ទាញយក PDF"}
      </button>
      <button type="button" className="btn btn-primary" onClick={() => navigate(`/reports/${reportId}/edit`)}>
        <LuPencil /> កែប្រែ
      </button>
    </>
  );

  const editActions = (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
      >
        បោះបង់
      </button>
      <button type="submit" form="report-simple-form" className="btn btn-primary" disabled={saving}>
        <LuSave /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
      </button>
    </>
  );

  if (isView) {
    return (
      <div className="page report-page report-view-page" lang="km">
        <div className="report-form-topbar">
          <button
            type="button"
            className="btn-icon report-back-btn"
            onClick={() => navigate("/reports")}
            title="ត្រឡប់"
          >
            <LuArrowLeft size={20} />
          </button>
          <ReportHero
            variant="view"
            title="មើលរបាយការណ៍"
            subtitle={form.title || "—"}
            actions={viewActions}
          />
        </div>

        {error && <div className="alert alert-error report-flash">{error}</div>}

        <div className="card report-view-card">
          <div className="report-view-meta">
            <span className="report-status-badge" data-status={meta?.status || "draft"}>
              {meta?.status === "published" ? "បានចេញ" : "ព្រាង"}
            </span>
            <span className="report-view-date">
              <LuCalendar aria-hidden />
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
            <TextEditor variant="full" value={form.content} readOnly />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="report-simple-form"
      className="page report-page report-create-page"
      lang="km"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="report-create-toolbar">
        <button
          type="button"
          className="btn-icon report-back-btn"
          onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
          title="ត្រឡប់"
        >
          <LuArrowLeft size={20} />
        </button>
        <div className="report-create-toolbar-actions">{editActions}</div>
      </div>

      {error && <div className="alert alert-error report-flash">{error}</div>}

      <div className="report-create-fields">
        <input
          type="text"
          className="report-create-title"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="ចំណងជើងរបាយការណ៍"
          autoFocus={isCreate}
        />
        <input
          type="text"
          className="report-create-description"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="ការពិពណ៌នា (ជម្រើស)"
        />
      </div>

      <div className="report-create-editor">
        <TextEditor
          variant="full"
          value={form.content}
          onChange={(val) => setField("content", val)}
          placeholder="សូមបញ្ចូលខ្លឹមសាររបាយការណ៍..."
        />
      </div>
    </form>
  );
}
