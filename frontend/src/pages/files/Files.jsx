import { useState, useEffect, useCallback, useRef } from "react";
import { LuPlus, LuTrash2, LuExternalLink, LuSearch, LuFileText } from "react-icons/lu";
import PageHeader from "../../components/PageHeader";
import { partyAPI } from "../../api/party";
import { TWO_MINUTE_TIMEOUT } from "../../api/client";
import { readFileAsBase64, mimeTypeForFile, base64ToBlob, openBlobFile } from "../../utils/file";
import Modal from "../settings/Modal";
import DataTable from "../../components/DataTable";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";

function getFileExtension(fileRow) {
  const name = fileRow.file_name || fileRow.filename || "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (ext && ext.length <= 4) return ext;

  const mime = fileRow.mime_type || "";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("word") || mime.includes("officedocument.wordprocessingml") || mime.includes("msword")) return "docx";
  if (mime.includes("excel") || mime.includes("officedocument.spreadsheetml") || mime.includes("ms-excel")) return "xlsx";
  if (mime.includes("powerpoint") || mime.includes("officedocument.presentationml")) return "pptx";
  if (mime.includes("csv")) return "csv";
  if (mime.includes("text") || mime.includes("plain")) return "txt";
  if (mime.includes("zip") || mime.includes("x-zip") || mime.includes("compressed")) return "zip";

  return mime ? mime.split("/").pop() : "-";
}

function getExtensionBadgeStyle(ext) {
  const cleanExt = ext.toLowerCase();
  switch (cleanExt) {
    case "pdf":
      return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fee2e2" };
    case "docx":
    case "doc":
      return { background: "#eff6ff", color: "#1e40af", border: "1px solid #dbeafe" };
    case "xlsx":
    case "xls":
    case "csv":
      return { background: "#f0fdf4", color: "#166534", border: "1px solid #dcfce7" };
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return { background: "#faf5ff", color: "#6b21a8", border: "1px solid #f3e8ff" };
    case "zip":
    case "rar":
      return { background: "#fffbeb", color: "#92400e", border: "1px solid #fef3c7" };
    default:
      return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
  }
}

export default function Files() {
  const { user } = useAuth();
  const canCreate = canAccess(user, FEATURES.files, "create");
  const canDelete = canAccess(user, FEATURES.files, "delete");
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
      setError(err.response?.data?.error || err.response?.data?.message || "បង្ហោះមិនបានសម្រេច");
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

  const columns = [
    {
      key: "file_name",
      label: "ឈ្មោះឯកសារ",
      render: (_, row) => (
        <button
          type="button"
          className="link-button"
          onClick={() => handleOpenFile(row)}
          disabled={openingId === row.id}
          title="បើកឯកសារ"
          style={{ fontWeight: "700", color: "#1d4ed8" }}
        >
          {openingId === row.id ? "កំពុងបើក..." : (row.file_name || row.filename || "-")}
        </button>
      ),
    },
    {
      key: "description",
      label: "ការពិពណ៌នា",
      render: (val) => <span style={{ color: "#475569" }}>{val || "—"}</span>,
    },
    {
      key: "file_size",
      label: "ទំហំ",
      render: (val) => <span style={{ color: "#64748b", fontWeight: "500" }}>{val ? `${(val / 1024).toFixed(1)} KB` : "—"}</span>,
    },
    {
      key: "mime_type",
      label: "ប្រភេទ",
      render: (_, row) => {
        const ext = getFileExtension(row);
        return (
          <span
            style={{
              padding: "0.2rem 0.55rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "0.05em",
              display: "inline-block",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              ...getExtensionBadgeStyle(ext)
            }}
          >
            {ext.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: "created_at",
      label: "កាលបរិច្ឆេទ",
      render: (val) => <span style={{ color: "#64748b" }}>{val?.slice(0, 10) || "—"}</span>,
    },
    {
      key: "actions",
      label: "សកម្មភាព",
      align: "right",
      width: "90px",
      render: (_, row) => (
        <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => handleOpenFile(row)}
            disabled={openingId === row.id}
            title="បើកមើលឯកសារ"
          >
            <LuExternalLink />
          </button>
          {canDelete && <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)} title="លុបឯកសារ"><LuTrash2 /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <PageHeader
        title="បណ្ណសារឯកសារ (Document Archive)"
        subtitle="គ្រប់គ្រង និងរក្សាទុកឯកសារផ្លូវការប្រព័ន្ធ"
        breadcrumbs={[
          { label: "បណ្ណសារឯកសារ" },
        ]}
        actions={
          canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => setShowUpload(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", padding: "0.55rem 1.1rem", fontWeight: "600" }}
            >
              <LuPlus size={18} /> បង្ហោះឯកសារ (Upload File)
            </button>
          )
        }
      />

      <div className="search-bar" style={{ marginBottom: "1.25rem" }}>
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកតាមឈ្មោះ ឬការពិពណ៌នាឯកសារ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && !showUpload && <div className="alert alert-error">{error}</div>}

      <DataTable
        columns={columns}
        data={files}
        loading={loading}
        emptyMessage="គ្មានទិន្នន័យឯកសារ"
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {canCreate && showUpload && (
        <Modal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          title="📁 បង្ហោះឯកសារថ្មី (Upload New File)"
        >
          <form onSubmit={handleUpload}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  ជ្រើសរើសឯកសារ / Select File <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="modern-form-input"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  ការពិពណ៌នា / Description
                </label>
                <input
                  type="text"
                  className="modern-form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="បញ្ចូលការពិពណ៌នាសង្ខេបអំពីឯកសារ..."
                  style={{ width: "100%" }}
                />
              </div>

              {error && <div className="alert alert-error" style={{ fontSize: "0.85rem" }}>{error}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                  បោះបង់
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !file}>
                  {submitting ? "កំពុងបង្ហោះ..." : "បង្ហោះឯកសារ"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
