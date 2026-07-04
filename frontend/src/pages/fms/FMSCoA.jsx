import { useState, useEffect } from "react";
import { fmsAPI } from "../../api/fms";

export default function FMSCoA() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ account_code: "", name_en: "", name_kh: "", account_type: "expense", parent_code: "" });

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
    } catch (e) { alert(e.response?.data?.error || "Failed") }
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>តារាងគណនី (Chart of Accounts)</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ account_code: "", name_en: "", name_kh: "", account_type: "expense", parent_code: "" }); setShowForm(true); }}>+ បន្ថែម</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? "កែប្រែ" : "បន្ថែម"} គណនី</h2>
            {!editing && (
              <div className="form-group">
                <label>លេខកូដ</label>
                <input value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})} />
              </div>
            )}
            <div className="form-group">
              <label>ឈ្មោះ (ខ្មែរ)</label>
              <input value={form.name_kh} onChange={e => setForm({...form, name_kh: e.target.value})} />
            </div>
            <div className="form-group">
              <label>ឈ្មោះ (English)</label>
              <input value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} />
            </div>
            <div className="form-group">
              <label>ប្រភេទ</label>
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

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>កូដ</th>
              <th>ឈ្មោះ (ខ្មែរ)</th>
              <th>ឈ្មោះ (English)</th>
              <th>ប្រភេទ</th>
              <th>សកម្ម</th>
              <th>សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.account_code}>
                <td><strong>{a.account_code}</strong></td>
                <td>{a.name_kh}</td>
                <td>{a.name_en}</td>
                <td><span className="badge">{a.account_type}</span></td>
                <td>{a.is_active ? "បាទ" : "ទេ"}</td>
                <td><button className="btn btn-sm" onClick={() => startEdit(a)}>កែ</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
