import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuFileText, LuDownload, LuTrash2, LuPlus, LuEye, LuPencil, LuKeyRound } from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import Modal from "./Modal";

export default function SettingsReportTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
  const [addingKey, setAddingKey] = useState(false);

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
      await reportTemplatesAPI.addKey(keyTarget.id, keyName.trim());
      setMessage(`បានបន្ថែមសោ «${keyName.trim()}»`);
      setKeyTarget(null);
      setKeyName("");
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
                <th>ឈ្មោះ</th>
                <th>ប្រភេទ</th>
                <th>ទំហំ</th>
                <th>កាលបរិច្ឆេទ</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="template-name">{t.name}</td>
                  <td><span className={`badge-${t.format}`}>{t.format.toUpperCase()}</span></td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.file_size ? formatSize(t.file_size) : "—"}</td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.created_at ? new Date(t.created_at).toLocaleDateString("km-KH") : "—"}</td>
                    <td>
                      <div className="template-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => { setDetailTmpl(t); setShowDetail(true); }} title="មើលព័ត៌មាន">
                          <LuEye />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)} title="កែប្រែ">
                          <LuPencil />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setKeyTarget(t); setKeyName(""); }} title="បន្ថែមសោ">
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

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="ព័ត៌មានគំរូ">
        {detailTmpl && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div><strong>ឈ្មោះ:</strong><br/>{detailTmpl.name}</div>
            <div><strong>ការពិពណ៌នា:</strong><br/>{detailTmpl.description || "—"}</div>
            <div><strong>ប្រភេទ:</strong><br/>{detailTmpl.format}</div>
            <div><strong>ឈ្មោះឯកសារ:</strong><br/>{detailTmpl.file_name || "—"}</div>
            <div><strong>ទំហំ:</strong><br/>{detailTmpl.file_size ? formatSize(detailTmpl.file_size) : "—"}</div>
            <div><strong>Storage Key:</strong><br/><code style={{ wordBreak: "break-all", fontSize: "0.8rem", background: "#f1f5f9", padding: "0.25rem 0.5rem", borderRadius: 4 }}>{detailTmpl.storage_path || "—"}</code></div>
            <div><strong>សោរក្នុងឯកសារ (Keys):</strong><br/>
              {detailTmpl.keys && detailTmpl.keys.length > 0
                ? <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.3rem" }}>
                    {detailTmpl.keys.map(k => <code key={k} style={{ background: "#e0e7ff", color: "#4338ca", padding: "0.15rem 0.5rem", borderRadius: 4, fontSize: "0.8rem" }}>{`{{${k}}}`}</code>)}
                  </div>
                : "—"}
            </div>
            <div><strong>បង្កើតនៅ:</strong><br/>{detailTmpl.created_at ? new Date(detailTmpl.created_at).toLocaleString("km-KH") : "—"}</div>
          </div>
        )}
      </Modal>

      <Modal open={!!keyTarget} onClose={() => { setKeyTarget(null); setKeyName(""); }} title="Add Key">
        <form onSubmit={(e) => { e.preventDefault(); handleAddKey(); }} className="template-form">
          {keyTarget?.keys?.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ marginBottom: "0.5rem", display: "block" }}>Existing keys</label>
              <table className="table" style={{ width: "100%", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: "2rem" }}>#</th>
                    <th>Key</th>
                  </tr>
                </thead>
                <tbody>
                  {keyTarget.keys.map((k, i) => (
                    <tr key={k}>
                      <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                      <td><code style={{ background: "#e0e7ff", color: "#4338ca", padding: "0.15rem 0.5rem", borderRadius: 4, fontSize: "0.8rem" }}>{`{{${k}}}`}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label>New key name</label>
              <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. member_name" autoFocus required />
            </div>
            <small style={{ color: "#64748b" }}>Adding to template «{keyTarget?.name}»</small>
            <div className="template-form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setKeyTarget(null); setKeyName(""); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={addingKey || !keyName.trim()}>
                {addingKey ? "Adding..." : "Add"}
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
              <div>
                <label>មាតិកា HTML</label>
                <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="<html>..." required={!formContent} />
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
