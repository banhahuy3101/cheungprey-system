import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuSearch, LuFilter, LuX, LuCheck, LuCircleX, LuRotateCcw, LuSend } from "react-icons/lu";
import { fmsAPI } from "../../api/fms";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin as checkIsAdmin } from "../../utils/permissions";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../hooks/useZoneCascade";

const STATUS_LABELS = {
  draft: "ព្រាង",
  pending_approval: "រង់ចាំអនុម័ត",
  executed: "បានអនុវត្ត",
  rejected: "បដិសេធ",
};

const STATUS_CLASSES = {
  draft: "badge-draft",
  pending_approval: "badge-pending_approval",
  executed: "badge-executed",
  rejected: "badge-rejected",
};

export default function FMSTransactions({ type }) {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const userZone = user?.zone_code || "";

  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ account_code: "", amount_usd: 0, amount_khr: 0, description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");

  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });

  const showFlash = (msg, isError = false) => {
    setFlash(msg);
    setFlashError(isError);
    setTimeout(() => setFlash(""), 3500);
  };

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fmsAPI.listTransactions({
        type,
        status: filterStatus || undefined,
        account_code: filterAccount || undefined,
        zone_code: zone.selectedZone || undefined,
        q: search || undefined,
        page, limit: 20,
      });
      setTxns(data.data.transactions || []);
      setTotal(data.data.total || 0);
    } catch { setTxns([]) }
    setLoading(false);
  }, [type, filterStatus, filterAccount, zone.selectedZone, page, search]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await fmsAPI.listCoA();
      setAccounts(data.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchTxns() }, [fetchTxns]);
  useEffect(() => { fetchAccounts() }, [fetchAccounts]);

  const openCreate = () => {
    setForm({ account_code: "", amount_usd: 0, amount_khr: 0, description: "" });
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!form.account_code) { showFlash("សូមជ្រើសរើសគណនី", true); return; }
    if (!form.amount_usd && !form.amount_khr) { showFlash("សូមបញ្ចូលទឹកប្រាក់ USD ឬ KHR", true); return; }
    setSubmitting(true);
    try {
      await fmsAPI.createTransaction({
        ...form,
        type,
        zone_code: zone.selectedZone || userZone,
      });
      setShowForm(false);
      showFlash("បានបន្ថែមប្រតិបត្តិការ");
      fetchTxns();
    } catch (e) { showFlash(e.response?.data?.error || "បរាជ័យ", true) }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    try { await fmsAPI.approveTransaction(id); showFlash("បានអនុម័ត"); fetchTxns() }
    catch (e) { showFlash(e.response?.data?.error || "បរាជ័យ", true) }
  };

  const handleReject = async (id) => {
    const reason = prompt("មូលហេតុនៃការបដិសេធ:");
    if (!reason) return;
    try { await fmsAPI.rejectTransaction(id, { reason }); showFlash("បានបដិសេធ"); fetchTxns() }
    catch (e) { showFlash(e.response?.data?.error || "បរាជ័យ", true) }
  };

  const handleReverse = async (id) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់បញ្ច្រាសប្រតិបត្តិការនេះ?")) return;
    try { await fmsAPI.reverseTransaction(id); showFlash("បានបញ្ច្រាស"); fetchTxns() }
    catch (e) { showFlash(e.response?.data?.error || "បរាជ័យ", true) }
  };

  const canApprove = isAdmin || ["super_admin", "admin", "district_chief", "commune_chief"].includes(user?.role);
  const totalPages = Math.ceil(total / 20) || 1;
  const hasFilters = filterStatus || filterAccount || zone.selectedZone || search;
  const isIncome = type !== "expense";

  return (
    <div className="page fms-page">
      {flash && (
        <div className={`alert ${flashError ? "alert-error" : "alert-success"} fms-flash`}>{flash}</div>
      )}

      <div className="fms-hero">
        <div className="fms-hero-text">
          <h2 className="fms-hero-title">FMS {isIncome ? "ចំណូល" : "ចំណាយ"}</h2>
          <p className="fms-hero-sub">{isIncome ? "គ្រប់គ្រងចំណូល" : "គ្រប់គ្រងចំណាយ"}</p>
        </div>
        <div className="fms-hero-actions">
          <button className="btn btn-primary" onClick={openCreate}><LuPlus /> បន្ថែមប្រតិបត្តិការ</button>
        </div>
      </div>

      <div className="card fms-section-card">
        <div className="fms-panel-header">
          <h3 className="fms-panel-title">
            {isIncome ? "បញ្ជីចំណូល" : "បញ្ជីចំណាយ"}
            {!loading && <span className="fms-count-badge">{total}</span>}
          </h3>
          <button className={`btn btn-secondary btn-sm ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(v => !v)}>
            <LuFilter /> តម្រង
          </button>
        </div>

        {filtersOpen && (
          <div className="fms-filters">
            <div className="fms-filters-row">
              <div className="form-group fms-filter-search">
                <label>ស្វែងរក</label>
                <div className="fms-search-wrap">
                  <LuSearch className="fms-search-icon" />
                  <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="ពិពណ៌នា..." />
                </div>
              </div>
              <div className="form-group">
                <label>ស្ថានភាព</label>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
                  <option value="">ទាំងអស់</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>គណនី</label>
                <select value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1) }}>
                  <option value="">គណនីទាំងអស់</option>
                  {accounts.map(a => (
                    <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.name_kh || a.account_name_kh}</option>
                  ))}
                </select>
              </div>
              <ZoneCascadeSelect hook={zone} compact />
            </div>
            {hasFilters && (
              <div className="fms-filter-chips">
                {search && <span className="fms-chip">ស្វែងរក: {search}</span>}
                {filterStatus && <span className="fms-chip">{STATUS_LABELS[filterStatus]}</span>}
                {filterAccount && <span className="fms-chip">{filterAccount}</span>}
                {zone.selectedZone && <span className="fms-chip">តំបន់: {zone.selectedZone}</span>}
                <button className="fms-chip-clear" onClick={() => { setSearch(""); setFilterStatus(""); setFilterAccount(""); zone.loadFromZoneCode(userZone); setPage(1) }}>
                  <LuX /> សម្អាត
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading fms-loading-block">កំពុងផ្ទុក...</div>
        ) : txns.length === 0 ? (
          <div className="fms-empty-state">
            <p>{isIncome ? "គ្មានចំណូល" : "គ្មានចំណាយ"}</p>
            <button className="btn btn-primary btn-sm" onClick={openCreate}><LuPlus /> បន្ថែម</button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>កាលបរិច្ឆេទ</th>
                    <th>គណនី</th>
                    <th>ទឹកប្រាក់</th>
                    <th>ស្ថានភាព</th>
                    <th>បរិយាយ</th>
                    <th>សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map(t => (
                    <tr key={t.id}>
                      <td className="fms-td-date">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td><strong>{t.account_name_kh || t.account_code}</strong></td>
                      <td className={isIncome ? "fms-amount-income" : "fms-amount-expense"}>
                        {isIncome ? "+" : "−"}${t.amount_usd?.toLocaleString()}
                      </td>
                      <td><span className={`badge ${STATUS_CLASSES[t.status] || ""}`}>{STATUS_LABELS[t.status] || t.status}</span></td>
                      <td className="fms-td-desc">{t.description}</td>
                      <td>
                        <div className="fms-row-actions">
                          {t.status === "draft" && (
                            <button className="btn-icon fms-action-submit" title="ដាក់ស្នើ" onClick={() => {
                              fmsAPI.createTransaction({ ...t, status: "pending_approval" }).then(fetchTxns).catch(() => {});
                            }}>
                              <LuSend />
                            </button>
                          )}
                          {t.status === "pending_approval" && canApprove && (
                            <>
                              <button className="btn-icon fms-action-approve" title="អនុម័ត" onClick={() => handleApprove(t.id)}><LuCheck /></button>
                              <button className="btn-icon fms-action-reject" title="បដិសេធ" onClick={() => handleReject(t.id)}><LuCircleX /></button>
                            </>
                          )}
                          {t.status === "executed" && isAdmin && (
                            <button className="btn-icon fms-action-reverse" title="បញ្ច្រាស" onClick={() => handleReverse(t.id)}><LuRotateCcw /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination fms-pagination">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>មុន</button>
                <span>ទំព័រ {page} / {totalPages} · {total} សរុប</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>បន្ទាប់</button>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>បន្ថែមប្រតិបត្តិការ</h2>
            <div className="form-group">
              <label>គណនី <span className="required">*</span></label>
              <select value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})}>
                <option value="">ជ្រើសរើស</option>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.name_kh || a.account_name_kh}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>ទឹកប្រាក់ USD</label>
              <input type="number" step="0.01" value={form.amount_usd} onChange={e => setForm({...form, amount_usd: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>ទឹកប្រាក់ KHR</label>
              <input type="number" step="100" value={form.amount_khr} onChange={e => setForm({...form, amount_khr: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>បរិយាយ</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowForm(false)}>បោះបង់</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
