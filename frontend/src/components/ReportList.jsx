import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LuPlus,
  LuEye,
  LuPencil,
  LuTrash2,
  LuX,
  LuDownload,
  LuFileText,
  LuScrollText,
  LuCopy,
} from "react-icons/lu";
import { reportDocumentsAPI } from "../api/reportDocuments";
import { reportSummaryLabel } from "../utils/reportForm";
import ReportHero from "./reports/ReportHero";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReportList({ onView, onEdit, onCreate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateDescription, setDuplicateDescription] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportDocumentsAPI.getAll();
      const data = res.data?.data ?? res.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const stats = useMemo(() => {
    const total = records.length;
    const published = records.filter((r) => r.status === "published").length;
    const draft = total - published;
    return { total, published, draft };
  }, [records]);

  const handleDownload = async (record) => {
    setDownloadTarget(record);
    setMessage("");
    try {
      await reportDocumentsAPI.downloadPDF(record.id, record.title);
    } catch (err) {
      setMessage(err?.message || "ទាញយក PDF មិនបាន");
    } finally {
      setDownloadTarget(null);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget || !duplicateTitle.trim()) return;
    setDuplicating(true);
    setMessage("");
    try {
      const res = await reportDocumentsAPI.getById(duplicateTarget.id);
      const original = res.data?.data ?? res.data;
      await reportDocumentsAPI.createSimple({
        title: duplicateTitle.trim(),
        description: duplicateDescription.trim(),
        content: original.content || "",
      });
      setMessage("ចម្លងរបាយការណ៍ដោយជោគជ័យ");
      setDuplicateTarget(null);
      setDuplicateTitle("");
      setDuplicateDescription("");
      fetchRecords();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("ចម្លងរបាយការណ៍មិនបាន");
    } finally {
      setDuplicating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await reportDocumentsAPI.delete(deleteTarget.id);
      setMessage("លុបដោយជោគជ័យ");
      setDeleteTarget(null);
      fetchRecords();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("លុបមិនបាន");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page report-page">
      <ReportHero
        variant="list"
        title="របាយការណ៍"
        subtitle="ប្រព័ន្ធគ្រប់គ្រងរបាយការណ៍"
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              <LuPlus /> បង្កើតរបាយការណ៍
            </button>
          </>
        }
      />

      {message && (
        <div className={`alert report-flash ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`}>
          {message}
        </div>
      )}

      {!loading && (
        <div className="report-kpi-grid">
          <div className="card report-kpi-card">
            <span className="report-kpi-label">សរុប</span>
            <span className="report-kpi-value">{stats.total}</span>
          </div>
          <div className="card report-kpi-card report-kpi-published">
            <span className="report-kpi-label">បានចេញ</span>
            <span className="report-kpi-value">{stats.published}</span>
          </div>
          <div className="card report-kpi-card report-kpi-draft">
            <span className="report-kpi-label">ព្រាង</span>
            <span className="report-kpi-value">{stats.draft}</span>
          </div>
        </div>
      )}

      <div className="card report-list-card">
        {loading ? (
          <div className="loading">កំពុងផ្ទុក...</div>
        ) : records.length === 0 ? (
          <div className="report-empty">
            <LuScrollText className="report-empty-icon" />
            <h3>គ្មានរបាយការណ៍</h3>
            <p>ចុច «បង្កើតរបាយការណ៍» ដើម្បីចាប់ផ្តើម — បំពេញចំណងជើង ការពិពណ៌នា និងខ្លឹមសារ</p>
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              <LuPlus /> បង្កើតរបាយការណ៍
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>របាយការណ៍</th>
                  <th>ស្ថានភាព</th>
                  <th>កែប្រែចុងក្រោយ</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td className="report-table-title">{reportSummaryLabel(r)}</td>
                    <td>
                      <span className="report-status-badge report-status-badge-sm" data-status={r.status}>
                        {r.status === "published" ? "បានចេញ" : "ព្រាង"}
                      </span>
                    </td>
                    <td>{formatDate(r.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn-icon" onClick={() => onView(r.id)} title="មើល">
                          <LuEye />
                        </button>
                        <button type="button" className="btn-icon" onClick={() => onEdit(r.id)} title="កែប្រែ">
                          <LuPencil />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDownload(r)}
                          disabled={downloadTarget?.id === r.id}
                          title="ទាញយក PDF"
                        >
                          <LuDownload />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => {
                            setDuplicateTarget(r);
                            setDuplicateTitle(r.title + " (ច្បាប់ចម្លង)");
                            setDuplicateDescription(r.description || "");
                          }}
                          title="ចម្លង"
                        >
                          <LuCopy />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          onClick={() => setDeleteTarget(r)}
                          title="លុប"
                        >
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
      </div>

      {downloadTarget && (
        <div className="modal-overlay modal-overlay-top">
          <div className="modal modal-loading" onClick={(e) => e.stopPropagation()}>
            <div className="modal-loading-spinner" aria-hidden="true" />
            <p className="modal-loading-title">កំពុងទាញយក PDF...</p>
            <p className="modal-loading-detail">{reportSummaryLabel(downloadTarget)}</p>
          </div>
        </div>
      )}

      {duplicateTarget && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !duplicating && setDuplicateTarget(null)}>
          <div className="modal modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ចម្លងរបាយការណ៍</h3>
              <button type="button" className="btn-icon" onClick={() => setDuplicateTarget(null)} disabled={duplicating}>
                <LuX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ចំណងជើង <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  placeholder="បញ្ចូលចំណងជើងថ្មី"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>ការពិពណ៌នា</label>
                <input
                  type="text"
                  className="form-control"
                  value={duplicateDescription}
                  onChange={(e) => setDuplicateDescription(e.target.value)}
                  placeholder="បញ្ចូលការពិពណ៌នា (ជម្រើស)"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDuplicateTarget(null)} disabled={duplicating}>
                បោះបង់
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDuplicate}
                disabled={duplicating || !duplicateTitle.trim()}
              >
                {duplicating ? "កំពុងចម្លង..." : "ចម្លង"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>លុបរបាយការណ៍</h3>
              <button type="button" className="btn-icon" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                <LuX />
              </button>
            </div>
            <div className="modal-body">
              <p className="reset-confirm-text">
                តើអ្នកពិតជាចង់លុប <strong>{reportSummaryLabel(deleteTarget)}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                បោះបង់
              </button>
              <button type="button" className="btn btn-primary btn-danger-solid" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "កំពុងលុប..." : "លុប"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
