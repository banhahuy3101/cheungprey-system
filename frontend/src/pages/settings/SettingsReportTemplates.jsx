import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuFileText, LuDownload, LuTrash2, LuPlus, LuEye, LuPencil, LuKeyRound, LuCopy, LuCheck, LuZap } from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import Modal from "./Modal";
import TextEditor from "../../components/TextEditor";
import { parseKeyItem, DEFAULT_KEY_LABELS } from "../../utils/keyHelpers";

export default function SettingsReportTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState(null);
  const [detailTmpl, setDetailTmpl] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFormat, setFormFormat] = useState("docx");
  const [formFile, setFormFile] = useState(null);
  const [formContent, setFormContent] = useState("");
  const [uploading, setUploading] = useState(false);

  const [keyTarget, setKeyTarget] = useState(null);
  const [keyName, setKeyName] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [addingKey, setAddingKey] = useState(false);

  const handleCopyKey = (key) => {
    const text = `{{${key}}}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1800);
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await reportTemplatesAPI.list();
      setTemplates(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setMessage("ផ្ទុកគំរូមិនបាន");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleEdit = (tmpl) => {
    setEditingTmpl(tmpl);
    setFormName(tmpl.name);
    setFormDesc(tmpl.description || "");
    setFormFormat(tmpl.format);
    setFormFile(null);
    setFormContent(tmpl.format === "html" ? tmpl.content || "" : "");
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`លុបគំរូ «${name}»?`)) return;
    try {
      await reportTemplatesAPI.delete(id);
      setMessage("លុបដោយជោគជ័យ");
      fetch();
    } catch {
      setMessage("លុបមិនបាន");
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await reportTemplatesAPI.download(id);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const disposition = res.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const name = match?.[1] || "template.docx";
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage("ទាញយកមិនបាន");
    }
  };

  const handleAddKey = async () => {
    if (!keyTarget || !keyName.trim()) return;
    setAddingKey(true);
    try {
      await reportTemplatesAPI.addKey(keyTarget.id, keyName.trim(), keyLabel.trim());
      setMessage(`បានបន្ថែមសោ «${keyName.trim()}»`);
      setKeyTarget(null);
      setKeyName("");
      setKeyLabel("");
      fetch();
    } catch (err) {
      const msg = err?.response?.data?.error || "";
      setMessage(msg === "Key already exists" ? "សោនេះមានរួចហើយ" : "បន្ថែមសោមិនបាន");
    } finally {
      setAddingKey(false);
    }
  };

  const resetForm = () => {
    setEditingTmpl(null);
    setFormName("");
    setFormDesc("");
    setFormFormat("docx");
    setFormFile(null);
    setFormContent("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formName) return;
    if (formFormat === "docx" && !formFile && !editingTmpl) return;
    if (formFormat === "html" && !formContent) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("name", formName);
      form.append("description", formDesc);
      form.append("format", formFormat);
      if (formFormat === "docx") {
        if (formFile) form.append("file", formFile);
      } else {
        form.append("content", formContent);
      }

      if (editingTmpl) {
        await reportTemplatesAPI.update(editingTmpl.id, form);
        setMessage(`បានកែប្រែគំរូ «${formName}»`);
      } else {
        await reportTemplatesAPI.upload(form);
        setMessage(`បានបញ្ចូលគំរូ «${formName}»`);
      }

      setShowModal(false);
      resetForm();
      fetch();
    } catch (err) {
      setMessage(err?.response?.data?.error || "ផ្ទុកឡើងមិនបាន");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page template-page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")}><LuArrowLeft /></button>
          <h2 className="section-title" style={{ margin: 0 }}>គ្រប់គ្រងគំរូរបាយការណ៍</h2>
        </div>
        <button type="button" className="btn btn-primary template-upload-btn" onClick={() => setShowModal(true)}>
          <LuPlus /> បន្ថែមគំរូ
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : templates.length === 0 ? (
        <div className="card template-empty">
          <LuFileText className="template-empty-icon" />
          <p>គ្មានគំរូ — ចុច «បន្ថែមគំរូ» ដើម្បីចាប់ផ្តើម</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table template-table">
            <thead>
              <tr>
                <th>ឈ្មោះ (Name)</th>
                <th>ប្រភេទ (Format)</th>
                <th>សោរទិន្នន័យ (Information Keys)</th>
                <th>ទំហំ</th>
                <th>កាលបរិច្ឆេទ</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td
                    className="template-name"
                    onClick={() => navigate(`/settings/report-templates/${t.id}`)}
                    style={{ fontWeight: "600", color: "#185abd", cursor: "pointer", textDecoration: "underline" }}
                    title="ចុចដើម្បីទៅកាន់ទំព័រព័ត៌មានលម្អិត (Navigate to Template Detail Page)"
                  >
                    {t.name}
                  </td>
                  <td><span className={`badge-${t.format}`}>{t.format.toUpperCase()}</span></td>
                  <td>
                    {t.keys && t.keys.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: "340px" }}>
                        {t.keys.map((item) => {
                          const { key, label } = parseKeyItem(item);
                          return (
                            <span
                              key={key}
                              onClick={(e) => { e.stopPropagation(); handleCopyKey(key); }}
                              style={{
                                fontSize: "0.72rem",
                                background: "#e0e7ff",
                                color: "#4338ca",
                                border: "1px solid #c7d2fe",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "5px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontWeight: "600"
                              }}
                              title={`${label} ({{${key}}}) - ចុចថតចម្លង`}
                            >
                              {copiedKey === key ? <LuCheck size={11} style={{ color: "#16a34a" }} /> : <LuCopy size={11} />}
                              {`{{${key}}}`}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem", italic: "true" }}>គ្មានសោ</span>
                    )}
                  </td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.file_size ? formatSize(t.file_size) : "—"}</td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.created_at ? new Date(t.created_at).toLocaleDateString("km-KH") : "—"}</td>
                  <td>
                    <div className="template-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/settings/report-templates/${t.id}`)} title="ទៅកាន់ទំព័រព័ត៌មានលម្អិត (View Detail Page)">
                        <LuEye />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)} title="កែប្រែ">
                        <LuPencil />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setKeyTarget(t); setKeyName(""); }} title="បន្ថែម / គ្រប់គ្រងសោរ">
                        <LuKeyRound />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDownload(t.id)} title="ទាញយក">
                        <LuDownload />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id, t.name)} title="លុប">
                        <LuTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FULL TEMPLATE DETAIL VIEWER MODAL */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="ទំព័រព័ត៌មានលម្អិតគំរូ (Template Details & Preview)">
        {detailTmpl && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "880px" }}>
            {/* Metadata Summary Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>ឈ្មោះគំរូ</span>
                <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>{detailTmpl.name}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>ប្រភេទទ្រង់ទ្រាយ</span>
                <div><span className={`badge-${detailTmpl.format}`}>{detailTmpl.format.toUpperCase()}</span></div>
              </div>
              <div>
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>ទំហំឯកសារ</span>
                <div style={{ fontWeight: "600", color: "#334155" }}>{detailTmpl.file_size ? formatSize(detailTmpl.file_size) : "—"}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>កាលបរិច្ឆេទបង្កើត</span>
                <div style={{ fontWeight: "600", color: "#334155" }}>{detailTmpl.created_at ? new Date(detailTmpl.created_at).toLocaleString("km-KH") : "—"}</div>
              </div>
            </div>

            {/* Description */}
            {detailTmpl.description && (
              <div style={{ background: "#f1f5f9", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.88rem", color: "#475569" }}>
                <strong>ការពិពណ៌នា៖</strong> {detailTmpl.description}
              </div>
            )}

            {/* Information Keys Tag Cloud */}
            <div>
              <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#334155", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>សោរព័ត៌មានដែលមានក្នុងឯកសារ (Information Keys):</span>
                <small style={{ color: "#6366f1" }}>💡 ចុចលើសោរដើម្បីថតចម្លង</small>
              </div>
              {detailTmpl.keys && detailTmpl.keys.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", background: "#faf5ff", padding: "0.75rem", borderRadius: "8px", border: "1px solid #f3e8ff" }}>
                  {detailTmpl.keys.map(k => (
                    <span
                      key={k}
                      onClick={() => handleCopyKey(k)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #d8b4fe",
                        color: "#6b21a8",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem"
                      }}
                      title="ថតចម្លង {{key}}"
                    >
                      {copiedKey === k ? <LuCheck size={13} style={{ color: "#16a34a" }} /> : <LuCopy size={12} style={{ color: "#9333ea" }} />}
                      {`{{${k}}}`}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>គ្មានសោរទិន្នន័យ</div>
              )}
            </div>

            {/* Live Document Preview Editor */}
            <div>
              <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#334155", marginBottom: "0.5rem" }}>
                ទិដ្ឋភាពមើលជាមុននៃឯកសារគំរូ (Document Content Preview):
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", minHeight: "360px" }}>
                <TextEditor
                  value={detailTmpl.content || `<div style="padding:1.5rem; text-align:center; color:#64748b;">
                    <h3 style="color:#1e293b;">${detailTmpl.name}</h3>
                    <p style="margin-top:1rem;">ឯកសារគំរូ Microsoft Word (.docx) ត្រូវបានរក្សាទុកនៅលើប្រព័ន្ធ។</p>
                    <p style="color:#6366f1; font-weight:600;">សោរទិន្នន័យ៖ ${(detailTmpl.keys || []).map(k => `{{${k}}}`).join(" ")}</p>
                  </div>`}
                  readOnly={true}
                  placeholder="កំពុងមើលឯកសារគំរូ..."
                />
              </div>
            </div>

            {/* Quick Action Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetail(false)}>
                បិទទំព័រ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/reports/create-template")}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "linear-gradient(135deg, #185abd 0%, #0f4c81 100%)" }}
              >
                🚀 បង្កើតរបាយការណ៍ចេញពីគំរូនេះ (Create Report from Template)
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!keyTarget} onClose={() => { setKeyTarget(null); setKeyName(""); setKeyLabel(""); }} title="គ្រប់គ្រង & បន្ថែមសោរទិន្នន័យ (Manage Information Keys Table)">
        <form onSubmit={(e) => { e.preventDefault(); handleAddKey(); }} className="template-form">
          {/* Dynamic Table for Existing Keys */}
          {keyTarget?.keys?.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ marginBottom: "0.5rem", display: "block", fontWeight: "600", fontSize: "0.88rem", color: "#334155" }}>
                តារាងសោរទិន្នន័យដែលមានស្រាប់ (Existing Template Keys Table)
              </label>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", maxHeight: "240px", overflowY: "auto" }}>
                <table className="table" style={{ margin: 0, fontSize: "0.82rem" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ width: "35px", textAlign: "center" }}>#</th>
                      <th>សោរក្នុងឯកសារ (Key Tag)</th>
                      <th>ឈ្មោះបង្ហាញជូនអ្នកប្រើប្រាស់ (Display Label)</th>
                      <th style={{ width: "60px", textAlign: "center" }}>ថតចម្លង</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyTarget.keys.map((item, idx) => {
                      const { key, label } = parseKeyItem(item);
                      return (
                        <tr key={key}>
                          <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: "600" }}>{idx + 1}</td>
                          <td>
                            <code style={{ background: "#e0e7ff", color: "#4338ca", padding: "0.2rem 0.5rem", borderRadius: "5px", fontWeight: "600" }}>
                              {`{{${key}}}`}
                            </code>
                          </td>
                          <td style={{ fontWeight: "600", color: "#1e293b" }}>{label}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleCopyKey(key)}
                              title="ថតចម្លង {{key}}"
                              style={{ padding: "0.2rem 0.4rem" }}
                            >
                              {copiedKey === key ? <LuCheck size={12} style={{ color: "#16a34a" }} /> : <LuCopy size={12} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  ១. សោរក្នុងឯកសារ (Key Tag Placeholder) *
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="ឧ. report_title, author_name"
                  autoFocus
                  required
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  ២. ឈ្មោះបង្ហាញជូនអ្នកប្រើប្រាស់ (Display Label)
                </label>
                <input
                  type="text"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  placeholder="ឧ. ចំណងជើងរបាយការណ៍"
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.35rem" }}>
                <LuZap size={13} style={{ color: "#eab308" }} /> ចុចជ្រើសរើសសោរគំរូស្វ័យប្រវត្តិ (Quick Presets):
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {[
                  { k: "title", l: "ចំណងជើងរបាយការណ៍ (Report Title)" },
                  { k: "author", l: "អ្នករៀបចំ (Author)" },
                  { k: "date", l: "កាលបរិច្ឆេទ (Date)" },
                  { k: "organization", l: "អង្គភាព / ស្ថាប័ន (Organization)" },
                  { k: "department", l: "នាយកដ្ឋាន / ការិយាល័យ (Department)" },
                  { k: "summary", l: "សេចក្តីសង្ខេប (Summary)" },
                  { k: "table_data", l: "ទិន្នន័យតារាង (Dynamic Table Data)" }
                ].map((preset) => (
                  <button
                    key={preset.k}
                    type="button"
                    onClick={() => {
                      setKeyName(preset.k);
                      setKeyLabel(preset.l);
                    }}
                    style={{
                      background: "#e0e7ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "5px",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      color: "#4338ca",
                      fontWeight: "600"
                    }}
                    title={`បញ្ចូល ${preset.k} និងឈ្មោះបង្ហាញ`}
                  >
                    + {preset.k}
                  </button>
                ))}
              </div>
            </div>

            <small style={{ color: "#64748b", fontSize: "0.78rem", background: "#eff6ff", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
              💡 បញ្ចូល <code>{`{{key_name}}`}</code> នៅក្នុងឯកសារ Word (.docx) ឬ HTML របស់អ្នកដើម្បីឲ្យប្រព័ន្ធជំនួសទិន្នន័យស្វ័យប្រវត្តិ។
            </small>

            <div className="template-form-actions" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setKeyTarget(null); setKeyName(""); setKeyLabel(""); }}>បោះបង់</button>
              <button type="submit" className="btn btn-primary" disabled={addingKey || !keyName.trim()}>
                {addingKey ? "កំពុងបន្ថែម..." : "+ បន្ថែមសោរ (Add Key)"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingTmpl ? "កែប្រែគំរូ" : "បន្ថែមគំរូថ្មី"}>
        <form onSubmit={handleUpload} className="template-form">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div>
              <label>ឈ្មោះគំរូ</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="ឧ. របាយការណ៍ប្រចាំខែ" required />
            </div>
            <div>
              <label>ការពិពណ៌នា</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="(ជម្រើស)" />
            </div>
            <div>
              <label>ប្រភេទ</label>
              <select value={formFormat} onChange={(e) => { setFormFormat(e.target.value); setFormFile(null); setFormContent(""); }}>
                <option value="docx">DOCX</option>
                <option value="html">HTML</option>
              </select>
            </div>
            {formFormat === "docx" ? (
              <div>
                <label>ឯកសារ .docx</label>
                <input type="file" accept=".docx" onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
                {editingTmpl && <small style={{ color: "#64748b" }}>ទុកទទេ បើមិនចង់ប្តូរឯកសារ</small>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontWeight: "600", fontSize: "0.88rem", color: "#334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>មាតិកាគំរូ HTML (Template Content & Editor)</span>
                  <small style={{ color: "#6366f1" }}>💡 បញ្ចូលសោរទិន្នន័យ {`{{key}}`} ក្នុងឯកសារ</small>
                </label>

                {/* Key Insertion Bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "#475569", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <LuPlus size={13} style={{ color: "#6366f1" }} /> ចុចបន្ថែមសោរ (Insert Key):
                  </span>
                  {["title", "author", "date", "organization", "department", "summary", "table_data"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const tag = `{{${key}}}`;
                        setFormContent((prev) => (prev ? prev + " " + tag : tag));
                      }}
                      style={{
                        background: "#e0e7ff",
                        color: "#4338ca",
                        border: "1px solid #c7d2fe",
                        borderRadius: "5px",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "all 0.15s ease"
                      }}
                      title={`ចុចដើម្បីបញ្ចូល {{${key}}} ទៅក្នុងឯកសារ`}
                    >
                      + {`{{${key}}}`}
                    </button>
                  ))}
                </div>

                {/* MS Word Text Editor Container */}
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", minHeight: "420px" }}>
                  <TextEditor
                    value={formContent || `<p>បញ្ចូលមាតិកាគំរូ <strong>{{title}}</strong> ទីនេះ...</p>`}
                    onChange={(html) => setFormContent(html)}
                    placeholder="បញ្ចូលមាតិកាគំរូរបាយការណ៍..."
                  />
                </div>
              </div>
            )}
            <div className="template-form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>បោះបង់</button>
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
