import { useState, useEffect } from "react";
import { LuPlus, LuPencil, LuSearch } from "react-icons/lu";
import { fmsAPI } from "../../api/fms";

export default function FMSCoA() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ account_code: "", name_en: "", name_kh: "", account_type: "expense", parent_code: "" });
  const [search, setSearch] = useState("");

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await fmsAPI.listCoA();
      setAccounts(data.data || []);
    } catch { setAccounts([]) }
    setLoading(false);
  };

  useEffect(() => { fetchAccounts() }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await fmsAPI.updateCoA(editing, { name_en: form.name_en, name_kh: form.name_kh, account_type: form.account_type });
      } else {
        await fmsAPI.createCoA(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ account_code: "", name_en: "", name_kh: "", account_type: "expense", parent_code: "" });
      fetchAccounts();
    } catch (e) { alert(e.response?.data?.error || "បរាជ័យ") }
  };

  const startEdit = (a) => {
    setEditing(a.account_code);
    setForm({ account_code: a.account_code, name_en: a.name_en, name_kh: a.name_kh, account_type: a.account_type, parent_code: a.parent_code || "" });
    setShowForm(true);
  };

  const accountTypes = [
    { value: "asset", label: "ទ្រព្យសកម្ម" },
    { value: "liability", label: "បំណុល" },
    { value: "revenue", label: "ចំណូល" },
    { value: "expense", label: "ចំណាយ" },
  ];

  const filtered = accounts.filter(a =>
    !search || a.account_code.includes(search) || (a.name_kh || "").includes(search) || (a.name_en || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page fms-page">
      <div className="fms-hero">
        <div className="fms-hero-text">
          <h2 className="fms-hero-title">តារាងគណនី</h2>
          <p className="fms-hero-sub">Chart of Accounts — កំណត់ប្រភេទគណនីហិរញ្ញវត្ថុ</p>
        </div>
        <div className="fms-hero-actions">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ account_code: "", name_en: "", name_kh: "", account_type: "expense", parent_code: "" }); setShowForm(true); }}>
            <LuPlus /> បន្ថែមគណនី
          </button>
        </div>
      </div>

      <div className="card fms-section-card">
        <div className="fms-panel-header">
          <h3 className="fms-panel-title">បញ្ជីគណនី {!loading && <span className="fms-count-badge">{filtered.length}</span>}</h3>
          <div className="fms-filter-search" style={{ maxWidth: 300 }}>
            <LuSearch className="fms-search-icon" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ស្វែងរកតាមកូដ ឬឈ្មោះ..." />
          </div>
        </div>

        {loading ? (
          <div className="loading fms-loading-block">កំពុងផ្ទុក...</div>
        ) : filtered.length === 0 ? (
          <div className="fms-empty-state">
            <p>{search ? "រកមិនឃើញ" : "គ្មានគណនី"}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>កូដ</th>
                  <th>ឈ្មោះ (ខ្មែរ)</th>
                  <th>ឈ្មោះ (English)</th>
                  <th>ប្រភេទ</th>
                  <th>ស្ថានភាព</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.account_code}>
                    <td><strong>{a.account_code}</strong></td>
                    <td>{a.name_kh}</td>
                    <td className="fms-td-muted">{a.name_en}</td>
                    <td><span className={`badge badge-${a.account_type}`}>{accountTypes.find(t => t.value === a.account_type)?.label || a.account_type}</span></td>
                    <td><span className={`badge ${a.is_active ? "badge-executed" : "badge-draft"}`}>{a.is_active ? "សកម្ម" : "អសកម្ម"}</span></td>
                    <td><button className="btn btn-sm" onClick={() => startEdit(a)}><LuPencil /> កែ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? "កែប្រែគណនី" : "បន្ថែមគណនី"}</h2>
            {!editing && (
              <div className="form-group">
                <label>លេខកូដ <span className="required">*</span></label>
                <input value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})} placeholder="ឧ. 6001" />
              </div>
            )}
            <div className="form-group">
              <label>ឈ្មោះ (ខ្មែរ) <span className="required">*</span></label>
              <input value={form.name_kh} onChange={e => setForm({...form, name_kh: e.target.value})} />
            </div>
            <div className="form-group">
              <label>ឈ្មោះ (English) <span className="required">*</span></label>
              <input value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} />
            </div>
            <div className="form-group">
              <label>ប្រភេទ <span className="required">*</span></label>
              <select value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})}>
                {accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowForm(false)}>បោះបង់</button>
              <button className="btn btn-primary" onClick={handleSave}>រក្សាទុក</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
