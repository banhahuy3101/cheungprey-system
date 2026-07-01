import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSave } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import Modal from "./Modal";
import Select from "../../components/Select";

export default function SubDomainManager() {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name_kh: "", name_en: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    performanceAPI.getDomains().then(({ data }) => setDomains(data?.data || data || [])).catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    if (!selectedDomain) return;
    setLoading(true); setMessage("");
    try {
      const { data } = await performanceAPI.getSubDomains(selectedDomain);
      setSubs(data?.data || data || []);
    } catch (e) { setMessage(e?.response?.data?.error || "Failed to load sub-domains"); } finally { setLoading(false); }
  }, [selectedDomain]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name_kh: "", name_en: "", sort_order: 0 });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ code: s.code, name_kh: s.name_kh, name_en: s.name_en || "", sort_order: s.sort_order });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDomain) return;
    setSaving(true); setMessage("");
    try {
      if (editing) {
        await performanceAPI.updateSubDomain(editing.id, { ...form, domain_id: selectedDomain });
      } else {
        await performanceAPI.createSubDomain({ ...form, domain_id: selectedDomain });
      }
      setMessage(editing ? "Updated." : "Created.");
      closeModal();
      fetch();
    } catch (e) { setMessage(e?.response?.data?.error || "Save failed"); } finally { setSaving(false); }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete "${s.name_kh}"?`)) return;
    try { await performanceAPI.deleteSubDomain(s.id); setMessage("Deleted."); fetch(); } catch (e) { setMessage(e?.response?.data?.error || "Delete failed"); }
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label>ដែន (Domain)</label>
          <Select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); setEditing(null); }}>
            <option value="">-- ជ្រើសរើស --</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.code}. {d.name_kh}</option>)}
          </Select>
        </div>
      </div>

      {selectedDomain && (
        <>
          {message && <div className="alert alert-success">{message}</div>}
          <div style={{ marginBottom: "1rem" }}>
            <button className="btn btn-primary" onClick={openCreate}><LuPlus /> បន្ថែមចំណុចរងថ្មី</button>
          </div>

          {loading ? <div className="loading">កំពុងផ្ទុក...</div> : (
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Code</th><th>ឈ្មោះខ្មែរ</th><th>Name EN</th><th>Sort</th><th></th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.code}</td>
                      <td>{s.name_kh}</td>
                      <td>{s.name_en}</td>
                      <td>{s.sort_order}</td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" onClick={() => openEdit(s)}><LuPencil /></button>
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(s)}><LuTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "កែប្រែចំណុចរង" : "បន្ថែមចំណុចរងថ្មី"}>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label>Code *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>ឈ្មោះខ្មែរ *</label>
              <input value={form.name_kh} onChange={(e) => setForm({ ...form, name_kh: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Name (EN)</label>
              <input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <LuSave /> {saving ? "..." : editing ? "ធ្វើបច្ចុប្បន្នភាព" : "រក្សាទុក"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>បោះបង់</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
