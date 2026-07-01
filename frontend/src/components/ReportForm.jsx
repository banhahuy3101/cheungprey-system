import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuSave, LuArrowLeft, LuPencil, LuDownload } from "react-icons/lu";
import { reportDocumentsAPI } from "../api/reportDocuments";
import { reportTemplatesAPI } from "../api/reportTemplates";
import TextEditor from "./TextEditor";
import {
  emptyReportForm,
  docToForm,
  KHMER_MONTHS,
  monthLabel,
} from "../utils/reportForm";
import { isDocxTemplate } from "../utils/reportTemplate";

const STAT_FIELDS = [
  { key: "total_crimes_count", label: "សភាពការណ៍បទល្មើស កើតឡើង" },
  { key: "homicide_cases", label: "ឃាតកម្ម" },
  { key: "suicide_cases", label: "អត្តឃាត" },
  { key: "misdemeanor_cases", label: "បទមជ្ឈិម" },
  { key: "human_fatalities", label: "ផ្នែកមនុស្ស ស្លាប់" },
];

function Field({ label, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

function buildReportPayload(form) {
  return {
    party_name: form.party_name?.trim() || "",
    province_name: form.province_name.trim(),
    district_name: form.district_name.trim(),
    document_reference_number: form.document_reference_number?.trim() || "",
    generation_date_khmer: form.generation_date_khmer?.trim() || "",
    report_month: Number(form.report_month),
    report_year: Number(form.report_year),
    political_situation_summary: form.political_situation_summary || "",
    total_crimes_count: Number(form.total_crimes_count) || 0,
    homicide_cases: Number(form.homicide_cases) || 0,
    suicide_cases: Number(form.suicide_cases) || 0,
    misdemeanor_cases: Number(form.misdemeanor_cases) || 0,
    human_fatalities: Number(form.human_fatalities) || 0,
    property_damage_desc: form.property_damage_desc?.trim() || "(គ្មាន)",
    status: form.status || "draft",
  };
}

export default function ReportForm({ mode, reportId }) {
  const navigate = useNavigate();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [form, setForm] = useState(emptyReportForm());
  const [loading, setLoading] = useState(isEdit || isView);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isView) return;
    reportTemplatesAPI.getAll().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setTemplates(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, [isView]);

  useEffect(() => {
    if (!reportId || isCreate || reportId === "create") return;
    let cancelled = false;
    setLoading(true);
    reportDocumentsAPI
      .getById(reportId)
      .then((res) => {
        if (cancelled) return;
        const doc = res.data?.data ?? res.data;
        setForm(docToForm(doc));
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
  }, [reportId, isCreate]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setStat = (key, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setField(key, n);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isView) return;
    if (!form.province_name.trim() || !form.district_name.trim()) {
      setError("សូមបញ្ចូលខេត្ត និងស្រុក");
      return;
    }
    const month = Number(form.report_month);
    const year = Number(form.report_year);
    if (!month || month < 1 || month > 12) {
      setError("សូមជ្រើសរើសខែរបាយការណ៍");
      return;
    }
    if (!year || year < 2000 || year > 2100) {
      setError("សូមបញ្ចូលឆ្នាំ (២០០០–២១០០)");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload = buildReportPayload(form);
      if (isEdit) {
        await reportDocumentsAPI.update(reportId, payload);
        navigate(`/reports/${reportId}`);
        return;
      }
      const res = await reportDocumentsAPI.create(payload);
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
      const selected = templates.find((t) => String(t.id) === String(templateId));
      if (isDocxTemplate(selected)) {
        if (!templateId) {
          setError("សូមជ្រើសរើសគំរូ Word");
          return;
        }
        await reportDocumentsAPI.downloadDocx(reportId, templateId);
      } else {
        await reportDocumentsAPI.downloadPDF(reportId, templateId || undefined);
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || "ទាញយកឯកសារមិនបាន");
    } finally {
      setDownloading(false);
    }
  };

  const selectedTemplate = templates.find((t) => String(t.id) === String(templateId));
  const downloadLabel = isDocxTemplate(selectedTemplate) ? "ទាញយក Word" : "ទាញយក PDF";

  const pageTitle = isView
    ? "មើលរបាយការណ៍"
    : isEdit
      ? "កែប្រែរបាយការណ៍"
      : "បង្កើតរបាយការណ៍";

  if (loading) {
    return <div className="loading">កំពុងផ្ទុក...</div>;
  }

  return (
    <form className="page" onSubmit={handleSubmit} noValidate>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
            title="ត្រឡប់"
          >
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">{pageTitle}</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {isView && (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleDownload} disabled={downloading}>
                <LuDownload /> {downloading ? "កំពុងទាញយក..." : downloadLabel}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/reports/${reportId}/edit`)}>
                <LuPencil /> កែប្រែ
              </button>
            </>
          )}
          {!isView && (
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <LuSave /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isView && (
        <div className="card mb-1">
          <div className="form-row" style={{ alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>គំរូ (HTML / Word)</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">គំរូប្រព័ន្ធ (PDF)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({isDocxTemplate(t) ? "Word" : "HTML"})
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/reports/templates")}>
              គ្រប់គ្រងគំរូ
            </button>
          </div>
        </div>
      )}

      <div className="card mb-1">
        <h3 className="report-section-heading">១. ក្បាលឯកសារ</h3>
        <div className="form-row">
          <Field label="ឈ្មោះគណបក្ស">
            <input
              type="text"
              value={form.party_name}
              onChange={(e) => setField("party_name", e.target.value)}
              disabled={isView}
            />
          </Field>
          <Field label="លេខយោង">
            <input
              type="text"
              value={form.document_reference_number}
              onChange={(e) => setField("document_reference_number", e.target.value)}
              disabled={isView}
              placeholder="លេខរៀងឯកសារ"
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="ខេត្ត *">
            <input
              type="text"
              value={form.province_name}
              onChange={(e) => setField("province_name", e.target.value)}
              disabled={isView}
              placeholder="ឧ. កំពង់ចាម"
              required
            />
          </Field>
          <Field label="ស្រុក *">
            <input
              type="text"
              value={form.district_name}
              onChange={(e) => setField("district_name", e.target.value)}
              disabled={isView}
              placeholder="ឧ. ជើងព្រៃ"
              required
            />
          </Field>
        </div>
        <Field label="កាលបរិច្ឆេទខ្មែរ (ក្បាលឯកសារ)">
          <input
            type="text"
            value={form.generation_date_khmer}
            onChange={(e) => setField("generation_date_khmer", e.target.value)}
            disabled={isView}
            placeholder="ឧ. ថ្ងៃសៅរ៍ ៧កើត..."
          />
        </Field>
      </div>

      <div className="card mb-1">
        <h3 className="report-section-heading">២. រយៈពេលរបាយការណ៍</h3>
        <div className="form-row">
          <Field label="ខែ *">
            {isView ? (
              <input type="text" value={monthLabel(form.report_month)} disabled />
            ) : (
              <select
                value={form.report_month}
                onChange={(e) => setField("report_month", Number(e.target.value))}
              >
                {KHMER_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="ឆ្នាំ *">
            <input
              type="number"
              min="2000"
              max="2100"
              value={form.report_year}
              onChange={(e) => setField("report_year", Number(e.target.value))}
              disabled={isView}
            />
          </Field>
          {!isView && (
            <Field label="ស្ថានភាព">
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="draft">ព្រាង</option>
                <option value="published">បានចេញ</option>
              </select>
            </Field>
          )}
        </div>
      </div>

      <div className="card mb-1">
        <h3 className="report-section-heading">៣. I-ក សភាពនយោបាយ និងសន្តិសុខ</h3>
        <Field label="សេចក្តីសង្ខេប">
          <TextEditor
            value={form.political_situation_summary}
            onChange={(val) => setField("political_situation_summary", val)}
            readOnly={isView}
          />
        </Field>
      </div>

      <div className="card mb-1">
        <h3 className="report-section-heading">៤. I-ខ ស្ថិតិបទល្មើស និងគ្រោះថ្នាក់</h3>
        <div className="table-responsive">
          <table className="table report-stats-table">
            <thead>
              <tr>
                <th>ខ្លឹមសារ</th>
                <th style={{ width: "140px" }}>ចំនួន</th>
              </tr>
            </thead>
            <tbody>
              {STAT_FIELDS.map(({ key, label }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    {isView ? (
                      form[key]
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={form[key]}
                        onChange={(e) => setStat(key, e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td>ផ្នែកសម្ភារៈ</td>
                <td colSpan={1}>
                  {isView ? (
                    form.property_damage_desc
                  ) : (
                    <input
                      type="text"
                      value={form.property_damage_desc}
                      onChange={(e) => setField("property_damage_desc", e.target.value)}
                      placeholder="(គ្មាន)"
                    />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {!isView && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <LuSave /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate(isEdit ? `/reports/${reportId}` : "/reports")}
          >
            បោះបង់
          </button>
        </div>
      )}
    </form>
  );
}
