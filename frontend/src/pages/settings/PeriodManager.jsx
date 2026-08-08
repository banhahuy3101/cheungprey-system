import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuTrash2, LuPencil } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import Modal from "./Modal";

const emptyForm = { start_date: "", end_date: "", label_kh: "", label_en: "", sort_order: "" };

export default function PeriodManager() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setMessage("");
    try { const { data } = await performanceAPI.getPeriods(); setPeriods(data?.data || data || []); } catch (e) { setMessage(e?.response?.data?.error || "Failed to load periods"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      label_kh: p.label_kh || "",
      label_en: p.label_en || "",
      sort_order: p.sort_order != null ? String(p.sort_order) : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) { setMessage("សូមបំពេញថ្ងៃចាប់ផ្ដើមនិងថ្ងៃបញ្ចប់"); return; }
    setSaving(true); setMessage("");
    try {
      const payload = {
        start_date: form.start_date,
        end_date: form.end_date,
        label_kh: form.label_kh,
        label_en: form.label_en,
      };
      const so = parseInt(form.sort_order, 10);
      if (!isNaN(so)) payload.sort_order = so;

      if (editingId) {
        await performanceAPI.updatePeriod(editingId, payload);
        setMessage("កែប្រែរួចរាល់។");
      } else {
        await performanceAPI.createPeriod(payload);
        setMessage("បានបង្កើតរយៈពេលថ្មី។");
      }
      setForm({ ...emptyForm });
      closeModal();
      fetch();
    } catch (e) {
      setMessage(e?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.label_kh}"?`)) return;
    try { await performanceAPI.deletePeriod(p.id); setMessage("Deleted."); fetch(); } catch (e) { setMessage(e?.response?.data?.error || "Delete failed"); }
  };

  const isEdit = Boolean(editingId);

  return (
    <div>
      {message && (
        <div className={`alert ${message.includes("failed") || message.includes("សូម") ? "alert-error" : "alert-success"}`} style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      )}
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
                  <td style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn-icon" onClick={() => openEdit(p)} title="កែប្រែ"><LuPencil /></button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(p)}><LuTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={isEdit ? "កែប្រែរយៈពេល" : "បន្ថែមរយៈពេលថ្មី"}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>ចាប់ពីថ្ងៃ *</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, label_kh: "", label_en: "" })} required />
            </div>
            <div className="form-group">
              <label>ដល់ថ្ងៃ *</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value, label_kh: "", label_en: "" })} required />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: "0.5rem" }}>
            <div className="form-group">
              <label>ឈ្មោះខ្មែរ</label>
              <input type="text" value={form.label_kh} onChange={(e) => setForm({ ...form, label_kh: e.target.value })} placeholder="អូតូ (ទុកទទេដើម្បីបង្កើតស្វ័យប្រវត្តិ)" />
            </div>
            <div className="form-group">
              <label>ឈ្មោះអង់គ្លេស</label>
              <input type="text" value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} placeholder="Auto (leave empty for auto-generate)" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: "0.5rem" }}>
            <div className="form-group" style={{ maxWidth: 150 }}>
              <label>លំដាប់ (Sort Order)</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="Auto" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "0.5rem" }}>
            {saving ? "..." : isEdit ? "រក្សាទុក" : "បង្កើត"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
