import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuPlus, LuSave, LuUpload, LuFileText,
  LuZap, LuSparkles, LuCopy, LuCheck
} from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import { REPORT_CATEGORIES } from "../../utils/reportForm";
import TextEditor from "../../components/TextEditor";

const KEY_PRESETS = ["title", "author", "date", "organization", "department", "summary", "signature", "table_data"];

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

export default function SettingsReportTemplateEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("docx");
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const [keysConfig, setKeysConfig] = useState([]);
  const [savingKeys, setSavingKeys] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await reportTemplatesAPI.getById(id);
        const tmpl = res.data?.data || res.data;
        if (tmpl) {
          setTemplate(tmpl);
          setName(tmpl.name);
          setDescription(tmpl.description || "");
          setCategory(tmpl.category || "");
          setFormat(tmpl.format);
          setContent(tmpl.format === "html" ? tmpl.content || "" : "");

          const keys = tmpl.keys || [];
          const meta = tmpl.keys_meta || [];
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
      } catch {
        setMessage("មិនអាចទាញយកព័ត៌មានគំរូបានទេ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleInsertKey = (key) => {
    const tag = `{{${key}}}`;
    setContent((prev) => (prev ? prev + " " + tag : tag));
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1800);
  };

  const handleSaveBasic = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("category", category);
      form.append("format", format);
      if (format === "docx") {
        if (file) form.append("file", file);
      } else {
        form.append("content", content);
      }

      await reportTemplatesAPI.update(id, form);
      setMessage("បានរក្សាទុក");

      const res = await reportTemplatesAPI.getById(id);
      const tmpl = res.data?.data || res.data;
      if (tmpl) setTemplate(tmpl);
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage(err?.response?.data?.error || "មិនអាចរក្សាទុកបានទេ");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKeys = async (e) => {
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
      setMessage("បានរក្សាទុកការកំណត់សោរ");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("រក្សាទុកសោរមិនបាន");
    } finally {
      setSavingKeys(false);
    }
  };

  if (loading) {
    return (
      <div className="page template-page">
        <div className="loading" style={{ padding: "3rem", textAlign: "center" }}>កំពុងផ្ទុក...</div>
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
            {message || "រកមិនឃើញគំរូ"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page template-page" lang="km">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate(`/settings/report-templates/${id}`)}>
            <LuArrowLeft />
          </button>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>កែប្រែគំរូ៖ {template.name}</h2>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              កែប្រែព័ត៌មានមូលដ្ឋាន ឯកសារ និងកំណត់សោរព័ត៌មាន
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`} style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Left Column: Basic Info + File */}
        <div style={{ flex: "1 1 58%", minWidth: "360px" }}>
          <form onSubmit={handleSaveBasic} className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1e293b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuFileText style={{ color: "#185abd" }} /> ព័ត៌មានមូលដ្ឋាន
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  ឈ្មោះគំរូ *
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. របាយការណ៍ប្រចាំខែ" required
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  ប្រភេទ (Category) *
                </label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}>
                  <option value="">-- ជ្រើសរើសប្រភេទ --</option>
                  {REPORT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                ការពិពណ៌នា
              </label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="ការពិពណ៌នាសង្ខេបអំពីគំរូនេះ"
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                ប្រភេទទ្រង់ទ្រាយ *
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {["docx", "html"].map((fmt) => (
                  <label key={fmt}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "8px",
                      border: format === fmt ? "2px solid #185abd" : "1px solid #cbd5e1",
                      background: format === fmt ? "#e0e7ff" : "#ffffff", cursor: "pointer",
                      fontWeight: "600", fontSize: "0.88rem", color: format === fmt ? "#185abd" : "#475569",
                    }}
                    onClick={() => { if (fmt !== format) { setFormat(fmt); setFile(null); setContent(""); } }}
                  >
                    <input type="radio" value={fmt} checked={format === fmt} onChange={() => {}} style={{ accentColor: "#185abd" }} />
                    {fmt === "docx" ? <><LuUpload size={15} /> Microsoft Word (.docx)</> : "HTML Editor"}
                  </label>
                ))}
              </div>
            </div>

            {format === "docx" ? (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  ឯកសារ .docx ថ្មី
                </label>
                <div
                  style={{ border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "2rem", textAlign: "center", background: "#f8fafc", cursor: "pointer" }}
                  onClick={() => document.getElementById("edit-docx-input").click()}
                >
                  {file ? (
                    <div>
                      <LuUpload size={28} style={{ color: "#185abd", marginBottom: "0.5rem" }} />
                      <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>{file.name}</div>
                      <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>{(file.size / 1024).toFixed(1)} KB</div>
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setFile(null); }}
                        style={{ marginTop: "0.5rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline" }}>ដកចេញ</button>
                    </div>
                  ) : (
                    <div>
                      <LuFileText size={32} style={{ color: "#94a3b8", marginBottom: "0.5rem" }} />
                      <div style={{ fontWeight: "600", color: "#475569", fontSize: "0.9rem" }}>
                        {template.file_name ? `ឯកសារបច្ចុប្បន្ន៖ ${template.file_name}` : "ចុចដើម្បីជ្រើសរើសឯកសារថ្មី"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                        {template.file_name ? "ទុកទទេ បើមិនចង់ប្តូរឯកសារ" : "គាំទ្រតែឯកសារ .docx ក្រោម 10 MB"}
                      </div>
                    </div>
                  )}
                </div>
                <input id="edit-docx-input" type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
              </div>
            ) : (
              <div style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155" }}>
                  មាតិកាគំរូ HTML *
                  <small style={{ color: "#6366f1", marginLeft: "0.5rem" }}>បញ្ចូល {`{{key}}`} សម្គាល់សោរ</small>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "#475569" }}>
                    <LuPlus size={13} style={{ marginRight: "0.25rem", color: "#6366f1", verticalAlign: "middle" }} />បន្ថែមសោរ:
                  </span>
                  {KEY_PRESETS.map((key) => (
                    <button key={key} type="button" onClick={() => handleInsertKey(key)}
                      style={{ background: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: "5px", padding: "0.15rem 0.5rem", fontSize: "0.78rem", cursor: "pointer", fontWeight: "600" }}>
                      + {`{{${key}}}`}
                    </button>
                  ))}
                </div>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", minHeight: "440px" }}>
                  <TextEditor value={content || ""} onChange={(html) => setContent(html)} placeholder="បញ្ចូលមាតិកាគំរូរបាយការណ៍..." />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/settings/report-templates/${id}`)}>បោះបង់</button>
              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", minWidth: "140px", justifyContent: "center" }}>
                {saving ? "កំពុងរក្សាទុក..." : <><LuSave size={16} /> រក្សាទុក</>}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Key Configuration */}
        <div style={{ flex: "1 1 38%", minWidth: "320px" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <LuZap style={{ color: "#6366f1" }} /> សោរព័ត៌មាន (Schema)
              </h3>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "5px" }}>
                {keysConfig.length} សោរ
              </span>
            </div>

            {keysConfig.length > 0 ? (
              <form onSubmit={handleSaveKeys} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "560px", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {keysConfig.map((item, idx) => (
                    <div key={item.key} style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px", padding: "0.8rem",
                      display: "flex", flexDirection: "column", gap: "0.5rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <code onClick={() => handleCopyKey(item.key)} style={{
                          background: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe",
                          padding: "0.15rem 0.5rem", borderRadius: "6px", fontSize: "0.78rem",
                          fontFamily: "monospace", fontWeight: "700", cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: "0.25rem"
                        }} title="ចុចថតចម្លង">
                          {copiedKey === item.key ? <LuCheck size={11} style={{ color: "#16a34a" }} /> : <LuCopy size={10} />}
                          {`{{${item.key}}}`}
                        </code>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "600" }}>#{idx + 1}</span>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem", display: "block" }}>ស្លាកបង្ហាញ *</label>
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
                    </div>
                  ))}
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingKeys}
                  style={{ width: "100%", height: "2.3rem", fontSize: "0.85rem", fontWeight: "600", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                  {savingKeys ? "កំពុងរក្សាទុក..." : <><LuSparkles size={15} /> រក្សាទុកការកំណត់សោរ</>}
                </button>
              </form>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>
                គ្មានសោរទិន្នន័យ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
