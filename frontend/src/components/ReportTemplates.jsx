import { useState, useEffect, useCallback, useRef } from "react";
import { LuPlus, LuTrash2, LuX, LuArrowLeft } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { reportTemplatesAPI } from "../api/reportTemplates";
import { readFileAsBase64, mimeTypeForFile } from "../utils/file";
import { isDocxTemplate } from "../utils/reportTemplate";
import { useAuth } from "../hooks/useAuth";
import { canAccess, FEATURES } from "../utils/permissions";

export default function ReportTemplates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageTemplates = canAccess(user, FEATURES.report_templates);
  const fileRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, keysRes] = await Promise.all([
        reportTemplatesAPI.getAll(),
        reportTemplatesAPI.getKeys(),
      ]);
      setTemplates(tplRes.data?.data ?? tplRes.data ?? []);
      setKeys(keysRes.data?.data ?? keysRes.data ?? []);
    } catch {
      setError("ផ្ទុកគំរូមិនបាន");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("សូមជ្រើសរើសឯកសារ .html ឬ .docx");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const base64Data = await readFileAsBase64(file);
      await reportTemplatesAPI.upload({
        name: name.trim() || undefined,
        file_name: file.name,
        mime_type: mimeTypeForFile(file),
        base64_data: base64Data,
      });
      setMessage("បង្ហោះគំរូដោយជោគជ័យ");
      setName("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "បង្ហោះមិនបាន");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await reportTemplatesAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
      setMessage("លុបគំរូដោយជោគជ័យ");
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setError("លុបមិនបាន");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/reports")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">គំរូរបាយការណ៍ (HTML / Word)</h2>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {canManageTemplates && (
      <div className="card mb-1">
        <h3 className="report-section-heading">បង្ហោះគំរូ</h3>
        <p className="user-settings-help">
          បង្កើតឯកសារ <strong>HTML</strong> (<code>{"{{key}}"}</code>) ឬ <strong>Word .docx</strong> (<code>{"{key}"}</code>)
          រួចបង្ហោះខាងក្រោម។ HTML → PDF · Word → ឯកសារបំពេញ (.docx)
          <br />
          <strong>Word:</strong> វាយ <code>{"{party_name}"}</code> ជា plain text មួយដង — កុំ bold/format កណ្តាល key។
        </p>
        <form onSubmit={handleUpload} className="form-row" style={{ alignItems: "flex-end" }}>
          <div className="form-group">
            <label>ឈ្មោះគំរូ</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ឧ. របាយការណ៍ផ្លូវការ" />
          </div>
          <div className="form-group">
            <label>ឯកសារ HTML / Word *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,.docx,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            <LuPlus /> {uploading ? "កំពុងបង្ហោះ..." : "បង្ហោះ"}
          </button>
        </form>
      </div>
      )}

      <div className="card mb-1">
        <h3 className="report-section-heading">គ្រាប់ចុច (Keys) ដែលប្រើបាន</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>ពិពណ៌នា</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.key}>
                  <td><code>{k.key}</code></td>
                  <td>{k.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="report-section-heading">បញ្ជីគំរូ</h3>
        {loading ? (
          <div className="loading">កំពុងផ្ទុក...</div>
        ) : templates.length === 0 ? (
          <p className="text-center user-settings-help">គ្មានគំរូ — បង្ហោះឯកសារ HTML ដំបូង</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ឈ្មោះ</th>
                  <th>ប្រភេទ</th>
                  <th>ឯកសារ</th>
                  <th>កែប្រែចុងក្រោយ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t, i) => (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <td>{t.name}</td>
                    <td>{isDocxTemplate(t) ? "Word" : "HTML"}</td>
                    <td>{t.file_name}</td>
                    <td>{t.updated_at ? new Date(t.updated_at).toLocaleDateString("km-KH") : "—"}</td>
                    <td>
                      {canManageTemplates && (
                      <button className="btn-icon btn-danger" onClick={() => setDeleteTarget(t)} title="លុប">
                        <LuTrash2 />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay modal-overlay-top" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>លុបគំរូ</h3>
              <button className="btn-icon" onClick={() => setDeleteTarget(null)}><LuX /></button>
            </div>
            <div className="modal-body">
              <p>លុបគំរូ <strong>{deleteTarget.name}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>បោះបង់</button>
              <button className="btn btn-primary btn-danger-solid" onClick={confirmDelete}>លុប</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
