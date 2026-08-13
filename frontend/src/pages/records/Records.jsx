import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuFileText } from "react-icons/lu";
import { recordsAPI } from "../../api/records";
import Modal from "../settings/Modal";
import DataTable from "../../components/DataTable";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";

const initialForm = {
  title: "",
  description: "",
  category: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function Records() {
  const { user } = useAuth();
  const canCreate = canAccess(user, FEATURES.records, "create");
  const canUpdate = canAccess(user, FEATURES.records, "update");
  const canDelete = canAccess(user, FEATURES.records, "delete");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recordsAPI.getAll({ search, page, limit: 20 });
      const inner = res.data?.data || res.data;
      setRecords(inner.records || inner || []);
      setTotal(inner.total || 0);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    let cancelled = false;
    fetchRecords().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchRecords]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      title: record.title || "",
      description: record.description || "",
      category: record.category || "",
      date: record.date?.slice(0, 10) || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (editing) {
        await recordsAPI.update(editing.id, form);
      } else {
        await recordsAPI.create(form);
      }
      setShowModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || "ប្រតិបត្តិការបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះឬ?")) return;
    try {
      await recordsAPI.delete(id);
      fetchRecords();
    } catch {
      //
    }
  };

  const totalPages = Math.ceil(total / 20);

  const columns = [
    {
      key: "title",
      label: "ចំណងជើង",
      render: (val) => <span style={{ fontWeight: "700", color: "#0f172a" }}>{val}</span>,
    },
    {
      key: "category",
      label: "ប្រភេទ",
      render: (val) => (
        <span className="badge" style={{ background: "#eef2ff", color: "#4338ca", fontWeight: "600", border: "1px solid #c7d2fe" }}>
          {val || "-"}
        </span>
      ),
    },
    {
      key: "date",
      label: "កាលបរិច្ឆេទ",
      render: (val, row) => <span style={{ color: "#64748b" }}>{val?.slice(0, 10) || row.created_at?.slice(0, 10) || "-"}</span>,
    },
    {
      key: "description",
      label: "ការពិពណ៌នា",
      render: (val) => <span style={{ color: "#475569" }}>{val || "—"}</span>,
    },
    {
      key: "actions",
      label: "សកម្មភាព",
      align: "right",
      width: "90px",
      render: (_, row) => (
        <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
          {canUpdate && <button className="btn-icon" onClick={() => openEdit(row)} title="កែប្រែ"><LuPencil /></button>}
          {canDelete && <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)} title="លុប"><LuTrash2 /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LuFileText style={{ color: "var(--primary)" }} /> កំណត់ត្រា (Records)
          </h2>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            គ្រប់គ្រងកំណត់ត្រា និងកិច្ចការងារប្រព័ន្ធគ្រប់គ្រងស្រុកជើងព្រៃ
          </span>
        </div>
        {canCreate && <button
          className="btn btn-primary"
          onClick={openCreate}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "10px", padding: "0.6rem 1.2rem", fontWeight: "600" }}
        >
          <LuPlus size={18} /> បន្ថែមកំណត់ត្រា
        </button>}
      </div>

      <div className="search-bar" style={{ marginBottom: "1.25rem" }}>
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរក..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        emptyMessage="គ្មានទិន្នន័យកំណត់ត្រា"
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {showModal && (
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? "📝 កែប្រែកំណត់ត្រា" : "📝 បន្ថែមកំណត់ត្រាថ្មី"}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  ចំណងជើង / Title <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  name="title"
                  className="modern-form-input"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="បញ្ចូលចំណងជើងកំណត់ត្រា..."
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                    ប្រភេទ / Category
                  </label>
                  <input
                    name="category"
                    className="modern-form-input"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="ប្រភេទកំណត់ត្រា"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                    កាលបរិច្ឆេទ / Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    className="modern-form-input"
                    value={form.date}
                    onChange={handleChange}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "0.35rem", display: "block" }}>
                  ការពិពណ៌នា / Description
                </label>
                <textarea
                  name="description"
                  className="modern-form-input"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="បញ្ចូលការពិពណ៌នាលម្អិតអំពីកំណត់ត្រា..."
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              {error && <div className="alert alert-error" style={{ fontSize: "0.85rem" }}>{error}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  បោះបង់
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
