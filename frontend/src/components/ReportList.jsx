import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuPlus,
  LuEye,
  LuPencil,
  LuTrash2,
  LuX,
  LuDownload,
  LuFileText,
  LuCopy,
  LuCheck,
  LuRefreshCw,
  LuSearch,
} from "react-icons/lu";
import PageHeader from "./PageHeader";
import { useAuth } from "../hooks/useAuth";
import { canAccess, FEATURES } from "../utils/permissions";
import { useModules } from "../hooks/useModules";
import { reportDocumentsAPI } from "../api/reportDocuments";
import { reportSummaryLabel, REPORT_CATEGORIES } from "../utils/reportForm";
import DataTable from "./DataTable";
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

const CATEGORY_FILTERS = [
  { value: "", label: "ទាំងអស់" },
  ...REPORT_CATEGORIES.map((c) => ({ value: c, label: c })),
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = canAccess(user, FEATURES.reports, "create");
  const canUpdate = canAccess(user, FEATURES.reports, "update");
  const canDelete = canAccess(user, FEATURES.reports, "delete");
  const { needsApproval } = useModules();
  const isApprovalActive = needsApproval("reports");
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
  const [trashPopup, setTrashPopup] = useState(false);
  const [trashRecords, setTrashRecords] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const getZoneParams = () => {
    const code = user?.zone_code || "";
    if (code.length >= 6) {
      const districtCode = code.slice(0, 4);
      return {
        userZone: districtCode,
        initialZoneCode: districtCode,
      };
    }
    return {
      userZone: code,
      initialZoneCode: code,
    };
  };

  const { userZone, initialZoneCode } = getZoneParams();

  const zoneHook = useZoneCascade({
    userZone,
    isAdmin: canAccess(user, FEATURES.reports) || canAccess(user, FEATURES.users),
    initialZoneCode,
    showVillage: false,
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (searchTerm) params.search = searchTerm;
      const selectedZoneCode = zoneHook.resolvedZone;
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
  }, [categoryFilter, searchTerm, zoneHook.resolvedZone]);

  const fetchTrash = async () => {
    setTrashLoading(true);
    try {
      const params = { trash: "true" };
      const res = await reportDocumentsAPI.getAll(params);
      const data = res.data?.data ?? res.data ?? [];
      setTrashRecords(Array.isArray(data) ? data : []);
    } catch {
      setTrashRecords([]);
    } finally {
      setTrashLoading(false);
    }
  };

  const openTrashPopup = () => {
    setTrashPopup(true);
    fetchTrash();
  };

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

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "published") return r.status === "published";
      if (statusFilter === "draft") return r.status === "draft" || (!r.status && !r.deleted_at);
      return true;
    });
  }, [records, statusFilter]);

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
      if (deleteTarget.deleted_at) {
        await reportDocumentsAPI.permanentDelete(deleteTarget.id);
      } else {
        await reportDocumentsAPI.delete(deleteTarget.id);
      }
      setMessage(deleteTarget.deleted_at ? "លុបដោយជោគជ័យ" : "បានផ្លាស់ទីទៅធុងសំរាម");
      if (trashPopup) {
        setTrashRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
      } else {
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
      fetchRecords();
      if (trashPopup) fetchTrash();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("លុបមិនបាន");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreFromTrash = async (record) => {
    try {
      await reportDocumentsAPI.restore(record.id);
      setTrashRecords(prev => prev.filter(r => r.id !== record.id));
      setMessage("បានស្តារឡើងវិញ");
      fetchRecords();
      fetchTrash();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("ស្តារឡើងវិញមិនបាន");
    }
  };

  return (
    <div
      className="page"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <PageHeader
        title="របាយការណ៍"
        subtitle="ប្រព័ន្ធគ្រប់គ្រង និងតាមដានរបាយការណ៍"
        breadcrumbs={[
          { label: "របាយការណ៍" },
        ]}
        actions={
          <>
            {canDelete && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={openTrashPopup}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", minHeight: "2.1rem" }}
              >
                <LuTrash2 size={14} /> ធុងសំរាម
              </button>
            )}
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", minHeight: "2.1rem" }}
              >
                <LuPlus size={15} /> បង្កើតរបាយការណ៍
              </button>
            )}
          </>
        }
      />

      {message && (
        <div className={`alert report-flash ${message.includes("មិនបាន") ? "alert-error" : "alert-success"}`} style={{ margin: 0 }}>
          {message}
        </div>
      )}

      {/* Toolbar Filter & Tabs Row */}
      <div
        className="card"
        style={{
          padding: "0.75rem 1rem",
          margin: 0,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem"
        }}
      >
        {/* Left Side: Status tabs acting as filter & stats */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.2rem",
          background: "#f1f5f9",
          padding: "0.2rem",
          borderRadius: "8px",
          border: "1px solid var(--border)"
        }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: "600",
              border: "none",
              background: statusFilter === "all" ? "#ffffff" : "transparent",
              color: statusFilter === "all" ? "var(--primary)" : "#64748b",
              boxShadow: statusFilter === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            ទាំងអស់ ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("published")}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: "600",
              border: "none",
              background: statusFilter === "published" ? "#ffffff" : "transparent",
              color: statusFilter === "published" ? "#166534" : "#64748b",
              boxShadow: statusFilter === "published" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            បានចេញ ({stats.published})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("draft")}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: "600",
              border: "none",
              background: statusFilter === "draft" ? "#ffffff" : "transparent",
              color: statusFilter === "draft" ? "#92400e" : "#64748b",
              boxShadow: statusFilter === "draft" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            ព្រាង ({stats.draft})
          </button>
        </div>

        {/* Right Side: Inline Search, Category & Location selects */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", flex: 1, justifyContent: "flex-end" }}>
          {/* Search Input */}
          <div style={{ position: "relative", width: "180px" }}>
            <LuSearch
              style={{
                position: "absolute",
                left: "0.65rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                fontSize: "0.95rem",
                pointerEvents: "none"
              }}
            />
            <input
              type="text"
              placeholder="ស្វែងរក..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                minHeight: "2.1rem",
                height: "2.1rem",
                padding: "0.3rem 0.5rem 0.3rem 1.85rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "var(--text)",
                outline: "none"
              }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ position: "relative", width: "120px" }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                height: "2.1rem",
                minHeight: "2.1rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "0.85rem",
                padding: "0 1.5rem 0 0.5rem",
                cursor: "pointer"
              }}
            >
              {CATEGORY_FILTERS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Location selector */}
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <ZoneCascadeSelect hook={zoneHook} showVillage={false} compact={true} />
          </div>
        </div>
      </div>

      {/* Report DataTable */}
      <DataTable
        columns={[
          {
            key: "idx",
            label: "#",
            width: "40px",
            render: (_, __, i) => i + 1,
          },
          {
            key: "title",
            label: "របាយការណ៍",
            render: (_, r) => (
              <span
                style={{ cursor: "pointer", color: "var(--primary)", fontWeight: "600" }}
                onClick={() => onView(r.id)}
              >
                {reportSummaryLabel(r)}
              </span>
            ),
          },
          {
            key: "category",
            label: "ប្រភេទ",
            render: (val) => val ? (
              <span style={{ color: CATEGORY_COLORS[val] || "#6b7280", fontWeight: "600", fontSize: "0.85rem" }}>
                {val}
              </span>
            ) : "—",
          },
          {
            key: "zone_name",
            label: "តំបន់",
            render: (val) => val || "—",
          },
          {
            key: "status",
            label: "ស្ថានភាព",
            width: "100px",
            render: (val, r) => (
              <span className="report-status-badge report-status-badge-sm" data-status={val}>
                {val === "published" ? "បានចេញ"
                  : val === "pending_review" ? "កំពុងពិនិត្យ"
                    : val === "rejected" ? "បានបដិសេធ"
                      : r.deleted_at ? "បានលុប"
                        : "ព្រាង"}
              </span>
            ),
          },
          {
            key: "updated_at",
            label: "កែប្រែចុងក្រោយ",
            render: (val) => formatDate(val),
          },
          {
            key: "actions",
            label: "សកម្មភាព",
            align: "right",
            width: "140px",
            render: (_, r) => (
              <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem" }}>
                <button type="button" className="btn-icon" onClick={() => onView(r.id)} title="មើល">
                  <LuEye />
                </button>
                {canUpdate && (canAccess(user, FEATURES.reports, "update") || r.created_by === user?.id) && (
                  <button type="button" className="btn-icon" onClick={() => onEdit(r.id)} title="កែប្រែ">
                    <LuPencil />
                  </button>
                )}
                {r.status === "pending_review" && canAccess(user, FEATURES.reports, "update") && (
                  <button type="button" className="btn-icon" onClick={() => handleConfirm(r)} title="អនុម័ត">
                    <LuCheck />
                  </button>
                )}
                {canCreate && <button
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
                </button>}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => handleDownload(r)}
                  disabled={downloadTarget?.id === r.id}
                  title="ទាញយក PDF"
                >
                  <LuDownload />
                </button>
                {canDelete && <button
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={() => setDeleteTarget(r)}
                  title="លុប"
                >
                  <LuTrash2 />
                </button>}
              </div>
            ),
          },
        ]}
        data={filteredRecords}
        loading={loading}
        emptyMessage="គ្មានទិន្នន័យរបាយការណ៍"
      />

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
        <div className="modal-overlay modal-overlay-top" style={trashPopup ? { zIndex: 1100 } : {}} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal modal-confirm" style={trashPopup ? { zIndex: 1101 } : {}} onClick={(e) => e.stopPropagation()}>
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

      {trashPopup && (
        <div className="modal-overlay modal-overlay-top" onClick={() => setTrashPopup(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ width: "90vw", maxWidth: "1200px", maxHeight: "85vh", overflow: "auto" }}>
            <div className="modal-header">
              <h3><LuTrash2 size={18} /> ធុងសំរាម</h3>
              <button type="button" className="btn-icon" onClick={() => setTrashPopup(false)}><LuX /></button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="table report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>របាយការណ៍</th>
                      <th>ប្រភេទ</th>
                      <th>តំបន់</th>
                      <th>កាលបរិច្ឆេទលុប</th>
                      <th>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`ts-${i}`}>
                          <td><div className="skeleton-item" style={{ width: "24px" }} /></td>
                          <td><div className="skeleton-item" style={{ width: "200px" }} /></td>
                          <td><div className="skeleton-item" style={{ width: "64px" }} /></td>
                          <td><div className="skeleton-item" style={{ width: "80px" }} /></td>
                          <td><div className="skeleton-item" style={{ width: "100px" }} /></td>
                          <td><div className="skeleton-item" style={{ width: "60px" }} /></td>
                        </tr>
                      ))
                    ) : trashRecords.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>គ្មានរបាយការណ៍ក្នុងធុងសំរាម</td></tr>
                    ) : (
                      trashRecords.map((r, idx) => (
                        <tr key={r.id} style={{ opacity: 0.7 }}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: "500" }}>{reportSummaryLabel(r)}</td>
                          <td>
                            {r.category && <span style={{ color: CATEGORY_COLORS[r.category] || "#6b7280", fontWeight: "600", fontSize: "0.85rem" }}>{r.category}</span>}
                          </td>
                          <td>{r.zone_name || "—"}</td>
                          <td>{formatDate(r.deleted_at || r.updated_at)}</td>
                          <td>
                            <div className="actions" style={{ gap: "0.35rem" }}>
                              <button type="button" className="btn-icon btn-success" onClick={() => handleRestoreFromTrash(r)} title="ស្តារឡើងវិញ">
                                <LuRefreshCw />
                              </button>
                              <button type="button" className="btn-icon btn-danger" onClick={() => setDeleteTarget(r)} title="លុបជាអចិន្ត្រៃយ៍">
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
