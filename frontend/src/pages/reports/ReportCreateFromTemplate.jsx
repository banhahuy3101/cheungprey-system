import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuFileText,
  LuPlus,
  LuEye,
  LuDownload,
  LuSave,
  LuSearch,
  LuCheck,
  LuSparkles,
  LuChevronRight,
  LuX,
  LuRefreshCw,
  LuZap,
  LuCalendar,
  LuCopy,
  LuUser,
  LuBuilding,
  LuBriefcase
} from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import { authAPI } from "../../api/auth";
import ReportHero from "../../components/reports/ReportHero";
import TextEditor from "../../components/TextEditor";
import Modal from "../settings/Modal";
import { useAuth } from "../../hooks/useAuth";

function toKhmerDigits(str) {
  const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(str).replace(/[0-9]/g, w => khmerNums[+w]);
}

function getKhmerDateStr(date = new Date()) {
  const monthsKm = [
    "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
    "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
  ];
  const d = toKhmerDigits(String(date.getDate()).padStart(2, '0'));
  const m = monthsKm[date.getMonth()];
  const y = toKhmerDigits(date.getFullYear());
  return `ថ្ងៃទី ${d} ខែ ${m} ឆ្នាំ ${y}`;
}

function humanizeKey(k) {
  return (k || "")
    .replace(/^\./, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function ReportCreateFromTemplate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [autoFilledKeys, setAutoFilledKeys] = useState({});
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [activeFocusedKey, setActiveFocusedKey] = useState("");

  // Document metadata state for Step 3 editing
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docCategory, setDocCategory] = useState("ផ្សេងៗ");
  const [validationPopup, setValidationPopup] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ទាំងអស់");

  // Dynamic Array Rows & CSV Importer Modal State
  const [arrayRows, setArrayRows] = useState([]);
  const [arrayKeys, setArrayKeys] = useState("");
  const [showImporter, setShowImporter] = useState(false);

  // Live Editor Interactive Preview Content for Step 2
  const livePreviewHtml = useMemo(() => {
    if (!selected) return "";
    let base = selected.content || `<div style="font-size:1rem; line-height:1.8; color:#1e293b;">
      <h2 style="text-align:center; color:#185abd; margin-bottom:1.5rem; font-weight:700;">${selected.name}</h2>
      <p style="margin-bottom:0.75rem;"><strong>កាលបរិច្ឆេទ (Date):</strong> {{date}}</p>
      <p style="margin-bottom:0.75rem;"><strong>អ្នករៀបចំ (Author):</strong> {{author}}</p>
      <p style="margin-bottom:0.75rem;"><strong>អង្គភាព (Organization):</strong> {{organization}}</p>
      <hr style="margin:1.5rem 0; border:none; border-top:1px solid #cbd5e1;" />
      <h3 style="color:#334155;">{{title}}</h3>
      <p style="color:#475569;">{{description}}</p>
    </div>`;

    (selected.keys || []).forEach(k => {
      const val = formValues[k];
      const isFocused = activeFocusedKey === k;
      const regex = new RegExp(`\\{\\{\\s*${escapeRegex(k)}\\s*\\}\\}`, "gi");

      if (val && val.trim()) {
        const style = isFocused
          ? "background: #bfdbfe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 700; outline: 2px solid #3b82f6;"
          : "background: #fef08a; color: #854d0e; padding: 1px 5px; border-radius: 3px; font-weight: 600;";
        base = base.replace(regex, `<span style="${style}">${val}</span>`);
      } else {
        const style = isFocused
          ? "background: #4338ca; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 700; outline: 3px solid #818cf8;"
          : "background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 600;";
        base = base.replace(regex, `<code style="${style}">{{${k}}}</code>`);
      }
    });

    return base;
  }, [selected, formValues, activeFocusedKey]);
  const [rawCSVText, setRawCSVText] = useState("");

  // Wizard active step: 1 = Select Template, 2 = Fill Data, 3 = Preview & Save
  const [activeStep, setActiveStep] = useState(1);

  // Preview states
  const [filledHtml, setFilledHtml] = useState("");
  const [filledPath, setFilledPath] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await reportTemplatesAPI.list();
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setTemplates(data);
      } catch {
        setMessage("ផ្ទុកគំរូមិនបាន");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set();
    templates.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ["ទាំងអស់", ...Array.from(set)];
  }, [templates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchCat = selectedCategory === "ទាំងអស់" || t.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        (t.keys || []).some(k => k.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleSelect = async (tmpl) => {
    setLoading(true);
    try {
      const res = await reportTemplatesAPI.getById(tmpl.id);
      const fullTmpl = res.data?.data || res.data;
      setSelected(fullTmpl);

      const init = {};
      const nextAutoFilled = {};

      const keys = fullTmpl.keys || [];
      const meta = fullTmpl.keys_meta || [];

      keys.forEach((k) => {
        const found = meta.find((m) => m.key_name === k);
        init[k] = found?.default_value || "";
        if (found?.default_value) {
          nextAutoFilled[k] = true;
        }
      });

      setFormValues(init);
      setAutoFilledKeys(nextAutoFilled);

      if (keys.includes("signature")) {
        try {
          const profileRes = await authAPI.getProfile();
          const profile = profileRes.data?.data || profileRes.data;
          const sig = profile?.signature;
          if (sig) {
            setFormValues(prev => ({ ...prev, signature: sig }));
            setAutoFilledKeys(prev => ({ ...prev, signature: true }));
          }
        } catch { /* ignore */ }
      }

      setArrayRows([]);
      setArrayKeys("");
      setMessage("");
      setFilledHtml("");
      setFilledPath("");
      setDocTitle(fullTmpl.name + " - " + new Date().toLocaleDateString("km-KH"));
      setDocDescription(fullTmpl.description?.trim() || fullTmpl.name || "របាយការណ៍បង្កើតចេញពីគំរូ");
      setDocCategory(fullTmpl.category || "ផ្សេងៗ");
      setActiveStep(2);
    } catch {
      setMessage("ទាញយកព័ត៌មានលម្អិតគំរូមិនបាន");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (k, v) => {
    setFormValues(prev => ({ ...prev, [k]: v }));
  };

  // System Auto-Fill Feature
  const handleAutoFillSystemContext = () => {
    if (!selected) return;

    const nextValues = { ...formValues };
    const nextAutoFilled = { ...autoFilledKeys };
    let filledCount = 0;

    const currentUserName = user?.full_name || user?.name || user?.username || "មន្ត្រីទទួលបន្ទុក";
    const currentUserRole = user?.role || "ប្រធានការិយាល័យ";
    const currentOrg = user?.organization || "រដ្ឋបាលស្រុក";
    const khmerToday = getKhmerDateStr();

    (selected.keys || []).forEach(k => {
      const lowerKey = k.toLowerCase();
      if (
        lowerKey.includes("date") ||
        lowerKey.includes("day") ||
        lowerKey.includes("today") ||
        lowerKey.includes("កាលបរិច្ឆេទ") ||
        lowerKey.includes("ថ្ងៃ") ||
        lowerKey.includes("ឆ្នាំ")
      ) {
        nextValues[k] = khmerToday;
        nextAutoFilled[k] = true;
        filledCount++;
      } else if (
        lowerKey.includes("author") ||
        lowerKey.includes("user") ||
        lowerKey.includes("prepared") ||
        lowerKey.includes("name") ||
        lowerKey.includes("អ្នករៀបចំ") ||
        lowerKey.includes("ឈ្មោះ")
      ) {
        nextValues[k] = currentUserName;
        nextAutoFilled[k] = true;
        filledCount++;
      } else if (
        lowerKey.includes("role") ||
        lowerKey.includes("position") ||
        lowerKey.includes("តួនាទី") ||
        lowerKey.includes("មុខតំណែង")
      ) {
        nextValues[k] = currentUserRole;
        nextAutoFilled[k] = true;
        filledCount++;
      } else if (
        lowerKey.includes("org") ||
        lowerKey.includes("unit") ||
        lowerKey.includes("zone") ||
        lowerKey.includes("អង្គភាព") ||
        lowerKey.includes("មន្ទីរ")
      ) {
        nextValues[k] = currentOrg;
        nextAutoFilled[k] = true;
        filledCount++;
      }
    });

    setFormValues(nextValues);
    setAutoFilledKeys(nextAutoFilled);
    setMessage(`បានបំពេញទិន្នន័យស្វ័យប្រវត្តិពីប្រព័ន្ធចំនួន ${filledCount} ចំរុះ!`);
  };

  // CSV / Excel Data Importer
  const handleImportCSVData = () => {
    if (!rawCSVText.trim()) return;

    const lines = rawCSVText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    const separator = firstLine.includes("\t") ? "\t" : ",";

    let headers = [];
    let startLineIndex = 0;

    const existingKeys = arrayKeys.split(",").map(s => s.trim()).filter(Boolean);
    if (existingKeys.length > 0) {
      headers = existingKeys;
    } else {
      headers = firstLine.split(separator).map(s => s.trim().replace(/^["']|["']$/g, ""));
      setArrayKeys(headers.join(", "));
      startLineIndex = 1;
    }

    const newRows = [];
    for (let i = startLineIndex; i < lines.length; i++) {
      const parts = lines[i].split(separator).map(s => s.trim().replace(/^["']|["']$/g, ""));
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx] || "";
      });
      newRows.push(rowObj);
    }

    setArrayRows(prev => [...prev, ...newRows]);
    setRawCSVText("");
    setShowImporter(false);
    setMessage(`បាននាំចូលទិន្នន័យតារាងចំនួន ${newRows.length} ជួរដោយជោគជ័យ!`);
  };

  const handleArrayKeyChange = (rowIdx, k, v) => {
    setArrayRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [k]: v };
      return next;
    });
  };

  const addArrayRow = () => {
    const keys = arrayKeys.split(",").map(s => s.trim()).filter(Boolean);
    if (keys.length === 0) return;
    const row = {};
    keys.forEach(k => { row[k] = ""; });
    setArrayRows(prev => [...prev, row]);
  };

  const removeArrayRow = (idx) => {
    setArrayRows(prev => prev.filter((_, i) => i !== idx));
  };

  // Completion calculation
  const totalKeysCount = (selected?.keys || []).length;
  const filledKeysCount = useMemo(() => {
    if (!selected) return 0;
    return (selected.keys || []).filter(k => formValues[k] && formValues[k].trim() !== "").length;
  }, [selected, formValues]);

  const completionPercent = totalKeysCount > 0 ? Math.round((filledKeysCount / totalKeysCount) * 100) : 0;

  const handlePreview = async () => {
    if (!selected) return;

    const payload = { ...formValues };
    if (arrayRows.length > 0) {
      payload.items = [...arrayRows];
    }

    for (const k of Object.keys(payload)) {
      if (payload[k] === "") {
        delete payload[k];
      }
    }

    setPreviewing(true);
    setMessage("");
    try {
      const fillRes = await reportTemplatesAPI.fill(selected.id, payload);
      const resPayload = fillRes.data?.data ?? fillRes.data;
      setFilledHtml(resPayload.content || "");
      setFilledPath(resPayload.storage_path || "");
      setMessage("បានបង្កើតទិដ្ឋភាពមើលជាមុនដោយជោគជ័យ");
      setActiveStep(3);
    } catch (err) {
      console.error("Preview error:", err);
      setMessage(err?.response?.data?.error || err?.message || "មិនអាចមើលជាមុនបានទេ");
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    if (!selected) return;

    const finalTitle = docTitle.trim();
    const finalDesc = docDescription.trim();
    const finalCat = docCategory.trim();
    const finalContent = filledHtml.trim();

    const errs = {};
    if (!finalTitle) errs.title = "សូមបញ្ចូលចំណងជើងរបាយការណ៍";
    if (!finalDesc) errs.description = "សូមបញ្ចូលការពិពណ៌នា";
    if (!finalCat) errs.category = "សូមជ្រើសរើសប្រភេទរបាយការណ៍";
    if (!finalContent) errs.content = "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍";

    if (Object.keys(errs).length > 0) {
      setValidationPopup(errs);
      return;
    }

    setCreating(true);
    setMessage("");
    try {
      const res = await reportDocumentsAPI.createSimple({
        title: finalTitle,
        description: finalDesc,
        content: finalContent,
        category: finalCat
      });
      const doc = res.data?.data ?? res.data;
      navigate(`/reports/${doc.id}`);
    } catch (err) {
      console.error("Report creation error:", err);
      setMessage(err?.response?.data?.error || err?.message || "បង្កើតរបាយការណ៍មិនបាន");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadFilled = async () => {
    if (!filledPath) return;
    try {
      const res = await reportTemplatesAPI.downloadFilled(filledPath);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = filledPath.split('/').pop() || `${selected.name}_filled.docx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download error:", err);
      setMessage("មិនអាចទាញយកឯកសារបំពេញបានទេ");
    }
  };

  return (
    <div className="page report-page report-view-page template-builder-container" lang="km">
      {/* Topbar & Hero Banner */}
      <div className="report-form-topbar" style={{ marginBottom: "0.5rem" }}>
        <button
          type="button"
          className="btn-icon report-back-btn"
          onClick={() => navigate("/reports")}
          title="ត្រឡប់"
        >
          <LuArrowLeft size={20} />
        </button>
        <ReportHero
          variant="list"
          title="បង្កើតរបាយការណ៍ពីគំរូ"
          subtitle="ជ្រើសរើសគំរូ បំពេញតម្លៃ មើលជាមុន និងទាញយកជាឯកសារផ្លូវការ"
        />
      </div>

      {/* Modern 3-Step Wizard Navigation */}
      <div className="template-wizard-bar">
        <div className="wizard-steps">
          <button
            type="button"
            className={`wizard-step ${activeStep === 1 ? "active" : activeStep > 1 ? "completed" : ""}`}
            onClick={() => setActiveStep(1)}
          >
            <div className="wizard-step-num">{activeStep > 1 ? <LuCheck size={16} /> : "1"}</div>
            <div>
              <span className="wizard-step-label">ជ្រើសរើសគំរូ</span>
              <span className="wizard-step-sub">{selected ? selected.name : "ជ្រើសគំរូរបាយការណ៍"}</span>
            </div>
          </button>

          <div className={`wizard-connector ${activeStep >= 2 ? "active" : ""}`} />

          <button
            type="button"
            className={`wizard-step ${activeStep === 2 ? "active" : activeStep > 2 ? "completed" : ""}`}
            onClick={() => selected && setActiveStep(2)}
            disabled={!selected}
          >
            <div className="wizard-step-num">{activeStep > 2 ? <LuCheck size={16} /> : "2"}</div>
            <div>
              <span className="wizard-step-label">បំពេញទិន្នន័យ</span>
              <span className="wizard-step-sub">បញ្ចូលព័ត៌មានលម្អិត</span>
            </div>
          </button>

          <div className={`wizard-connector ${activeStep >= 3 ? "active" : ""}`} />

          <button
            type="button"
            className={`wizard-step ${activeStep === 3 ? "active" : ""}`}
            onClick={() => filledHtml && setActiveStep(3)}
            disabled={!filledHtml}
          >
            <div className="wizard-step-num">3</div>
            <div>
              <span className="wizard-step-label">មើលជាមុន & រក្សាទុក</span>
              <span className="wizard-step-sub">ទាញយក DOCX ឬ រក្សាទុក</span>
            </div>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {message && (
        <div
          className={`alert ${message.includes("មិនបាន") || message.includes("មិនអាច") ? "alert-error" : "alert-success"
            }`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
          }}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.8 }}
          >
            <LuX size={16} />
          </button>
        </div>
      )}

      {/* STEP 1: SELECT TEMPLATE */}
      {activeStep === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Search & Category Filter Bar */}
          <div className="template-filter-wrap">
            <div className="template-search-box">
              <input
                type="text"
                className="template-search-input"
                placeholder="ស្វែងរកគំរូតាមឈ្មោះ បរិយាយ ឬ ពាក្យគន្លឹះ..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <LuSearch className="template-search-icon" />
            </div>

            <div className="template-category-chips">
              {categoriesList.map(cat => {
                const count =
                  cat === "ទាំងអស់"
                    ? templates.length
                    : templates.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`template-cat-chip ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat}</span>
                    <span className="cat-count-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid / Skeleton / Empty state */}
          {loading ? (
            <div className="template-grid-modern">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton-card">
                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                    <div className="skeleton-box skeleton-avatar" />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div className="skeleton-box skeleton-line" />
                      <div className="skeleton-box skeleton-line-short" />
                    </div>
                  </div>
                  <div className="skeleton-box skeleton-line" style={{ height: 36, marginTop: "0.5rem" }} />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem"
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  fontSize: "1.75rem"
                }}
              >
                <LuFileText />
              </div>
              <h3 style={{ margin: 0, color: "#334155" }}>រកមិនឃើញគំរូរបាយការណ៍</h3>
              <p style={{ color: "#64748b", margin: 0, maxWidth: "380px", fontSize: "0.9rem" }}>
                សូមព្យាយាមផ្លាស់ប្តូរពាក្យស្វែងរក ឬ ជ្រើសរើសប្រភេទផ្សេងទៀត។
              </p>
            </div>
          ) : (
            <div className="template-grid-modern">
              {filteredTemplates.map(t => {
                const format = (t.format || "docx").toLowerCase();
                const formatClass =
                  format === "xlsx"
                    ? "format-badge-xlsx"
                    : format === "pdf"
                      ? "format-badge-pdf"
                      : "format-badge-docx";

                return (
                  <div
                    key={t.id}
                    className="template-card-modern"
                    onClick={() => handleSelect(t)}
                  >
                    <div className="template-card-header">
                      <div className="template-card-icon-wrap">
                        <LuFileText />
                      </div>
                      <div className="template-card-info">
                        <h4 className="template-card-title" title={t.name}>
                          {t.name}
                        </h4>
                        <div className="template-card-meta">
                          <span className={`format-badge ${formatClass}`}>{format.toUpperCase()}</span>
                          {t.category && <span className="cat-pill">{t.category}</span>}
                        </div>
                      </div>
                    </div>

                    {t.description && <p className="template-card-desc">{t.description}</p>}

                    <div className="template-card-footer">
                      <span className="keys-count-pill">
                        <LuSparkles size={13} />
                        {(t.keys || []).length} keys
                      </span>
                      <span className="template-card-action-hint">
                        ជ្រើសរើស <LuChevronRight size={16} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: FILL DATA FORM & SMART INPUT FLOW */}
      {activeStep === 2 && selected && (
        <div className="template-form-card">
          {/* Selected Header & Actions */}
          <div className="selected-template-header">
            <div className="selected-template-info">
              <h2>
                <LuFileText style={{ color: "#4f46e5" }} />
                {selected.name}
              </h2>
              <div className="selected-template-sub">
                <span>
                  ប្រភេទ៖ <strong>{selected.category || "ផ្សេងៗ"}</strong>
                </span>
                <span>·</span>
                <span>
                  ទ្រង់ទ្រាយ៖ <strong>{(selected.format || "docx").toUpperCase()}</strong>
                </span>
                <span>·</span>
                <span>
                  <strong>{totalKeysCount}</strong> keys
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn-autofill-sparkle"
                onClick={handleAutoFillSystemContext}
                title="បំពេញឈ្មោះ អ្នករៀបចំ កាលបរិច្ឆេទ និងអង្គភាពពីប្រព័ន្ធដោយស្វ័យប្រវត្តិ"
              >
                <LuZap size={16} /> បំពេញស្វ័យប្រវត្តិពីប្រព័ន្ធ
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveStep(1)}
                style={{ borderRadius: "8px" }}
              >
                <LuRefreshCw size={14} /> ជ្រើសរើសគំរូផ្សេង
              </button>
            </div>
          </div>

          {/* Key Completion Progress Tracker Bar */}
          <div className="completion-tracker-bar">
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
              បំពេញបាន {filledKeysCount} / {totalKeysCount} ({completionPercent}%)
            </span>
            <div className="completion-progress-track">
              <div className="completion-progress-fill" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          {/* Left (Form) + Right (Live Preview) Split */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            {/* Left Column: Form Fields */}
            <div style={{ flex: "1 1 50%", minWidth: 0 }}>
              <div className="template-fields-grid" style={{ gridTemplateColumns: "1fr", gap: "0.5rem" }}>
            {(selected.keys || []).map(k => {
              const lowerKey = k.toLowerCase();
              const isAuto = autoFilledKeys[k];
              const isDateType =
                lowerKey.includes("date") ||
                lowerKey.includes("day") ||
                lowerKey.includes("កាលបរិច្ឆេទ") ||
                lowerKey.includes("ថ្ងៃ");
              const isUserType =
                lowerKey.includes("author") ||
                lowerKey.includes("user") ||
                lowerKey.includes("prepared") ||
                lowerKey.includes("អ្នករៀបចំ") ||
                lowerKey.includes("ឈ្មោះ");
              const isRoleType =
                lowerKey.includes("role") ||
                lowerKey.includes("position") ||
                lowerKey.includes("តួនាទី") ||
                lowerKey.includes("មុខតំណែង");
              const isOrgType =
                lowerKey.includes("org") ||
                lowerKey.includes("unit") ||
                lowerKey.includes("zone") ||
                lowerKey.includes("អង្គភាព") ||
                lowerKey.includes("មន្ទីរ");
              const isTextareaType =
                lowerKey.includes("desc") ||
                lowerKey.includes("note") ||
                lowerKey.includes("remark") ||
                lowerKey.includes("content") ||
                lowerKey.includes("responsibilities") ||
                lowerKey.includes("បរិយាយ") ||
                lowerKey.includes("ចំណាំ") ||
                lowerKey.includes("ទំនួលខុស");
              const isNumberType =
                lowerKey.includes("count") ||
                lowerKey.includes("total") ||
                lowerKey.includes("amount") ||
                lowerKey.includes("ចំនួន");
              const isSignatureType = lowerKey === "signature" || lowerKey.includes("ហត្ថលេខា") || lowerKey.includes("ហត្ថ");

              const currentUserName = user?.full_name || user?.name || user?.username || "មន្ត្រីទទួលបន្ទុក";
              const currentUserRole = user?.role || "ប្រធានការិយាល័យ";
              const currentOrg = user?.organization || "រដ្ឋបាលស្រុក";

              const metaItem = (selected.keys_meta || []).find(m => m.key_name === k);
              const labelText = metaItem?.display_label || humanizeKey(k);
              const fieldType = metaItem?.field_type || (isTextareaType ? "textarea" : isNumberType ? "number" : isDateType ? "date" : "text");
              const isRequired = metaItem?.is_required || false;

              return (
                <div key={k} className="modern-form-group" style={{ padding: "0.6rem 0.75rem" }}>
                  <label className="modern-form-label" style={{ marginBottom: "0.25rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: "600", fontSize: "0.83rem" }}>
                      {(fieldType === "date" || isDateType) && <LuCalendar size={14} style={{ color: "#6366f1" }} />}
                      {isUserType && <LuUser size={14} style={{ color: "#0b6bcb" }} />}
                      {isRoleType && <LuBriefcase size={14} style={{ color: "#d97706" }} />}
                      {isOrgType && <LuBuilding size={14} style={{ color: "#059669" }} />}
                      {fieldType !== "date" && !isDateType && !isUserType && !isRoleType && !isOrgType && <LuFileText size={14} style={{ color: "#64748b" }} />}
                      {labelText}
                      {isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                    </span>
                    {isAuto && (
                      <span className="field-status-badge field-status-autofill" style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem" }}>
                        <LuZap size={10} /> ស្វ័យ
                      </span>
                    )}
                  </label>

                  {isSignatureType ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {formValues[k] ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <img
                            src={formValues[k]}
                            alt="ហត្ថលេខា"
                            style={{ maxHeight: "60px", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px", background: "#fff" }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleChange(k, "")}
                            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.72rem", cursor: "pointer", borderRadius: "4px" }}
                          >
                            <LuX size={12} /> ដកចេញ
                          </button>
                        </div>
                      ) : isAuto ? (
                        <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                          <LuZap size={12} style={{ verticalAlign: "middle", color: "#f59e0b" }} /> កំពុងទាញយកហត្ថលេខាពីប្រវត្តិរូប...
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                          ហត្ថលេខានឹងត្រូវបានបំពេញដោយស្វ័យប្រវត្តិពីប្រវត្តិរូបរបស់អ្នក
                        </span>
                      )}
                    </div>
                  ) : fieldType === "textarea" ? (
                    <textarea
                      className="modern-form-input"
                      rows={3}
                      value={formValues[k] || ""}
                      onChange={e => handleChange(k, e.target.value)}
                      placeholder={`បញ្ចូល ${labelText}`}
                      required={isRequired}
                    />
                  ) : (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <input
                        type={fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"}
                        className="modern-form-input"
                        value={formValues[k] || ""}
                        onChange={e => handleChange(k, e.target.value)}
                        placeholder={`បញ្ចូល ${labelText}`}
                        required={isRequired}
                      />
                      {(fieldType === "date" || isDateType) && (
                        <button type="button" className="btn btn-sm"
                          onClick={() => handleChange(k, getKhmerDateStr())}
                          style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4338ca", borderRadius: "6px", whiteSpace: "nowrap", fontSize: "0.75rem", fontWeight: "600", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                          ថ្ងៃនេះ
                        </button>
                      )}
                      {isUserType && (
                        <button type="button" onClick={() => handleChange(k, currentUserName)}
                          style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.7rem", cursor: "pointer", fontWeight: "500", whiteSpace: "nowrap" }}>
                          👤
                        </button>
                      )}
                      {isRoleType && (
                        <button type="button" onClick={() => handleChange(k, currentUserRole)}
                          style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.7rem", cursor: "pointer", fontWeight: "500" }}>
                          💼
                        </button>
                      )}
                      {isOrgType && (
                        <button type="button" onClick={() => handleChange(k, currentOrg)}
                          style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.7rem", cursor: "pointer", fontWeight: "500" }}>
                          🏢
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div style={{
          flex: "1 1 50%",
          minWidth: 0,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          overflow: "hidden",
          position: "sticky",
          top: "1rem",
          maxHeight: "calc(100vh - 180px)",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{
            padding: "0.6rem 1rem",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "0.82rem",
            fontWeight: "600",
            color: "#475569",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <LuEye size={14} style={{ color: "#6366f1" }} /> ទិដ្ឋភាពផ្ទាល់ (Live Preview)
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <TextEditor
              value={livePreviewHtml}
              readOnly={true}
              placeholder="បំពេញទិន្នន័យនៅផ្នែកខាងឆ្វេង ដើម្បីមើលការបង្ហាញផ្ទាល់..."
            />
          </div>
        </div>
      </div>

      {/* Action Row */}
          <div className="builder-actions-row">
            <button
              type="button"
              className="btn-primary-gradient"
              onClick={handlePreview}
              disabled={previewing}
            >
              <LuEye size={18} />
              <span>{previewing ? "កំពុងដំណើរការបំពេញ..." : "បំពេញ និងមើលជាមុន (Preview)"}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & EXPORT WORKSPACE */}
      {activeStep === 3 && filledHtml && (
        <div className="template-preview-card">
          <div className="preview-bar-top">
            <div className="preview-title-group">
              <h3>ទិដ្ឋភាពមើលជាមុននៃរបាយការណ៍</h3>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: "0.78rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  fontWeight: 600
                }}
              >
                រួចរាល់ / Ready
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveStep(2)}
                style={{ borderRadius: "8px" }}
              >
                កែប្រែទិន្នន័យឡើងវិញ
              </button>
              {filledPath && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleDownloadFilled}
                  style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <LuDownload size={16} /> ទាញយក DOCX
                </button>
              )}
              <button
                type="button"
                className="btn-success-gradient"
                onClick={handleCreate}
                disabled={creating}
              >
                <LuSave size={16} />
                <span>{creating ? "កំពុងរក្សាទុក..." : "រក្សាទុកជារបាយការណ៍"}</span>
              </button>
            </div>
          </div>

          {/* Editable Document Header Fields (Title, Description, Category) */}
          <div className="report-create-fields" style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", marginTop: "0.5rem" }}>
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                ចំណងជើងរបាយការណ៍ / Report Title <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                className="modern-form-input"
                style={{ fontSize: "1.15rem", fontWeight: "700", background: "#ffffff" }}
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="បញ្ចូលចំណងជើងរបាយការណ៍ *"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  ការពិពណ៌នា / Description <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="modern-form-input"
                  style={{ background: "#ffffff" }}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="បញ្ចូលការពិពណ៌នាសង្ខេប *"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  ប្រភេទ / Category <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  className="modern-form-input"
                  style={{ background: "#ffffff", cursor: "pointer", width: "100%" }}
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  required
                >
                  <option value="រដ្ឋបាល">រដ្ឋបាល</option>
                  <option value="ហិរញ្ញវត្ថុ">ហិរញ្ញវត្ថុ</option>
                  <option value="សេដ្ឋកិច្ច">សេដ្ឋកិច្ច</option>
                  <option value="សង្គមកិច្ច">សង្គមកិច្ច</option>
                  <option value="សន្តិសុខ">សន្តិសុខ</option>
                  <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                  {docCategory && !["រដ្ឋបាល", "ហិរញ្ញវត្ថុ", "សេដ្ឋកិច្ច", "សង្គមកិច្ច", "សន្តិសុខ", "ផ្សេងៗ"].includes(docCategory) && (
                    <option value={docCategory}>{docCategory}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Full Rich Text Editor Workspace (same as /reports/create) */}
          <div className="report-create-editor" style={{ marginTop: "0.75rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem", display: "block" }}>
              ខ្លឹមសាររបាយការណ៍ / Rich Text Content <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <TextEditor
              variant="full"
              value={filledHtml}
              onChange={(val) => setFilledHtml(val)}
              placeholder="ខ្លឹមសាររបាយការណ៍ *"
            />
          </div>
        </div>
      )}

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
    </div>
  );
}
