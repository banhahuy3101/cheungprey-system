import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuSearch, LuFilter, LuX, LuCheck, LuCircleX, LuRotateCcw, LuList } from "react-icons/lu";
import { financesAPI } from "../../../api/finances";
import { useAuth } from "../../../hooks/useAuth";
import { isAdmin as checkIsAdmin } from "../../../utils/permissions";
import ZoneCascadeSelect from "../../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../../hooks/useZoneCascade";
import FinanceTxnTabs from "../../../components/finances/FinanceTxnTabs";
import FinanceHero from "../../../components/finances/FinanceHero";
import TransactionFormModal from "../../../components/finances/TransactionFormModal";
import RejectModal from "../../../components/finances/RejectModal";
import Select from "../../../components/Select";
import {
  FMS_TXN_STATUS,
  formatFMSUSD,
  apiMessage,
  accountsForTxnType,
  accountLabel,
} from "../../../utils/finances";

const INITIAL_FORM = { account_code: "", amount_usd: "", amount_khr: "", description: "" };

function canApproveFMS(user) {
  const role = user?.role;
  return checkIsAdmin(user) || ["super_admin", "admin", "district_chief", "commune_chief"].includes(role);
}

export default function FMSTransactions({ type }) {
  const { user, refreshProfile } = useAuth();
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const userZone = user?.zone_code || "";
  const canApprove = canApproveFMS(user);
  const isIncome = type !== "expense";
  const pageVariant = isIncome ? "income" : "expense";

  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [modalZoneSeed, setModalZoneSeed] = useState(null);

  const zone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone, showVillage: false });
  const formZone = useZoneCascade({ userZone, isAdmin, initialZoneCode: modalZoneSeed, showVillage: false });
  const typeAccounts = accountsForTxnType(accounts, type);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!user?.zone_code && refreshProfile) refreshProfile();
  }, [user?.zone_code, refreshProfile]);

  const showFlash = (msg, isError = false) => {
    setFlash(msg);
    setFlashError(isError);
    setTimeout(() => setFlash(""), 3500);
  };

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await financesAPI.listTransactions({
        type,
        status: filterStatus || undefined,
        account_code: filterAccount || undefined,
        zone_code: zone.resolvedZone || undefined,
        q: search || undefined,
        page,
        limit: 20,
      });
      setTxns(data.data?.transactions || []);
      setTotal(data.data?.total || 0);
    } catch (err) {
      setTxns([]);
      showFlash(apiMessage(err, "ផ្ទុកទិន្នន័យមិនបាន"), true);
    } finally {
      setLoading(false);
    }
  }, [type, filterStatus, filterAccount, zone.resolvedZone, page, search]);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await financesAPI.listCoA();
      setAccounts(data.data || []);
    } catch {
      //
    }
  }, []);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { setPage(1); setFilterAccount(""); }, [type]);

  const openCreate = () => {
    setForm(INITIAL_FORM);
    setFormError("");
    setModalZoneSeed(userZone || "0303");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setModalZoneSeed(null);
    setFormError("");
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    const resolved = formZone.resolvedZone || userZone;
    if (!resolved || resolved.length < 6) {
      setFormError("សូមជ្រើសរើសឃុំ (ខេត្ត → ស្រុក → ឃុំ)");
      return;
    }
    if (!form.account_code) {
      setFormError("សូមជ្រើសរើសគណនី");
      return;
    }
    if (!form.amount_usd && !form.amount_khr) {
      setFormError("សូមបញ្ចូលទឹកប្រាក់ USD ឬ KHR");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await financesAPI.createTransaction({
        account_code: form.account_code,
        amount_usd: parseFloat(form.amount_usd) || 0,
        amount_khr: parseFloat(form.amount_khr) || 0,
        description: form.description,
        type,
        zone_code: resolved,
      });
      closeForm();
      showFlash("បានដាក់ស្នើប្រតិបត្តិការ");
      fetchTxns();
    } catch (err) {
      setFormError(apiMessage(err, "បរាជ័យ"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setWorkflowBusy(id);
    try {
      await financesAPI.approveTransaction(id);
      showFlash("បានអនុម័ត");
      fetchTxns();
    } catch (err) {
      showFlash(apiMessage(err, "បរាជ័យ"), true);
    } finally {
      setWorkflowBusy(null);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setWorkflowBusy(rejectTarget);
    try {
      await financesAPI.rejectTransaction(rejectTarget, { reason });
      showFlash("បានបដិសេធ");
      setRejectTarget(null);
      fetchTxns();
    } catch (err) {
      showFlash(apiMessage(err, "បរាជ័យ"), true);
    } finally {
      setWorkflowBusy(null);
    }
  };

  const handleReverse = async (id) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់បញ្ច្រាសប្រតិបត្តិការនេះ?")) return;
    setWorkflowBusy(id);
    try {
      await financesAPI.reverseTransaction(id);
      showFlash("បានបញ្ច្រាស");
      fetchTxns();
    } catch (err) {
      showFlash(apiMessage(err, "បរាជ័យ"), true);
    } finally {
      setWorkflowBusy(null);
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterStatus("");
    setFilterAccount("");
    zone.loadFromZoneCode(userZone || "0303");
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20) || 1;
  const hasFilters = filterStatus || filterAccount || zone.resolvedZone || search;

  return (
    <div className={`page fms-page fms-page-${pageVariant}`}>
      <FinanceTxnTabs />

      {flash && (
        <div className={`alert ${flashError ? "alert-error" : "alert-success"} fms-flash`}>{flash}</div>
      )}

      {!userZone && !isAdmin && (
        <div className="alert alert-error fms-flash">
          គណនីអ្នកមិនមានតំបន់កំណត់ — មិនអាចកត់ត្វាប្រតិបត្តិការបានទេ។
        </div>
      )}

      <FinanceHero
        variant={pageVariant}
        title={isIncome ? "ចំណូល" : "ចំណាយ"}
        subtitle={isIncome ? "កត់ត្វាចំណូលតាមគណនី" : "កត់ត្វាចំណាយតាមគណនី និងថវិកា"}
        actions={
          <button type="button" className="btn btn-primary fms-hero-btn" onClick={openCreate}>
            <LuPlus /> បន្ថែមប្រតិបត្តិការ
          </button>
        }
      />

      <section className="card fms-section-card">
        <div className="fms-panel-header">
          <h3 className="fms-panel-title">
            <LuList className="fms-panel-icon" />
            {isIncome ? "បញ្ជីចំណូល" : "បញ្ជីចំណាយ"}
            {!loading && <span className="fms-count-badge">{total}</span>}
          </h3>
          <button
            type="button"
            className={`btn btn-secondary btn-sm fms-filter-toggle ${filtersOpen ? "active" : ""}`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
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
                  <input
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                    placeholder="ពិពណ៌នា..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label>ស្ថានភាព</label>
                <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                  <option value="">ទាំងអស់</option>
                  {Object.entries(FMS_TXN_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </Select>
              </div>
              <div className="form-group">
                <label>គណនី</label>
                <Select value={filterAccount} onChange={(e) => { setFilterAccount(e.target.value); setPage(1); }}>
                  <option value="">គណនីទាំងអស់</option>
                  {typeAccounts.map((a) => (
                    <option key={a.account_code} value={a.account_code}>{accountLabel(a)}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="fms-filters-zone">
              <label className="fms-section-label">តំបន់</label>
              <ZoneCascadeSelect hook={zone} />
            </div>
            {hasFilters && (
              <div className="fms-filter-chips">
                {search && <span className="fms-chip">ស្វែងរក: {search}</span>}
                {filterStatus && <span className="fms-chip">{FMS_TXN_STATUS[filterStatus]?.label}</span>}
                {filterAccount && <span className="fms-chip">{filterAccount}</span>}
                {zone.resolvedZone && <span className="fms-chip">តំបន់ {zone.resolvedZone}</span>}
                <button type="button" className="fms-chip-clear" onClick={clearFilters}><LuX /> សម្អាត</button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading fms-loading-block">កំពុងផ្ទុក...</div>
        ) : txns.length === 0 ? (
          <div className="fms-empty-state">
            <p>{isIncome ? "គ្មានចំណូល" : "គ្មានចំណាយ"}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><LuPlus /> បន្ថែម</button>
          </div>
        ) : (
          <>
            <div className="table-responsive fms-table-wrap">
              <table className="table fms-table">
                <thead>
                  <tr>
                    <th>កាលបរិច្ឆេទ</th>
                    <th>គណនី</th>
                    <th>USD</th>
                    <th>ស្ថានភាព</th>
                    <th>បរិយាយ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => {
                    const st = FMS_TXN_STATUS[t.status] || { label: t.status, badge: "" };
                    const busy = workflowBusy === t.id;
                    return (
                      <tr key={t.id} className={busy ? "fms-row-busy" : ""}>
                        <td className="fms-td-date">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td><span className="fms-account-pill">{t.account_name_kh || t.account_code}</span></td>
                        <td className={isIncome ? "fms-amount-income" : "fms-amount-expense"}>
                          {isIncome ? "+" : "−"}{formatFMSUSD(t.amount_usd)}
                        </td>
                        <td>
                          <span className={`badge ${st.badge}`}>{st.label}</span>
                          {t.status === "rejected" && t.rejection_reason && (
                            <div className="fms-reject-reason" title={t.rejection_reason}>{t.rejection_reason}</div>
                          )}
                        </td>
                        <td className="fms-td-desc">{t.description || "—"}</td>
                        <td>
                          <div className="fms-row-actions">
                            {t.status === "pending_approval" && canApprove && (
                              <>
                                <button type="button" className="btn-icon fms-action-approve" title="អនុម័ត" disabled={busy} onClick={() => handleApprove(t.id)}><LuCheck /></button>
                                <button type="button" className="btn-icon fms-action-reject" title="បដិសេធ" disabled={busy} onClick={() => setRejectTarget(t.id)}><LuCircleX /></button>
                              </>
                            )}
                            {t.status === "executed" && isAdmin && (
                              <button type="button" className="btn-icon fms-action-reverse" title="បញ្ច្រាស" disabled={busy} onClick={() => handleReverse(t.id)}><LuRotateCcw /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination fms-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>មុន</button>
                <span>ទំព័រ {page} / {totalPages} · {total} សរុប</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>បន្ទាប់</button>
              </div>
            )}
          </>
        )}
      </section>

      <TransactionFormModal
        open={showForm}
        type={type}
        form={form}
        error={formError}
        submitting={submitting}
        accounts={typeAccounts}
        zone={formZone}
        onClose={closeForm}
        onChange={handleChange}
        onSubmit={handleCreate}
      />

      <RejectModal
        open={!!rejectTarget}
        submitting={!!workflowBusy}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
