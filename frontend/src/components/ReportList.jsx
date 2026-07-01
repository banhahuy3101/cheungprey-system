import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuX, LuDownload, LuFileText } from "react-icons/lu";
import { reportDocumentsAPI } from "../api/reportDocuments";
import { reportSummaryLabel } from "../utils/reportForm";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReportList({ onView, onEdit, onCreate, onTemplates }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);

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

  const handleDownload = async (record) => {
    setDownloadTarget(record);
    setMessage("");
    try {
      await reportDocumentsAPI.downloadPDF(record.id);
    } catch {
      setMessage("ទាញយក PDF មិនបាន");
    } finally {
      setDownloadTarget(null);
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
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">បញ្ជីរបាយការណ៍</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={onTemplates}>
            <LuFileText /> គំរូ HTML
          </button>
          <button className="btn btn-primary" onClick={onCreate}>
            <LuPlus /> បង្កើតថ្មី
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>របាយការណ៍</th>
                <th>លេខយោង</th>
                <th>ស្ថានភាព</th>
                <th>កែប្រែចុងក្រោយ</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    គ្មានទិន្នន័យ — ចុច "បង្កើតថ្មី" ដើម្បីបន្ថែម
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>{reportSummaryLabel(r)}</td>
                    <td>{r.document_reference_number || "—"}</td>
                    <td>{r.status === "published" ? "បានចេញ" : "ព្រាង"}</td>
                    <td>{formatDate(r.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn-icon" onClick={() => onView(r.id)} title="មើល">
                          <LuEye />
                        </button>
                        <button className="btn-icon" onClick={() => onEdit(r.id)} title="កែប្រែ">
                          <LuPencil />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDownload(r)}
                          disabled={!!downloadTarget}
                          title="ទាញយក PDF"
                        >
                          <LuDownload />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => setDeleteTarget(r)}
                          title="លុប"
                        >
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
      )}

      {downloadTarget && (
        <div className="modal-overlay modal-overlay-top">
          <div className="modal modal-loading" onClick={(e) => e.stopPropagation()}>
            <div className="modal-loading-spinner" aria-hidden="true" />
            <p className="modal-loading-title">កំពុងទាញយក PDF...</p>
            <p className="modal-loading-detail">{reportSummaryLabel(downloadTarget)}</p>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay modal-overlay-top" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>លុបរបាយការណ៍</h3>
              <button className="btn-icon" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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
