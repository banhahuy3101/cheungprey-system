import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuFileText, LuDownload, LuTrash2, LuPlus, LuEye, LuPencil, LuCopy, LuCheck } from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import Modal from "./Modal";
import TextEditor from "../../components/TextEditor";

export default function SettingsReportTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const [detailTmpl, setDetailTmpl] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

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
    navigate(`/settings/report-templates/${tmpl.id}/edit`);
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

  return (
    <div className="page template-page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")}><LuArrowLeft /></button>
          <h2 className="section-title" style={{ margin: 0 }}>គ្រប់គ្រងគំរូរបាយការណ៍</h2>
        </div>
        <button type="button" className="btn btn-primary template-upload-btn" onClick={() => navigate("/settings/report-templates/new")}>
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
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.file_size ? formatSize(t.file_size) : "—"}</td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.created_at ? new Date(t.created_at).toLocaleDateString("km-KH") : "—"}</td>
                  <td>
                    <div className="template-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/settings/report-templates/${t.id}`)} title="ទៅកាន់ទំព័រព័ត៌មានលម្អិត">
                        <LuEye />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)} title="កែប្រែ">
                        <LuPencil />
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
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
