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
import Modal from "./Modal";
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
  table_data: "ទិន្នន័យតារាង (Dynamic Table Data)",
};

function getKeyDisplayLabel(k) {
  if (!k) return "";
  const lower = k.toLowerCase().trim();
  if (KEY_LABELS[lower]) return KEY_LABELS[lower];
  return k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFormat, setEditFormat] = useState("docx");
  const [editFile, setEditFile] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editing, setEditing] = useState(false);

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

    // Process all keys and format them with styled template badges
    const keys = template.keys || [];
    keys.forEach((k) => {
      const keyStr = typeof k === "object" ? k.key : String(k);
      const label = typeof k === "object" ? k.label : getKeyDisplayLabel(keyStr);
      const regex = new RegExp(`\\{\\{\\s*${keyStr}\\s*\\}\\}`, "gi");
      const badgeHtml = `<code style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.2rem 0.55rem; border-radius: 5px; font-weight: 600; font-family: monospace; display: inline-flex; align-items: center; gap: 0.25rem;" title="${label}">{{${keyStr}}}</code>`;
      html = html.replace(regex, badgeHtml);
    });

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

  const openEdit = () => {
    if (!template) return;
    setEditName(template.name);
    setEditDesc(template.description || "");
    setEditFormat(template.format);
    setEditFile(null);
    setEditContent(template.format === "html" ? template.content || "" : "");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName) return;
    if (editFormat === "docx" && !editFile) return;
    if (editFormat === "html" && !editContent) return;
    setEditing(true);
    try {
      const form = new FormData();
      form.append("name", editName);
      form.append("description", editDesc);
      form.append("format", editFormat);
      if (editFormat === "docx") {
        if (editFile) form.append("file", editFile);
      } else {
        form.append("content", editContent);
      }
      await reportTemplatesAPI.update(template.id, form);
      setMessage("បានកែប្រែគំរូ");
      setShowEditModal(false);
      const res = await reportTemplatesAPI.getById(id);
      const tmpl = res.data?.data || res.data;
      if (tmpl) setTemplate(tmpl);
    } catch (err) {
      setMessage(err?.response?.data?.error || "កែប្រែមិនបាន");
    } finally {
      setEditing(false);
    }
  };

  const resetEditForm = () => {
    setEditName("");
    setEditDesc("");
    setEditFormat("docx");
    setEditFile(null);
    setEditContent("");
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
            onClick={openEdit}
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

      {/* Main Content Layout Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Metadata Summary Grid Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 4px 15px -3px rgba(0,0,0,0.04)"
          }}
        >
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b", marginTop: 0, marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LuFileText style={{ color: "#185abd" }} /> ព័ត៌មានសង្ខេបនៃគំរូ (Template Metadata)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>ឈ្មោះគំរូ</span>
              <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>{template.name}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>ប្រភេទ / ទ្រង់ទ្រាយ</span>
              <div><span className={`badge-${template.format}`}>{template.format.toUpperCase()}</span></div>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>ទំហំឯកសារ</span>
              <div style={{ fontWeight: "600", color: "#334155" }}>{template.file_size ? formatSize(template.file_size) : "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>កាលបរិច្ឆេទបង្កើត</span>
              <div style={{ fontWeight: "600", color: "#334155" }}>{template.created_at ? new Date(template.created_at).toLocaleString("km-KH") : "—"}</div>
            </div>
          </div>

          {template.description && (
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", fontSize: "0.88rem", color: "#475569" }}>
              <strong>ការពិពណ៌នា៖</strong> {template.description}
            </div>
          )}
        </div>

        {/* Information Keys Interactive Cloud Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 4px 15px -3px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuZap style={{ color: "#6366f1" }} /> សោរព័ត៌មានដែលមានក្នុងឯកសារ (Information Keys)
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#6366f1", fontWeight: "500" }}>
              💡 ចុចលើសោរដើម្បីថតចម្លង (Click to copy)
            </span>
          </div>

          {template.keys && template.keys.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", background: "#f5f3ff", padding: "0.85rem", borderRadius: "10px", border: "1px solid #ddd6fe" }}>
              {template.keys.map((k) => (
                <span
                  key={k}
                  onClick={() => handleCopyKey(k)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #c4b5fd",
                    color: "#5b21b6",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease"
                  }}
                  title={`ថតចម្លង {{${k}}}`}
                >
                  {copiedKey === k ? <LuCheck size={13} style={{ color: "#16a34a" }} /> : <LuCopy size={12} style={{ color: "#7c3aed" }} />}
                  {`{{${k}}}`}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: "0.88rem" }}>គ្មានសោរទិន្នន័យត្រូវបានកំណត់ទេ</div>
          )}
        </div>

        {/* MS Word Interactive TextEditor Canvas Display Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "1.25rem",
            boxShadow: "0 4px 15px -3px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1e293b", margin: 0 }}>
              ទិដ្ឋភាពមើលជាមុននៃឯកសារ (Document Canvas Preview)
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              ទ្រង់ទ្រាយក្រដាស A4 Standard
            </span>
          </div>

          <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", minHeight: "500px" }}>
            <TextEditor
              value={formattedContent}
              readOnly={true}
              placeholder="កំពុងបង្ហាញឯកសារគំរូ..."
            />
          </div>
        </div>
      </div>

      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); resetEditForm(); }} title="កែប្រែគំរូ">
        <form onSubmit={handleEditSubmit} className="template-form">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div>
              <label>ឈ្មោះគំរូ</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="ឧ. របាយការណ៍ប្រចាំខែ" required />
            </div>
            <div>
              <label>ការពិពណ៌នា</label>
              <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="(ជម្រើស)" />
            </div>
            <div>
              <label>ប្រភេទ</label>
              <select value={editFormat} onChange={(e) => { setEditFormat(e.target.value); setEditFile(null); setEditContent(""); }}>
                <option value="docx">DOCX</option>
                <option value="html">HTML</option>
              </select>
            </div>
            {editFormat === "docx" ? (
              <div>
                <label>ឯកសារ .docx ថ្មី</label>
                <input type="file" accept=".docx" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
                <small style={{ color: "#64748b" }}>ទុកទទេ បើមិនចង់ប្តូរឯកសារ</small>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label>មាតិកាគំរូ HTML</label>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", minHeight: "420px" }}>
                  <TextEditor
                    value={editContent || ""}
                    onChange={(html) => setEditContent(html)}
                    placeholder="បញ្ចូលមាតិកាគំរូរបាយការណ៍..."
                  />
                </div>
              </div>
            )}
            <div className="template-form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); resetEditForm(); }}>បោះបង់</button>
              <button type="submit" className="btn btn-primary" disabled={editing}>
                {editing ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
