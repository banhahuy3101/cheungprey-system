import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuX } from "react-icons/lu";
import { recordsAPI } from "../../api/records";

const initialForm = {
  title: "",
  description: "",
  category: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function Records() {
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
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបឬ?")) return;
    try {
      await recordsAPI.delete(id);
      fetchRecords();
    } catch {
      //
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="section-title">កំណត់ត្រា</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <LuPlus /> បន្ថែមកំណត់ត្រា
        </button>
      </div>

      <div className="search-bar">
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរក..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ចំណងជើង</th>
                  <th>ប្រភេទ</th>
                  <th>កាលបរិច្ឆេទ</th>
                  <th>ការពិពណ៌នា</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={5} className="text-center">គ្មានទិន្នន័យ</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td><span className="badge">{r.category || "-"}</span></td>
                      <td>{r.date?.slice(0, 10) || r.created_at?.slice(0, 10)}</td>
                      <td>{r.description}</td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" onClick={() => openEdit(r)} title="កែប្រែ">
                            <LuPencil />
                          </button>
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(r.id)} title="លុប">
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? "កែប្រែកំណត់ត្រា" : "បន្ថែមកំណត់ត្រាថ្មី"}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><LuX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>ចំណងជើង *</label>
                  <input name="title" value={form.title} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ប្រភេទ</label>
                    <input name="category" value={form.category} onChange={handleChange} placeholder="ប្រភេទកំណត់ត្រា" />
                  </div>
                  <div className="form-group">
                    <label>កាលបរិច្ឆេទ</label>
                    <input name="date" type="date" value={form.date} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>ការពិពណ៌នា</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>បោះបង់</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "រក្សាទុក..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}