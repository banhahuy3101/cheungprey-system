import { useState, useEffect, useCallback } from "react";
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

export default function FMSTransactions({ type }) {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const userZone = user?.zone_code || "";

  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ zone_code: "", account_code: "", type: type || "income", amount_usd: 0, amount_khr: 0, description: "", document_refs: [] });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fmsAPI.listTransactions({
        type: type,
        status: filterStatus || undefined,
        account_code: filterAccount || undefined,
        zone_code: zone.selectedZone || undefined,
        page, limit: 20,
      });
      setTxns(data.data.transactions || []);
      setTotal(data.data.total || 0);
    } catch { setTxns([]) }
    setLoading(false);
  }, [type, filterStatus, filterAccount, zone.selectedZone, page]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await fmsAPI.listCoA();
      setAccounts(data.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchTxns() }, [fetchTxns]);
  useEffect(() => { fetchAccounts() }, [fetchAccounts]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await fmsAPI.createTransaction({
        ...form,
        zone_code: zone.selectedZone || form.zone_code,
      });
      setShowForm(false);
      setForm({ zone_code: "", account_code: "", type: type || "income", amount_usd: 0, amount_khr: 0, description: "", document_refs: [] });
      fetchTxns();
    } catch (e) { alert(e.response?.data?.error || "Failed to create") }
    setSubmitting(false);
  };

  const handleApprove = async (id) => {
    try { await fmsAPI.approveTransaction(id); fetchTxns() }
    catch (e) { alert(e.response?.data?.error || "Failed") }
  };

  const handleReject = async (id) => {
    const reason = prompt("មូលហេតុនៃការបដិសេធ:");
    if (!reason) return;
    try { await fmsAPI.rejectTransaction(id, { reason }); fetchTxns() }
    catch (e) { alert(e.response?.data?.error || "Failed") }
  };

  const handleReverse = async (id) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់បញ្ច្រាសប្រតិបត្តិការនេះ?")) return;
    try { await fmsAPI.reverseTransaction(id); fetchTxns() }
    catch (e) { alert(e.response?.data?.error || "Failed") }
  };

  const canApprove = isAdmin || ["super_admin", "admin", "district_chief", "commune_chief"].includes(user?.role);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{type === "expense" ? "ចំណាយ" : "ចំណូល"} — FMS</h1>
        <div className="page-actions">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">ទាំងអស់</option>
            <option value="draft">ព្រាង</option>
            <option value="pending_approval">រង់ចាំអនុម័ត</option>
            <option value="executed">បានអនុវត្ត</option>
            <option value="rejected">បដិសេធ</option>
          </select>
          <select value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1) }}>
            <option value="">គណនីទាំងអស់</option>
            {accounts.map(a => (
              <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.name_kh}</option>
            ))}
          </select>
          <ZoneCascadeSelect hook={zone} />
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ បញ្ចូលថ្មី</button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>បញ្ចូលប្រតិបត្តិការថ្មី</h2>
            <div className="form-group">
              <label>គណនី</label>
              <select value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})}>
                <option value="">ជ្រើសរើស</option>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.name_kh}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>ទឹកប្រាក់ (USD)</label>
              <input type="number" value={form.amount_usd} onChange={e => setForm({...form, amount_usd: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>ទឹកប្រាក់ (KHR)</label>
              <input type="number" value={form.amount_khr} onChange={e => setForm({...form, amount_khr: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>បរិយាយ</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
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

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : (
        <>
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
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>{t.account_name_kh || t.account_code}</td>
                  <td>${t.amount_usd?.toLocaleString()}</td>
                  <td><span className={`badge badge-${t.status}`}>{STATUS_LABELS[t.status] || t.status}</span></td>
                  <td>{t.description}</td>
                  <td className="actions">
                    {t.status === "pending_approval" && canApprove && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(t.id)}>អនុម័ត</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(t.id)}>បដិសេធ</button>
                      </>
                    )}
                    {t.status === "executed" && isAdmin && (
                      <button className="btn btn-sm btn-warning" onClick={() => handleReverse(t.id)}>បញ្ច្រាស</button>
                    )}
                  </td>
                </tr>
              ))}
              {txns.length === 0 && (
                <tr><td colSpan={6} className="empty">គ្មានទិន្នន័យ</td></tr>
              )}
            </tbody>
          </table>

          {total > 20 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>មុន</button>
              <span>ទំព័រ {page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>បន្ទាប់</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
