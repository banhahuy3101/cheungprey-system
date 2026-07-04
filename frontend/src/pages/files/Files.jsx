import { useState, useEffect, useCallback, useRef } from "react";
import { LuPlus, LuTrash2, LuExternalLink, LuSearch, LuX } from "react-icons/lu";
import { partyAPI } from "../../api/party";
import { TWO_MINUTE_TIMEOUT } from "../../api/client";
import { readFileAsBase64, mimeTypeForFile, base64ToBlob, openBlobFile } from "../../utils/file";

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partyAPI.getFiles({ search, page, limit: 20 });
      const inner = res.data?.data || res.data;
      setFiles(inner.files || inner || []);
      setTotal(inner.total || 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    let cancelled = false;
    fetchFiles().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchFiles]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setSubmitting(true);
    try {
      const base64Data = await readFileAsBase64(file);
      await partyAPI.uploadFile({
        file_name: file.name,
        mime_type: mimeTypeForFile(file),
        base64_data: base64Data,
        description: description.trim() || undefined,
      });
      setShowUpload(false);
      setFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបឯកសារនេះឬ?")) return;
    try {
      await partyAPI.deleteFile(id);
      fetchFiles();
    } catch {
      //
    }
  };

  const handleOpenFile = async (fileRow) => {
    if (!fileRow?.id || openingId) return;
    setOpeningId(fileRow.id);
    setError("");
    try {
      const res = await partyAPI.getFileById(fileRow.id, { timeout: TWO_MINUTE_TIMEOUT });
      const inner = res.data?.data || res.data;
      const base64 = inner?.base64_content;
      if (!base64) {
        throw new Error("ឯកសារមិនមានទិន្នន័យ");
      }
      const mimeType = inner.mime_type || fileRow.mime_type || "application/octet-stream";
      const fileName = inner.file_name || fileRow.file_name || "file";
      openBlobFile(base64ToBlob(base64, mimeType), fileName, mimeType);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "បើកឯកសារមិនបាន");
    } finally {
      setOpeningId(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">ឯកសារ</h2>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <LuPlus /> បង្ហោះឯកសារ
        </button>
      </div>

      <div className="search-bar">
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកឯកសារ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && !showUpload && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ឈ្មោះឯកសារ</th>
                  <th>ការពិពណ៌នា</th>
                  <th>ទំហំ</th>
                  <th>ប្រភេទ</th>
                  <th>កាលបរិច្ឆេទ</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr><td colSpan={6} className="text-center">គ្មានទិន្នន័យ</td></tr>
                ) : (
                  files.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleOpenFile(f)}
                          disabled={openingId === f.id}
                          title="បើកឯកសារ"
                        >
                          {openingId === f.id ? "កំពុងបើក..." : (f.file_name || f.filename || "-")}
                        </button>
                      </td>
                      <td>{f.description || "-"}</td>
                      <td>{f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : "-"}</td>
                      <td>{f.mime_type || "-"}</td>
                      <td>{f.created_at?.slice(0, 10) || "-"}</td>
                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleOpenFile(f)}
                            disabled={openingId === f.id}
                            title="បើកឯកសារ"
                          >
                            <LuExternalLink />
                          </button>
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(f.id)} title="លុប">
                            <LuTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>មុន</button>
              <span>ទំព័រ {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>បន្ទាប់</button>
            </div>
          )}
        </>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>បង្ហោះឯកសារថ្មី</h3>
              <button className="btn-icon" onClick={() => setShowUpload(false)}><LuX /></button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label>ឯកសារ *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ការពិពណ៌នា</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="បរិយាយអំពីឯកសារ"
                  />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !file}>
                  {submitting ? "កំពុងបង្ហោះ..." : "បង្ហោះ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}