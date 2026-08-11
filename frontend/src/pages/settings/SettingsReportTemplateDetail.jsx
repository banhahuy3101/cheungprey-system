import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuFileText,
  LuDownload,
  LuTrash2,
  LuCopy,
  LuCheck,
  LuZap,
  LuSparkles,
  LuPencil
} from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import TextEditor from "../../components/TextEditor";

const KEY_LABELS = {
  title: "ចំណងជើង (Report Title)",
  author: "អ្នករៀបចំ (Author)",
  prepared_by: "អ្នករៀបចំ (Prepared By)",
  date: "កាលបរិច្ឆេទ (Date)",
  created_at: "កាលបរិច្ឆេទបង្កើត (Created Date)",
  organization: "អង្គភាព (Organization)",
  unit: "អង្គភាព (Unit)",
  department: "ការិយាល័យ (Department)",
  role: "តួនាទី (Role / Position)",
  position: "មុខតំណែង (Position)",
  summary: "សេចក្តីសង្ខេប (Summary)",
  description: "ការពិពណ៌នា (Description)",
  signature: "ហត្ថលេខា (Signature)",
  table_data: "ទិន្នន័យតារាង (Dynamic Table Data)",
};

function getKeyDisplayLabel(k) {
  if (!k) return "";
  const lower = k.toLowerCase().trim();
  if (KEY_LABELS[lower]) return KEY_LABELS[lower];
  return k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function SettingsReportTemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const [keysConfig, setKeysConfig] = useState([]);
  const [savingKeys, setSavingKeys] = useState(false);
  const [editingKeys, setEditingKeys] = useState(false);

  useEffect(() => {
    if (template) {
      const keys = template.keys || [];
      const meta = template.keys_meta || [];
      const config = keys.map((k) => {
        const found = meta.find((m) => m.key_name === k);
        let fallbackLabel = "";
        const lowerKey = k.toLowerCase().trim();
        if (KEY_LABELS[lowerKey]) {
          fallbackLabel = KEY_LABELS[lowerKey].split(" (")[0];
        }
        return {
          key: k,
          label: found?.display_label || fallbackLabel || k,
          category: found?.category || "general",
          fieldType: found?.field_type || "text",
          defaultValue: found?.default_value || "",
          isRequired: found?.is_required || false,
        };
      });
      setKeysConfig(config);
    }
  }, [template]);

  const handleSaveKeysConfig = async (e) => {
    if (e) e.preventDefault();
    if (!template) return;

    const missingLabel = keysConfig.find((item) => !item.label.trim());
    if (missingLabel) {
      setMessage(`សូមបំពេញស្លាកបង្ហាញសម្រាប់សោរ {{${missingLabel.key}}}`);
      return;
    }

    setSavingKeys(true);
    setMessage("");
    try {
      await Promise.all(
        keysConfig.map((item) =>
          reportTemplatesAPI.addKey(template.id, {
            key: item.key,
            label: item.label.trim(),
            category: item.category,
            field_type: item.fieldType,
            default_value: item.defaultValue,
            is_required: item.isRequired,
          })
        )
      );

      const res = await reportTemplatesAPI.getById(id);
      const tmpl = res.data?.data || res.data;
      if (tmpl) setTemplate(tmpl);
      setEditingKeys(false);
      setMessage("បានរក្សាទុកការកំណត់សោរព័ត៌មានដោយជោគជ័យ");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("រក្សាទុកការកំណត់សោរព័ត៌មានមិនបានជោគជ័យ");
    } finally {
      setSavingKeys(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await reportTemplatesAPI.getById(id);
        const tmpl = res.data?.data || res.data;
        if (tmpl) {
          setTemplate(tmpl);
        } else {
          setMessage("រកមិនឃើញគំរូរបាយការណ៍នេះទេ");
        }
      } catch {
        setMessage("មិនអាចទាញយកព័ត៌មានគំរូបានទេ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formattedContent = useMemo(() => {
    if (!template) return "";
    let html = template.content || `<div style="padding:2rem; text-align:center; color:#64748b; font-family:sans-serif;">
      <h2 style="color:#1e293b; font-weight:700; margin-bottom:1rem;">${template.name}</h2>
      <p style="margin-bottom:1.5rem; font-size:1rem;">ឯកសារគំរូ Microsoft Word (.docx) ត្រូវបានរក្សាទុកនៅលើប្រព័ន្ធ។</p>
    </div>`;

    html = html.replace(/\{\{[^}]*\}\}/g, (match) =>
      `<mark style="background:#e0e7ff;color:#4338ca;border-radius:3px;padding:0 3px;font-weight:600;">${match}</mark>`
    );

    return html;
  }, [template]);

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1800);
  };

  const handleDownload = async () => {
    if (!template) return;
    try {
      const res = await reportTemplatesAPI.download(template.id);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.file_name || `${template.name}.docx`;
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage("ទាញយកឯកសារមិនបាន");
    }
  };

  const handleDelete = async () => {
    if (!template || !window.confirm(`លុបគំរូ «${template.name}»?`)) return;
    try {
      await reportTemplatesAPI.delete(template.id);
      navigate("/settings/report-templates");
    } catch {
      setMessage("លុបមិនបាន");
    }
  };

  if (loading) {
    return (
      <div className="page template-page">
        <div className="loading" style={{ padding: "3rem", textAlign: "center" }}>
          កំពុងផ្ទុកព័ត៌មានលម្អិតគំរូ...
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="page template-page">
        <div style={{ padding: "2rem" }}>
          <button className="btn btn-secondary" onClick={() => navigate("/settings/report-templates")}>
            <LuArrowLeft /> ត្រឡប់ក្រោយ
          </button>
          <div className="alert alert-error" style={{ marginTop: "1rem" }}>
            {message || "រកមិនឃើញគំរូរបាយការណ៍"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page template-page" style={{ paddingBottom: "3rem" }}>
      {/* Top Navigation & Page Title Bar */}
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate("/settings/report-templates")}
            title="ត្រឡប់ទៅកាន់បញ្ជីគំរូ"
          >
            <LuArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                {template.name}
              </h2>
              <span className={`badge-${template.format}`}>{template.format.toUpperCase()}</span>
            </div>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              ទំព័រព័ត៌មានលម្អិត & មើលឯកសារគំរូ (Template Details & Preview Page)
            </span>
          </div>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownload}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <LuDownload size={15} /> ទាញយកឯកសារ
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/settings/report-templates/${template.id}/edit`)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <LuPencil size={15} /> កែប្រែ
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <LuTrash2 size={15} /> លុបគំរូ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/reports/create-template?templateId=${template.id}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "linear-gradient(135deg, #185abd 0%, #0f4c81 100%)",
              borderRadius: "8px",
              padding: "0.45rem 0.9rem",
              fontWeight: "600"
            }}
          >
            <LuSparkles size={16} /> បង្កើតរបាយការណ៍ចេញពីគំរូនេះ
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      )}

      {/* Main Content Layout Grid (Split Screen for Builder / Schema Configuration) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", width: "100%", alignItems: "flex-start" }}>

        {/* Left Column - Canvas Preview & Metadata (60% width) */}
        <div style={{ flex: "1 1 58%", display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: "360px" }}>

          {/* Metadata Summary Grid Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1.1rem 1.25rem",
              boxShadow: "0 4px 15px -3px rgba(0,0,0,0.02)"
            }}
          >
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1e293b", marginTop: 0, marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuFileText style={{ color: "#185abd" }} /> ព័ត៌មានសង្ខេបនៃគំរូ (Template Metadata)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>ឈ្មោះគំរូ</span>
                <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.9rem" }}>{template.name}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>ប្រភេទ / ទ្រង់ទ្រាយ</span>
                <div><span className={`badge-${template.format}`}>{template.format.toUpperCase()}</span></div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>ទំហំឯកសារ</span>
                <div style={{ fontWeight: "600", color: "#334155", fontSize: "0.88rem" }}>{template.file_size ? formatSize(template.file_size) : "—"}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>កាលបរិច្ឆេទបង្កើត</span>
                <div style={{ fontWeight: "600", color: "#334155", fontSize: "0.88rem" }}>{template.created_at ? new Date(template.created_at).toLocaleString("km-KH") : "—"}</div>
              </div>
            </div>

            {template.description && (
              <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", fontSize: "0.85rem", color: "#475569" }}>
                <strong>ការពិពណ៌នា៖</strong> {template.description}
              </div>
            )}
          </div>

          {/* MS Word Interactive TextEditor Canvas Display Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "1.25rem",
              boxShadow: "0 4px 15px -3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                ទិដ្ឋភាពមើលជាមុននៃឯកសារ (Document Canvas Preview)
              </h3>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                ទ្រង់ទ្រាយក្រដាស A4 Standard
              </span>
            </div>

            <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", minHeight: "520px" }}>
              <TextEditor
                value={formattedContent}
                readOnly={true}
                placeholder="កំពុងបង្ហាញឯកសារគំរូ..."
              />
            </div>
          </div>
        </div>

        {/* Right Column - Schema Configuration Panel (40% width) */}
        <div
          style={{
            flex: "1 1 38%",
            minWidth: "320px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 4px 15px -3px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuZap style={{ color: "#6366f1" }} /> សោរព័ត៌មាន (Schema)
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "5px" }}>
                {keysConfig.length} សោរ
              </span>
              {template.keys && template.keys.length > 0 && !editingKeys && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditingKeys(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem" }}
                >
                  <LuPencil size={13} /> កែប្រែសោរ
                </button>
              )}
            </div>
          </div>

          {editingKeys && (
            <p style={{ fontSize: "0.82rem", color: "#6366f1", margin: 0, lineHeight: 1.5, background: "#eef2ff", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
              កំណត់ស្លាក ប្រភេទវាល តម្លៃលំនាំដើម និងការបង្ខំបំពេញសម្រាប់សោរនីមួយៗ៖
            </p>
          )}

          {template.keys && template.keys.length > 0 ? (
            <form onSubmit={handleSaveKeysConfig} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "650px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {keysConfig.map((item, idx) => (
                  <div
                    key={item.key}
                    style={{
                      background: editingKeys ? "#f8fafc" : "#fafafa",
                      border: editingKeys ? "1px solid #e2e8f0" : "1px solid #f1f5f9",
                      borderRadius: "10px",
                      padding: editingKeys ? "0.8rem" : "0.6rem 0.8rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: editingKeys ? "0.5rem" : "0.3rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <code
                        onClick={() => handleCopyKey(item.key)}
                        style={{
                          background: "#e0e7ff",
                          color: "#4338ca",
                          border: "1px solid #c7d2fe",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontFamily: "monospace",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}
                        title="ចុចដើម្បីថតចម្លង"
                      >
                        {copiedKey === item.key ? <LuCheck size={11} style={{ color: "#16a34a" }} /> : <LuCopy size={10} />}
                        {`{{${item.key}}}`}
                      </code>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "600" }}>#{idx + 1}</span>
                    </div>

                    {editingKeys ? (
                      <>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem", display: "block" }}>
                            ស្លាកបង្ហាញ *
                          </label>
                          <input type="text" value={item.label}
                            onChange={(e) => setKeysConfig(prev => prev.map(c => c.key === item.key ? { ...c, label: e.target.value } : c))}
                            placeholder="ឧ. ឈ្មោះការិយាល័យ" required
                            style={{ width: "100%", height: "2rem", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none" }} />
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem", display: "block" }}>ប្រភេទវាល</label>
                            <select value={item.fieldType}
                              onChange={(e) => setKeysConfig(prev => prev.map(c => c.key === item.key ? { ...c, fieldType: e.target.value } : c))}
                              style={{ width: "100%", height: "2rem", padding: "0 0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", cursor: "pointer" }}>
                              <option value="text">អក្សរខ្លី (Text)</option>
                              <option value="number">លេខ (Number)</option>
                              <option value="date">កាលបរិច្ឆេទ (Date)</option>
                              <option value="textarea">អក្សរវែង (Textarea)</option>
                            </select>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: "80px" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem" }}>បង្ខំបំពេញ</span>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", height: "2rem" }}>
                              <input type="checkbox" checked={item.isRequired}
                                onChange={(e) => setKeysConfig(prev => prev.map(c => c.key === item.key ? { ...c, isRequired: e.target.checked } : c))}
                                style={{ width: "15px", height: "15px", accentColor: "#185abd", cursor: "pointer" }} />
                              <span style={{ fontSize: "0.78rem", color: "#475569", fontWeight: "500" }}>ចាំបាច់</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem", display: "block" }}>តម្លៃលំនាំដើម</label>
                          <input type={item.fieldType === "number" ? "number" : item.fieldType === "date" ? "date" : "text"}
                            value={item.defaultValue}
                            onChange={(e) => setKeysConfig(prev => prev.map(c => c.key === item.key ? { ...c, defaultValue: e.target.value } : c))}
                            placeholder="ឧ. ការិយាល័យរដ្ឋបាល"
                            style={{ width: "100%", height: "2rem", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none" }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", fontSize: "0.84rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ color: "#1e293b", fontWeight: "600" }}>{item.label}</span>
                          {item.isRequired && (
                            <span style={{ fontSize: "0.68rem", background: "#fef2f2", color: "#dc2626", padding: "0.05rem 0.35rem", borderRadius: "3px", fontWeight: "600" }}>ចាំបាច់</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#64748b", fontSize: "0.76rem" }}>
                          <span>ប្រភេទ: <strong>{item.fieldType}</strong></span>
                          {item.defaultValue && <span>លំនាំដើម: <strong>{item.defaultValue}</strong></span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editingKeys && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingKeys(false)}
                    style={{ flex: 1, height: "2.3rem", fontSize: "0.85rem", fontWeight: "600", borderRadius: "8px" }}
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingKeys}
                    style={{ flex: 1, height: "2.3rem", fontSize: "0.85rem", fontWeight: "600", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
                  >
                    {savingKeys ? "កំពុងរក្សាទុក..." : <><LuSparkles size={15} /> រក្សាទុក</>}
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>
              គ្មានសោរទិន្នន័យត្រូវបានរកឃើញនៅក្នុងគំរូរបាយការណ៍នេះទេ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
