import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
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
  LuCheck,
  LuRefreshCw,
  LuSearch,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { reportDocumentsAPI } from "../api/reportDocuments";
import { reportSummaryLabel } from "../utils/reportForm";
import ReportHero from "./reports/ReportHero";
import Modal from "../pages/settings/Modal";
import { useZoneCascade } from "../hooks/useZoneCascade";
import ZoneCascadeSelect from "./ZoneCascadeSelect";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("km-KH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const REPORT_CATEGORIES = [
  { value: "", label: "ទាំងអស់" },
  { value: "សន្តិសុខ", label: "សន្តិសុខ" },
  { value: "សេដ្ឋកិច្ច", label: "សេដ្ឋកិច្ច" },
  { value: "សង្គមកិច្ច", label: "សង្គមកិច្ច" },
  { value: "ហិរញ្ញវត្ថុ", label: "ហិរញ្ញវត្ថុ" },
  { value: "រដ្ឋបាល", label: "រដ្ឋបាល" },
  { value: "ផ្សេងៗ", label: "ផ្សេងៗ" },
];

const CATEGORY_COLORS = {
  "សន្តិសុខ": "#dc2626",
  "សេដ្ឋកិច្ច": "#2563eb",
  "សង្គមកិច្ច": "#7c3aed",
  "ហិរញ្ញវត្ថុ": "#059669",
  "រដ្ឋបាល": "#d97706",
  "ផ្សេងៗ": "#6b7280",
};

export default function ReportList({ onView, onEdit, onCreate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateDescription, setDuplicateDescription] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showTrash, setShowTrash] = useState(false);

  const zoneHook = useZoneCascade({
    userZone: user?.zone_code || "",
    isAdmin: user?.role === "admin" || user?.role === "super_admin",
    initialZoneCode: user?.zone_code || "",
    showVillage: false,
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (searchTerm) params.search = searchTerm;
      if (showTrash) params.trash = "true";
      const selectedZoneCode = zoneHook.resolvedZone?.zone_code;
      if (selectedZoneCode) {
        params.zone_code = selectedZoneCode;
      }
      const res = await reportDocumentsAPI.getAll(params);
      const data = res.data?.data ?? res.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm, showTrash, zoneHook.resolvedZone?.zone_code]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const stats = useMemo(() => {
    const total = records.length;
    const published = records.filter((r) => r.status === "published").length;
    const draft = total - published;
    const categoryCounts = {};
    records.forEach((r) => {
      const cat = r.category || "ផ្សេងៗ";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    return { total, published, draft, categoryCounts };
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

  const handleConfirm = async (record) => {
    setMessage("");
    try {
      await reportDocumentsAPI.confirmStatus(record.id);
      setMessage("បានបញ្ជាក់របាយការណ៍ដោយជោគជ័យ");
      fetchRecords();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("បញ្ជាក់របាយការណ៍មិនបាន");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await reportDocumentsAPI.delete(deleteTarget.id);
      setMessage(showTrash ? "លុបដោយជោគជ័យ" : "បានផ្លាស់ទីទៅធុងសំរាម");
      setDeleteTarget(null);
      fetchRecords();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("លុបមិនបាន");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (record) => {
    setMessage("");
    try {
      await reportDocumentsAPI.restore(record.id);
      setMessage("បានស្តារឡើងវិញ");
      fetchRecords();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("ស្តារឡើងវិញមិនបាន");
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
            <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
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

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>សរុប</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>{stats.total}</span>
          </div>

          <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.85rem", color: "#166534", marginBottom: "0.25rem" }}>បានចេញ</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#166534" }}>{stats.published}</span>
          </div>

          <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.85rem", color: "#92400e", marginBottom: "0.25rem" }}>ព្រាង</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#92400e" }}>{stats.draft}</span>
          </div>

          {Object.entries(stats.categoryCounts || {}).map(([cat, count]) => (
            <Fragment key={cat}>
              <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{cat}</span>
                <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>{count}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="report-filter-bar" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
          <ZoneCascadeSelect hook={zoneHook} showVillage={false} />
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            {loading ? (
              <div className="modal-loading-spinner" style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                borderWidth: "2px",
                pointerEvents: "none"
              }} />
            ) : (
              <LuSearch
                style={{
                  position: "absolute",
                  left: "0.875rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "1.1rem",
                  pointerEvents: "none"
                }}
              />
            )}
            <input
              type="text"
              placeholder="ស្វែងរក..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                minHeight: "2.5rem",
                padding: "0.625rem 0.875rem 0.625rem 2.25rem",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                fontSize: "0.9rem",
                color: "var(--text)",
                backgroundColor: "var(--surface)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                outline: "none",
                transition: "border-color var(--transition), box-shadow var(--transition)"
              }}
            />
          </div>

          <div style={{ position: "relative", minWidth: "160px" }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-select"
              style={{
                width: "100%",
                paddingRight: "2.5rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                minHeight: "2.5rem",
                fontSize: "0.9rem",
                color: "var(--text)",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)"
              }}
            >
              {REPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`btn ${showTrash ? "btn-secondary" : "btn-outline"}`}
            onClick={() => setShowTrash((prev) => !prev)}
            style={{
              minHeight: "2.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              borderRadius: "10px",
              padding: "0.625rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: "500",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)"
            }}
          >
            <LuTrash2 size={16} />
            {showTrash ? "របាយការណ៍" : "ធុងសំរាម"}
          </button>
        </div>
      </div>

      <div className="card report-list-card">
        <div className="table-responsive">
          <table className="table report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>របាយការណ៍</th>
                <th>ប្រភេទ</th>
                <th>តំបន់</th>
                <th>ស្ថានភាព</th>
                <th>កែប្រែចុងក្រោយ</th>
                <th>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
              {records.length === 0 && loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td><div className="skeleton-item" style={{ width: "24px" }} /></td>
                    <td><div className="skeleton-item" style={{ width: "100%", maxWidth: "320px" }} /></td>
                    <td><div className="skeleton-item" style={{ width: "64px" }} /></td>
                    <td><div className="skeleton-item" style={{ width: "80px" }} /></td>
                    <td><div className="skeleton-item" style={{ width: "70px" }} /></td>
                    <td><div className="skeleton-item" style={{ width: "90px" }} /></td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <div className="skeleton-item" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
                        <div className="skeleton-item" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
                        <div className="skeleton-item" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="report-empty" style={{ margin: 0, padding: 0, border: "none", background: "none", boxShadow: "none" }}>
                      <LuScrollText className="report-empty-icon" />
                      <h3>{showTrash ? "គ្មានរបាយការណ៍ក្នុងធុងសំរាម" : "គ្មានរបាយការណ៍"}</h3>
                      <p>{showTrash ? "" : "ចុច «បង្កើតរបាយការណ៍» ដើម្បីចាប់ផ្តើម — បំពេញចំណងជើង ការពិពណ៌នា និងខ្លឹមសារ"}</p>
                      {!showTrash && (
                        <button type="button" className="btn btn-primary" style={{ marginTop: "0.75rem", marginInline: "auto" }} onClick={() => setShowCreateModal(true)}>
                          <LuPlus /> បង្កើតរបាយការណ៍
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.id} style={r.deleted_at ? { opacity: 0.6 } : undefined}>
                    <td>{idx + 1}</td>
                    <td
                      className="report-table-title"
                      style={{ cursor: "pointer", color: "var(--primary)", fontWeight: "500" }}
                      onClick={() => onView(r.id)}
                    >
                      {reportSummaryLabel(r)}
                    </td>
                    <td>
                      {r.category && (
                        <span
                          style={{ color: CATEGORY_COLORS[r.category] || "#6b7280", fontWeight: "600", fontSize: "0.85rem" }}
                        >
                          {r.category}
                        </span>
                      )}
                    </td>
                    <td>{r.zone_name || "—"}</td>
                    <td>
                      <span className="report-status-badge report-status-badge-sm" data-status={r.status}>
                        {r.status === "published" ? "បានចេញ"
                          : r.status === "pending_review" ? "កំពុងពិនិត្យ"
                            : r.status === "rejected" ? "បានបដិសេធ"
                              : r.deleted_at ? "បានលុប"
                                : "ព្រាង"}
                      </span>
                    </td>
                    <td>{formatDate(r.updated_at)}</td>
                    <td>
                      <div className="actions">
                        {showTrash ? (
                          <button type="button" className="btn-icon btn-success" onClick={() => handleRestore(r)} title="ស្តារឡើងវិញ">
                            <LuRefreshCw />
                          </button>
                        ) : (
                          <>
                            <button type="button" className="btn-icon" onClick={() => onView(r.id)} title="មើល">
                              <LuEye />
                            </button>
                            {(r.status === "draft" || r.status === "rejected") && (
                              <button type="button" className="btn-icon" onClick={() => onEdit(r.id)} title="កែប្រែ">
                                <LuPencil />
                              </button>
                            )}
                            {r.status === "pending_review" && (user?.role === "district_chief" || user?.role === "commune_chief" || user?.role === "admin" || user?.role === "super_admin") && (
                              <button type="button" className="btn-icon" onClick={() => handleConfirm(r)} title="អនុម័ត">
                                <LuCheck />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleDownload(r)}
                              disabled={downloadTarget?.id === r.id}
                              title="ទាញយក PDF"
                            >
                              <LuDownload />
                            </button>
                            {(r.status === "draft" || r.status === "rejected") && (
                              <>
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
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="បង្កើតរបាយការណ៍">
        <div className="report-create-options report-create-options-row">
          <button type="button" className="report-create-option" onClick={() => { setShowCreateModal(false); navigate("/reports/create-template"); }}>
            <span className="report-create-option-icon"><LuFileText /></span>
            <span className="report-create-option-label">បង្កើតជាមួយគំរូ</span>
            <span className="report-create-option-desc">ជ្រើសរើសគំរូដែលត្រៀតរួចជាស្រេច</span>
          </button>
          <button type="button" className="report-create-option" onClick={() => { setShowCreateModal(false); onCreate(); }}>
            <span className="report-create-option-icon"><LuPlus /></span>
            <span className="report-create-option-label">បង្កើតរបាយការណ៍</span>
            <span className="report-create-option-desc">ចាប់ផ្តើមពីទទេ</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
