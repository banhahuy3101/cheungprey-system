import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuPlus, LuSave, LuUpload, LuChevronRight, LuChevronLeft,
  LuCheck, LuCopy, LuZap, LuSparkles
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

function getKeyDefaultLabel(k) {
  if (!k) return "";
  const lower = k.toLowerCase().trim();
  if (KEY_LABELS[lower]) return KEY_LABELS[lower].split(" (")[0];
  return k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function SettingsReportTemplateCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [copiedKey, setCopiedKey] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("docx");
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [createdId, setCreatedId] = useState(null);
  const [keys, setKeys] = useState([]);
  const [keysConfig, setKeysConfig] = useState([]);
  const [savingKeys, setSavingKeys] = useState(false);

  const handleInsertKey = (key) => {
    const tag = `{{${key}}}`;
    setContent((prev) => (prev ? prev + " " + tag : tag));
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1800);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (format === "docx" && !file) return;
    if (format === "html" && !content.trim()) return;

    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("category", category.trim());
      form.append("format", format);
      if (format === "docx") {
        form.append("file", file);
      } else {
        form.append("content", content);
      }

      const res = await reportTemplatesAPI.upload(form);
      const tmpl = res.data?.data || res.data;
      setCreatedId(tmpl.id);
      const templateKeys = tmpl.keys || [];

      if (templateKeys.length === 0) {
        navigate(`/settings/report-templates/${tmpl.id}`);
        return;
      }

      setKeys(templateKeys);
      setKeysConfig(templateKeys.map((k) => ({
        key: k,
        label: getKeyDefaultLabel(k),
        category: "general",
        fieldType: "text",
        defaultValue: "",
        isRequired: false,
      })));
      setStep(2);
    } catch (err) {
      setMessage(err?.response?.data?.error || "មិនអាចបង្កើតគំរូបានទេ");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveKeys = async (e) => {
    if (e) e.preventDefault();
    if (!createdId) return;

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
          reportTemplatesAPI.addKey(createdId, {
            key: item.key,
            label: item.label.trim(),
            category: item.category,
            field_type: item.fieldType,
            default_value: item.defaultValue,
            is_required: item.isRequired,
          })
        )
      );
      navigate(`/settings/report-templates/${createdId}`);
    } catch {
      setMessage("រក្សាទុកការកំណត់សោរព័ត៌មានមិនបាន");
    } finally {
      setSavingKeys(false);
    }
  };

  const handleSkip = () => {
    if (createdId) {
      navigate(`/settings/report-templates/${createdId}`);
    }
  };

  return (
    <div className="page template-page" lang="km">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings/report-templates")}>
            <LuArrowLeft />
          </button>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              បង្កើតគំរូរបាយការណ៍ថ្មី
            </h2>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
            <span style={{
              background: step === 1 ? "#185abd" : step > 1 ? "#16a34a" : "#e2e8f0",
              color: step >= 1 ? "#fff" : "#94a3b8",
              width: "24px", height: "24px",
              borderRadius: "50%",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: "700", fontSize: "0.8rem"
            }}>
              {step > 1 ? <LuCheck size={14} /> : "1"}
            </span>
            <span style={{ color: step === 1 ? "#185abd" : "#64748b", fontWeight: "600" }}>ព័ត៌មានមូលដ្ឋាន</span>
          </div>
          <div style={{ width: "32px", height: "2px", background: step >= 2 ? "#16a34a" : "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
            <span style={{
              background: step === 2 ? "#185abd" : "#e2e8f0",
              color: step >= 2 ? "#fff" : "#94a3b8",
              width: "24px", height: "24px",
              borderRadius: "50%",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: "700", fontSize: "0.8rem"
            }}>2</span>
            <span style={{ color: step === 2 ? "#185abd" : "#64748b", fontWeight: "600" }}>កំណត់សោរព័ត៌មាន</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`} style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      )}

      {/* STEP 1: Basic Info + Upload */}
      {step === 1 && (
        <form onSubmit={handleCreate} className="card" style={{ padding: "1.5rem", maxWidth: "960px" }}>
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
                  onClick={() => { setFormat(fmt); setFile(null); setContent(""); }}
                >
                  <input type="radio" name="format" value={fmt} checked={format === fmt} onChange={() => {}} style={{ accentColor: "#185abd" }} />
                  {fmt === "docx" ? <><LuUpload size={15} /> Microsoft Word (.docx)</> : "HTML Editor"}
                </label>
              ))}
            </div>
          </div>

          {format === "docx" ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                ឯកសារ Word (.docx) *
              </label>
              <div
                style={{ border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "2rem", textAlign: "center", background: "#f8fafc", cursor: "pointer" }}
                onClick={() => document.getElementById("docx-file-input").click()}
              >
                {file ? (
                  <div>
                    <LuUpload size={28} style={{ color: "#185abd", marginBottom: "0.5rem" }} />
                    <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>{file.name}</div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>{(file.size / 1024).toFixed(1)} KB</div>
                    <button type="button" onClick={(ev) => { ev.stopPropagation(); setFile(null); }}
                      style={{ marginTop: "0.5rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline" }}>
                      ដកចេញ
                    </button>
                  </div>
                ) : (
                  <div>
                    <LuUpload size={32} style={{ color: "#94a3b8", marginBottom: "0.5rem" }} />
                    <div style={{ fontWeight: "600", color: "#475569", fontSize: "0.9rem" }}>ចុចដើម្បីជ្រើសរើសឯកសារ</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>គាំទ្រតែឯកសារ .docx ក្រោម 10 MB</div>
                  </div>
                )}
              </div>
              <input id="docx-file-input" type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} required />
            </div>
          ) : (
            <div style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155" }}>
                មាតិកាគំរូ HTML *
                <small style={{ color: "#6366f1", marginLeft: "0.5rem" }}>បញ្ចូល {`{{key}}`} ដើម្បីសម្គាល់សោរទិន្នន័យ</small>
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
                <TextEditor value={content || `<p>បញ្ចូលមាតិកាគំរូ <strong>{{title}}</strong> ទីនេះ...</p>`}
                  onChange={(html) => setContent(html)} placeholder="បញ្ចូលមាតិកាគំរូរបាយការណ៍..." />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/settings/report-templates")}>បោះបង់</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", minWidth: "140px", justifyContent: "center" }}>
              {uploading ? "កំពុងបង្កើត..." : <><LuChevronRight size={16} /> បន្តទៅកំណត់សោរ</>}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Key Configuration */}
      {step === 2 && (
        <div style={{ maxWidth: "960px" }}>
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px",
            padding: "0.75rem 1rem", marginBottom: "1.25rem",
            display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", color: "#166534"
          }}>
            <LuSparkles style={{ color: "#16a34a" }} />
            <span><strong>គំរូត្រូវបានបង្កើតដោយជោគជ័យ!</strong> — ឥឡូវកំណត់ស្លាក ប្រភេទវាល និងតម្លៃលំនាំដើមសម្រាប់សោរព័ត៌មាននីមួយៗ</span>
          </div>

          <form onSubmit={handleSaveKeys}>
            <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <LuZap style={{ color: "#6366f1" }} /> កំណត់រចនាសម្ព័ន្ធសោរព័ត៌មាន
                </h3>
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "5px" }}>
                  {keysConfig.length} សោរ
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "560px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {keysConfig.map((item, idx) => (
                  <div key={item.key} style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.8rem",
                    display: "flex", flexDirection: "column", gap: "0.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <code onClick={() => handleCopyKey(item.key)} style={{
                        background: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", padding: "0.15rem 0.5rem",
                        borderRadius: "6px", fontSize: "0.78rem", fontFamily: "monospace", fontWeight: "700",
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem"
                      }} title="ចុចដើម្បីថតចម្លង">
                        {copiedKey === item.key ? <LuCheck size={11} style={{ color: "#16a34a" }} /> : <LuCopy size={10} />}
                        {`{{${item.key}}}`}
                      </code>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: "600" }}>#{idx + 1}</span>
                    </div>

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
                        <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem", display: "block" }}>
                          ប្រភេទវាល
                        </label>
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
                      <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.2rem", display: "block" }}>
                        តម្លៃលំនាំដើម
                      </label>
                      <input type={item.fieldType === "number" ? "number" : item.fieldType === "date" ? "date" : "text"}
                        value={item.defaultValue}
                        onChange={(e) => setKeysConfig(prev => prev.map(c => c.key === item.key ? { ...c, defaultValue: e.target.value } : c))}
                        placeholder="ឧ. ការិយាល័យរដ្ឋបាល"
                        style={{ width: "100%", height: "2rem", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
              <button type="button" className="btn btn-secondary" onClick={handleSkip}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <LuChevronLeft size={16} /> រំលង (កំណត់ពេលក្រោយ)
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingKeys}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", minWidth: "160px", justifyContent: "center" }}>
                {savingKeys ? "កំពុងរក្សាទុក..." : <><LuSave size={16} /> រក្សាទុក និងបញ្ចប់</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
