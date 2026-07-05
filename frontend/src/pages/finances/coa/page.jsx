import { useState, useEffect } from "react";
import { LuPlus, LuPencil, LuSearch, LuBookOpen } from "react-icons/lu";
import { financesAPI } from "../../../api/finances";
import FinanceHero from "../../../components/finances/FinanceHero";
import CoAFormModal from "../../../components/finances/CoAFormModal";
import { FMS_ACCOUNT_TYPES, apiMessage } from "../../../utils/finances";

const INITIAL_FORM = { account_code: "", name_en: "", name_kh: "", account_type: "expense" };

export default function FMSCoA() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState(false);

  const showFlash = (msg, isError = false) => {
    setFlash(msg);
    setFlashError(isError);
    setTimeout(() => setFlash(""), 3500);
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await financesAPI.listCoA();
      setAccounts(data.data || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setFormError("");
    setShowForm(true);
  };

  const startEdit = (a) => {
    setEditing(a.account_code);
    setForm({
      account_code: a.account_code,
      name_en: a.name_en,
      name_kh: a.name_kh,
      account_type: a.account_type,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormError("");
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (editing) {
        await financesAPI.updateCoA(editing, {
          name_en: form.name_en,
          name_kh: form.name_kh,
          account_type: form.account_type,
        });
        showFlash("បានកែប្រែគណនី");
      } else {
        await financesAPI.createCoA(form);
        showFlash("បានបន្ថែមគណនី");
      }
      closeForm();
      fetchAccounts();
    } catch (err) {
      setFormError(apiMessage(err, "បរាជ័យ"));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = accounts.filter((a) => {
    if (typeFilter && a.account_type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.account_code.includes(search)
      || (a.name_kh || "").includes(search)
      || (a.name_en || "").toLowerCase().includes(q);
  });

  const typeBadge = (type) => FMS_ACCOUNT_TYPES.find((t) => t.value === type)?.badge || "";

  return (
    <div className="page fms-page fms-page-coa">
      {flash && (
        <div className={`alert ${flashError ? "alert-error" : "alert-success"} fms-flash`}>{flash}</div>
      )}

      <FinanceHero
        variant="coa"
        title="តារាងគណនី"
        subtitle="Chart of Accounts — កំណត់ប្រភេទគណនីហិរញ្ញវត្ថុ"
        actions={
          <button type="button" className="btn btn-primary fms-hero-btn" onClick={openCreate}>
            <LuPlus /> បន្ថែមគណនី
          </button>
        }
      />

      <section className="card fms-section-card">
        <div className="fms-panel-header">
          <h3 className="fms-panel-title">
            <LuBookOpen className="fms-panel-icon" />
            បញ្ជីគណនី
            {!loading && <span className="fms-count-badge">{filtered.length}</span>}
          </h3>
          <div className="fms-coa-toolbar">
            <div className="fms-type-pills">
              <button type="button" className={`fms-type-pill ${!typeFilter ? "active" : ""}`} onClick={() => setTypeFilter("")}>ទាំងអស់</button>
              {FMS_ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`fms-type-pill fms-type-pill-${t.value} ${typeFilter === t.value ? "active" : ""}`}
                  onClick={() => setTypeFilter(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="fms-search-wrap fms-coa-search">
              <LuSearch className="fms-search-icon" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ស្វែងរក..." />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading fms-loading-block">កំពុងផ្ទុក...</div>
        ) : filtered.length === 0 ? (
          <div className="fms-empty-state">
            <p>{search || typeFilter ? "រកមិនឃើញ" : "គ្មានគណនី"}</p>
            {!search && !typeFilter && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><LuPlus /> បន្ថែមគណនី</button>
            )}
          </div>
        ) : (
          <div className="table-responsive fms-table-wrap">
            <table className="table fms-table">
              <thead>
                <tr>
                  <th>កូដ</th>
                  <th>ឈ្មោះ (ខ្មែរ)</th>
                  <th>ឈ្មោះ (English)</th>
                  <th>ប្រភេទ</th>
                  <th>ស្ថានភាព</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.account_code}>
                    <td><code className="fms-code">{a.account_code}</code></td>
                    <td>{a.name_kh}</td>
                    <td className="fms-td-muted">{a.name_en}</td>
                    <td>
                      <span className={`badge ${typeBadge(a.account_type)}`}>
                        {FMS_ACCOUNT_TYPES.find((t) => t.value === a.account_type)?.label || a.account_type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${a.is_active ? "badge-executed" : "badge-draft"}`}>
                        {a.is_active ? "សកម្ម" : "អសកម្ម"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => startEdit(a)}>
                        <LuPencil /> កែ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CoAFormModal
        open={showForm}
        editing={editing}
        form={form}
        error={formError}
        submitting={submitting}
        onClose={closeForm}
        onChange={handleChange}
        onSubmit={handleSave}
      />
    </div>
  );
}
