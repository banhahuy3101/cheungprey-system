import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSave } from "react-icons/lu";
import { performanceAPI } from "../../api/performance";
import Modal from "./Modal";
import Select from "../../components/Select";

export default function IndicatorManager() {
  const [domains, setDomains] = useState([]);
  const [subs, setSubs] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name_kh: "", name_en: "", data_type: "number", unit_kh: "", unit_en: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    performanceAPI.getDomains().then(({ data }) => setDomains(data?.data || data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDomain) return;
    performanceAPI.getSubDomains(selectedDomain).then(({ data }) => setSubs(data?.data || data || [])).catch(() => {});
  }, [selectedDomain]);

  const fetch = useCallback(async () => {
    if (!selectedSub) return;
    setLoading(true); setMessage("");
    try {
      const { data } = await performanceAPI.getIndicators(selectedSub);
      setIndicators(data?.data || data || []);
    } catch (e) { setMessage(e?.response?.data?.error || "Failed to load indicators"); } finally { setLoading(false); }
  }, [selectedSub]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name_kh: "", name_en: "", data_type: "number", unit_kh: "", unit_en: "", sort_order: 0 });
    setModalOpen(true);
  };

  const openEdit = (ind) => {
    setEditing(ind);
    setForm({
      code: ind.code,
      name_kh: ind.name_kh,
      name_en: ind.name_en || "",
      data_type: ind.data_type,
      unit_kh: ind.unit_kh || "",
      unit_en: ind.unit_en || "",
      sort_order: ind.sort_order,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;
    setSaving(true); setMessage("");
    try {
      if (editing) {
        await performanceAPI.updateIndicator(editing.id, { ...form, sub_domain_id: selectedSub });
      } else {
        await performanceAPI.createIndicator({ ...form, sub_domain_id: selectedSub });
      }
      setMessage(editing ? "Updated." : "Created.");
      closeModal();
      fetch();
    } catch (e) { setMessage(e?.response?.data?.error || "Save failed"); } finally { setSaving(false); }
  };

  const handleDelete = async (ind) => {
    if (!confirm(`Delete "${ind.name_kh}"?`)) return;
    try { await performanceAPI.deleteIndicator(ind.id); setMessage("Deleted."); fetch(); } catch (e) { setMessage(e?.response?.data?.error || "Delete failed"); }
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label>ដែន (Domain)</label>
          <Select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value); setSelectedSub(""); setEditing(null); }}>
            <option value="">-- ជ្រើសរើស --</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.code}. {d.name_kh}</option>)}
          </Select>
        </div>
        <div className="form-group">
          <label>ចំណុចរង (Sub-Domain)</label>
          <Select value={selectedSub} onChange={(e) => { setSelectedSub(e.target.value); setEditing(null); }} disabled={!selectedDomain}>
            <option value="">-- ជ្រើសរើស --</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.code}. {s.name_kh}</option>)}
          </Select>
        </div>
      </div>

      {selectedSub && (
        <>
          {message && <div className="alert alert-success">{message}</div>}
          <div style={{ marginBottom: "1rem" }}>
            <button className="btn btn-primary" onClick={openCreate}><LuPlus /> បន្ថែមសូចនាករថ្មី</button>
          </div>

          {loading ? <div className="loading">កំពុងផ្ទុក...</div> : (
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Code</th><th>ឈ្មោះខ្មែរ</th><th>Type</th><th>Sort</th><th></th></tr></thead>
                <tbody>
                  {indicators.map((ind) => (
                    <tr key={ind.id}>
                      <td>{ind.code}</td>
                      <td>{ind.name_kh}</td>
                      <td>{ind.data_type}</td>
                      <td>{ind.sort_order}</td>
                      <td>
                        <div className="actions">
                          <button className="btn-icon" onClick={() => openEdit(ind)}><LuPencil /></button>
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(ind)}><LuTrash2 /></button>
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "កែប្រែសូចនាករ" : "បន្ថែមសូចនាករថ្មី"}>
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
              <label>ប្រភេទ *</label>
              <Select value={form.data_type} onChange={(e) => setForm({ ...form, data_type: e.target.value })}>
                <option value="number">ចំនួន (number)</option>
                <option value="percentage">ភាគរយ (percentage)</option>
                <option value="binary">បាទ/ទេ (binary)</option>
              </Select>
            </div>
            <div className="form-group">
              <label>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Unit (KH)</label>
              <input value={form.unit_kh} onChange={(e) => setForm({ ...form, unit_kh: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Unit (EN)</label>
              <input value={form.unit_en} onChange={(e) => setForm({ ...form, unit_en: e.target.value })} />
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
