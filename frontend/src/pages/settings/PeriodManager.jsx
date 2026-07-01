import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import Modal from "./Modal";

export default function PeriodManager() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setMessage("");
    try { const { data } = await performanceAPI.getPeriods(); setPeriods(data?.data || data || []); } catch (e) { setMessage(e?.response?.data?.error || "Failed to load periods"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setForm({ start_date: "", end_date: "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage("");
    try { await performanceAPI.createPeriod(form); setForm({ start_date: "", end_date: "" }); setMessage("Period created."); closeModal(); fetch(); } catch (e) { setMessage(e?.response?.data?.error || "Create failed"); } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.label_kh}"?`)) return;
    try { await performanceAPI.deletePeriod(p.id); setMessage("Deleted."); fetch(); } catch (e) { setMessage(e?.response?.data?.error || "Delete failed"); }
  };

  return (
    <div>
      {message && <div className="alert alert-success">{message}</div>}
      <div style={{ marginBottom: "1rem" }}>
        <button className="btn btn-primary" onClick={openCreate}><LuPlus /> បន្ថែមរយៈពេលថ្មី</button>
      </div>

      {loading ? <div className="loading">កំពុងផ្ទុក...</div> : (
        <div className="table-responsive">
          <table className="table">
            <thead><tr><th>ឈ្មោះ</th><th>ចាប់ពី</th><th>ដល់</th><th>Sort</th><th></th></tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td>{p.label_kh}</td>
                  <td>{p.start_date}</td>
                  <td>{p.end_date}</td>
                  <td>{p.sort_order}</td>
                  <td><button className="btn-icon btn-danger" onClick={() => handleDelete(p)}><LuTrash2 /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="បន្ថែមរយៈពេលថ្មី">
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label>ចាប់ពីថ្ងៃ *</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>ដល់ថ្ងៃ *</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "0.5rem" }}>
            {saving ? "..." : "បង្កើត"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
