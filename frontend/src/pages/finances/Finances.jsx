import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuDownload, LuSend, LuCheck, LuCircleX, LuFilter, LuX, LuList } from "react-icons/lu";
import { partyAPI } from "../../api/party";
import Select from "../../components/Select";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import FinanceSummaryPanel from "../../components/FinanceSummaryPanel";
import FinanceFormModal from "../../components/FinanceFormModal";
import FinanceCharts from "../../components/FinanceCharts";
import FinanceBudgets from "../../components/FinanceBudgets";
import FinanceModeTabs from "../../components/FinanceModeTabs";
import FinanceRejectModal from "../../components/FinanceRejectModal";
import { useAuth } from "../../hooks/useAuth";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { isAdmin as checkIsAdmin } from "../../utils/permissions";
import { readFileAsBase64, mimeTypeForFile } from "../../utils/file";
import {
  PAYMENT_LABELS,
  TYPE_LABELS,
  FINANCE_STATUS,
  FINANCE_MODES,
  typesForMode,
  canModifyFinance,
  workflowActionLabel,
  initialFinanceForm,
  formToFinancePayload,
  financeToForm,
  formatUSD,
  formatKHR,
  isExpense,
} from "../../utils/finance";

const DEFAULT_DISTRICT = "0303";

function canApproveFinance(user) {
  const role = user?.role;
  return checkIsAdmin(user) || ["super_admin", "admin", "district_chief", "commune_chief"].includes(role);
}

export default function Finances({ mode = "income" }) {
  const { user, refreshProfile } = useAuth();
  const userZone = user?.zone_code || "";
  const isAdmin = checkIsAdmin(user) || user?.role === "super_admin";
  const canApprove = canApproveFinance(user);

  const [finances, setFinances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialFinanceForm);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [flash, setFlash] = useState("");
  const [flashError, setFlashError] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterZoneCode, setFilterZoneCode] = useState("");

  const [modalZoneSeed, setModalZoneSeed] = useState(null);
  const formZone = useZoneCascade({ userZone, isAdmin, initialZoneCode: modalZoneSeed, showVillage: false });
  const filterZone = useZoneCascade({ userZone, isAdmin, initialZoneCode: userZone || DEFAULT_DISTRICT, showVillage: false });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const modeConfig = FINANCE_MODES[mode] || FINANCE_MODES.income;
  const typeOptions = typesForMode(mode);

  const filterParams = {
    q: search || undefined,
    transaction_type: filterType || undefined,
    direction: modeConfig.direction,
    status: filterStatus || undefined,
    from: filterFrom || undefined,
    to: filterTo || undefined,
    zone_code: filterZoneCode || undefined,
    page,
    limit: 20,
  };

  const showFlash = (message, isError = false) => {
    setFlash(message);
    setFlashError(isError);
    setTimeout(() => setFlash(""), 3500);
  };

  const apiMessage = (err, fallback) =>
    err?.response?.data?.error || err?.response?.data?.message || fallback;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const summaryParams = { ...filterParams };
      delete summaryParams.page;
      delete summaryParams.limit;

      const [finRes, sumRes, anaRes] = await Promise.all([
        partyAPI.getFinances(filterParams),
        partyAPI.getFinanceSummary(summaryParams),
        partyAPI.getFinanceAnalytics(summaryParams),
      ]);
      const finInner = finRes.data?.data || finRes.data;
      setFinances(finInner.finances || []);
      setTotal(finInner.total || 0);
      setSummary(sumRes.data?.data || sumRes.data);
      setAnalytics(anaRes.data?.data || anaRes.data);
    } catch (err) {
      setFetchError(apiMessage(err, "ផ្ទុកទិន្នន័យមិនបាន"));
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, filterFrom, filterTo, filterZoneCode, page, mode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user?.zone_code && refreshProfile) {
      refreshProfile();
    }
  }, [user?.zone_code, refreshProfile]);

  useEffect(() => {
    setPage(1);
    setFilterType("");
  }, [mode]);

  useEffect(() => {
    partyAPI.getMembers({ limit: 500 }).then((res) => {
      const inner = res.data?.data || res.data;
      setMembers(inner.members || inner || []);
    }).catch(() => {});
  }, []);

  const uploadAttachments = async (financeId, files) => {
    for (const file of files) {
      const base64Data = await readFileAsBase64(file);
      await partyAPI.addFinanceAttachment(financeId, {
        file_name: file.name,
        mime_type: mimeTypeForFile(file),
        base64_data: base64Data,
      });
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...initialFinanceForm, transaction_type: modeConfig.defaultType });
    setPendingFiles([]);
    setError("");
    setModalZoneSeed(userZone || DEFAULT_DISTRICT);
    setShowModal(true);
  };

  const openEdit = async (finance) => {
    try {
      const res = await partyAPI.getFinanceById(finance.id);
      const full = res.data?.data || res.data;
      setEditing(full);
      setForm(financeToForm(full));
    } catch {
      setEditing(finance);
      setForm(financeToForm(finance));
    }
    setPendingFiles([]);
    setError("");
    setModalZoneSeed(finance.zone_code || userZone || DEFAULT_DISTRICT);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalZoneSeed(null);
    setPendingFiles([]);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const zone = formZone.resolvedZone;
    if (!zone || zone.length < 6) {
      setError("សូមជ្រើសរើសឃុំ (ខេត្ត → ស្រុក → ឃុំ)");
      return;
    }
    if (!form.amount_usd && !form.amount_khr) {
      setError("សូមបញ្ចូលចំនួន USD ឬ KHR");
      return;
    }
    const allowedTypes = typesForMode(mode).map((t) => t.value);
    if (!allowedTypes.includes(form.transaction_type)) {
      setError(mode === "expense" ? "ប្រភេទត្រូវតែជាចំណាយ" : "ប្រភេទត្រូវតែជាចំណូល");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = formToFinancePayload(form, zone);
      let financeId;
      if (editing) {
        const res = await partyAPI.updateFinance(editing.id, payload);
        financeId = (res.data?.data || res.data)?.id || editing.id;
      } else {
        const res = await partyAPI.createFinance(payload);
        financeId = (res.data?.data || res.data)?.id;
      }
      if (financeId && pendingFiles.length > 0) {
        await uploadAttachments(financeId, pendingFiles);
      }
      closeModal();
      setPage(1);
      await fetchData();
      showFlash(editing ? "បានកែប្រែប្រតិបត្តិការ" : "បានបន្ថែមប្រតិបត្តិការ");
    } catch (err) {
      setError(apiMessage(err, "ប្រតិបត្តិការបរាជ័យ។"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបប្រតិបត្តិការនេះឬ?")) return;
    setWorkflowBusy(id);
    try {
      await partyAPI.deleteFinance(id);
      await fetchData();
      showFlash("បានលុបប្រតិបត្តិការ");
    } catch (err) {
      showFlash(apiMessage(err, "លុបមិនបាន"), true);
    } finally {
      setWorkflowBusy(null);
    }
  };

  const handleWorkflow = async (action, id, reason) => {
    setWorkflowBusy(id);
    try {
      if (action === "submit") await partyAPI.submitFinance(id);
      else if (action === "approve") await partyAPI.approveFinance(id);
      else if (action === "reject") await partyAPI.rejectFinance(id, { reason });
      await fetchData();
      showFlash(workflowActionLabel(action));
      setRejectTarget(null);
    } catch (err) {
      showFlash(apiMessage(err, "ប្រតិបត្តិការមិនបាន"), true);
    } finally {
      setWorkflowBusy(null);
    }
  };

  const handleRejectConfirm = (reason) => {
    if (rejectTarget) handleWorkflow("reject", rejectTarget, reason);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const params = { ...filterParams };
      delete params.page;
      delete params.limit;
      const res = await partyAPI.downloadFinanceReportPDF(params);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance_report_${filterZoneCode || "all"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showFlash("បានទាញយករបាយការណ៍ PDF");
    } catch (err) {
      showFlash(apiMessage(err, "ទាញយក PDF មិនបាន"), true);
    } finally {
      setDownloading(false);
    }
  };

  const applyFilterZone = () => {
    setFilterZoneCode(filterZone.resolvedZone || "");
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterType("");
    setFilterStatus("");
    setFilterFrom("");
    setFilterTo("");
    setFilterZoneCode("");
    filterZone.resetSelection();
    filterZone.loadFromZoneCode(userZone || DEFAULT_DISTRICT);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20) || 1;
  const hasFilters = search || filterType || filterStatus || filterFrom || filterTo || filterZoneCode;

  return (
    <div className={`page finances-page finances-page-${mode}`}>
      <FinanceModeTabs />

      {flash && (
        <div className={`alert ${flashError ? "alert-error" : "alert-success"} finance-flash`}>
          {flash}
        </div>
      )}
      {fetchError && !loading && (
        <div className="alert alert-error finance-flash">{fetchError}</div>
      )}
      {!loading && user && !userZone && !isAdmin && (
        <div className="alert alert-error finance-flash">
          គណនីអ្នកមិនមានតំបន់កំណត់ — មិនអាចកត់ត្វាហិរញ្ញវត្ថុបានទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រង។
        </div>
      )}

      <header className="finance-hero">
        <div className="finance-hero-text">
          <h2 className="finance-hero-title">{modeConfig.label}</h2>
          <p className="finance-hero-sub">{modeConfig.heroSub}</p>
        </div>
        <div className="finance-hero-actions">
          <button type="button" className="btn btn-secondary" onClick={handleDownloadPDF} disabled={downloading}>
            <LuDownload /> {downloading ? "..." : "របាយការណ៍ PDF"}
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <LuPlus /> បន្ថែមប្រតិបត្តិការ
          </button>
        </div>
      </header>

      <FinanceSummaryPanel summary={summary} mode={mode} />

      <div className={`finance-insights-grid ${mode === "expense" ? "with-budgets" : "charts-only"}`}>
        <FinanceCharts analytics={analytics} mode={mode} />
        {mode === "expense" && (
          <FinanceBudgets
            budgets={(summary?.budgets || analytics?.budgets || []).filter(
              (b) => b.budget_type === "expense" || b.budget_type === "total"
            )}
            canManage={canApprove}
            userZone={userZone}
            isAdmin={isAdmin}
            filterZoneCode={filterZoneCode}
            onRefresh={fetchData}
          />
        )}
      </div>

      <section className="card finance-transactions">
        <div className="finance-panel-header">
          <h3 className="finance-panel-title">
            <LuList className="finance-panel-icon" />
            {mode === "expense" ? "បញ្ជីចំណាយ" : "បញ្ជីចំណូល"}
            {!loading && <span className="finance-count-badge">{total}</span>}
          </h3>
          <button
            type="button"
            className={`btn btn-secondary btn-sm finance-filter-toggle ${filtersOpen ? "active" : ""}`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <LuFilter /> តម្រង
          </button>
        </div>

        {filtersOpen && (
          <div className="finance-filters">
            <div className="finance-filters-row">
              <div className="form-group finance-filter-search">
                <label>ស្វែងរក</label>
                <div className="finance-search-wrap">
                  <LuSearch className="finance-search-icon" />
                  <input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} placeholder="ពិពណ៌នា, លេខយោង..." />
                </div>
              </div>
              <div className="form-group">
                <label>ស្ថានភាព</label>
                <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                  <option value="">ទាំងអស់</option>
                  {Object.entries(FINANCE_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </Select>
              </div>
              <div className="form-group">
                <label>ប្រភេទ</label>
                <Select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
                  <option value="">ទាំងអស់</option>
                  {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              <div className="form-group">
                <label>ចាប់ពី</label>
                <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
              </div>
              <div className="form-group">
                <label>ដល់</label>
                <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div className="finance-filters-zone">
              <label className="finance-section-label">តំបន់ (ខេត្ត → ស្រុក → ឃុំ)</label>
              <ZoneCascadeSelect
                {...filterZone}
                onProvinceChange={filterZone.setProvince}
                onDistrictChange={filterZone.setDistrict}
                onCommuneChange={filterZone.setCommune}
                onVillageChange={filterZone.setSelectedVillage}
                isLocked={filterZone.isLocked}
                compact
                showVillage={false}
              />
              <div className="finance-filter-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={applyFilterZone}>អនុវត្ត</button>
                {hasFilters && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                    <LuX /> សម្អាត
                  </button>
                )}
              </div>
            </div>
            {hasFilters && (
              <div className="finance-filter-chips">
                {search && <span className="finance-chip">ស្វែងរក: {search}</span>}
                {filterStatus && <span className="finance-chip">{FINANCE_STATUS[filterStatus]?.label}</span>}
                {filterType && <span className="finance-chip">{TYPE_LABELS[filterType]}</span>}
                {filterFrom && <span className="finance-chip">ពី {filterFrom}</span>}
                {filterTo && <span className="finance-chip">ដល់ {filterTo}</span>}
                {filterZoneCode && <span className="finance-chip">តំបន់ {filterZoneCode}</span>}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading finance-loading-block">កំពុងផ្ទុក...</div>
        ) : finances.length === 0 ? (
          <div className="finance-empty">
            <p>{mode === "expense" ? "គ្មានចំណាយ" : "គ្មានចំណូល"}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <LuPlus /> បន្ថែមប្រតិបត្តិការ
            </button>
          </div>
        ) : (
          <>
            <div className="table-responsive finance-table-wrap">
              <table className="table finance-table">
                <thead>
                  <tr>
                    <th>កាលបរិច្ឆេទ</th>
                    <th>តំបន់</th>
                    <th>ស្ថានភាព</th>
                    <th>ប្រភេទ</th>
                    <th className="finance-th-amount">USD</th>
                    <th className="finance-th-amount">KHR</th>
                    <th>វិធីបង់</th>
                    <th>ឈ្មោះ</th>
                    <th className="finance-th-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {finances.map((f) => {
                    const expense = isExpense(f.transaction_type);
                    const st = FINANCE_STATUS[f.status] || FINANCE_STATUS.approved;
                    const editable = canModifyFinance(f, user, canApprove);
                    const busy = workflowBusy === f.id;
                    return (
                      <tr key={f.id} className={`finance-row ${busy ? "finance-row-busy" : ""}`}>
                        <td className="finance-td-date">{f.transaction_date?.slice(0, 10)}</td>
                        <td className="finance-td-zone">{f.zone_name_kh || f.zone_code || "—"}</td>
                        <td>
                          <span className={`badge finance-status-badge ${st.badge}`}>{st.label}</span>
                          {f.status === "rejected" && f.rejection_reason && (
                            <div className="finance-reject-reason" title={f.rejection_reason}>
                              {f.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`finance-type-pill ${expense ? "expense" : "income"}`}>
                            {TYPE_LABELS[f.transaction_type] || f.transaction_type}
                          </span>
                        </td>
                        <td className={`finance-td-amount ${expense ? "finance-amount-expense" : "finance-amount-income"}`}>
                          {expense ? "−" : "+"}{formatUSD(f.amount_usd)}
                        </td>
                        <td className="finance-td-khr">{formatKHR(f.amount_khr) || "—"}</td>
                        <td className="finance-td-muted">{PAYMENT_LABELS[f.payment_method] || f.payment_method}</td>
                        <td>{f.contributor_name_kh || f.contributor_name_en || "—"}</td>
                        <td>
                          <div className="finance-row-actions">
                            {(f.status === "draft" || f.status === "rejected") && (
                              <button
                                type="button"
                                className="btn-icon finance-action-submit"
                                title="ដាក់ស្នើ"
                                disabled={busy}
                                onClick={() => handleWorkflow("submit", f.id)}
                              >
                                <LuSend />
                              </button>
                            )}
                            {f.status === "submitted" && canApprove && (
                              <>
                                <button
                                  type="button"
                                  className="btn-icon finance-action-approve"
                                  title="អនុម័ត"
                                  disabled={busy}
                                  onClick={() => handleWorkflow("approve", f.id)}
                                >
                                  <LuCheck />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon finance-action-reject"
                                  title="បដិសេធ"
                                  disabled={busy}
                                  onClick={() => setRejectTarget(f.id)}
                                >
                                  <LuCircleX />
                                </button>
                              </>
                            )}
                            {editable && (
                              <>
                                <button type="button" className="btn-icon" title="កែប្រែ" disabled={busy} onClick={() => openEdit(f)}>
                                  <LuPencil />
                                </button>
                                <button type="button" className="btn-icon" title="លុប" disabled={busy} onClick={() => handleDelete(f.id)}>
                                  <LuTrash2 />
                                </button>
                              </>
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
              <div className="pagination finance-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>មុន</button>
                <span>ទំព័រ {page} / {totalPages} · {total} សរុប</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>បន្ទាប់</button>
              </div>
            )}
          </>
        )}
      </section>

      <FinanceFormModal
        open={showModal}
        editing={editing}
        form={form}
        error={error}
        submitting={submitting}
        members={members}
        zone={formZone}
        pendingFiles={pendingFiles}
        onFilesChange={setPendingFiles}
        transactionTypes={typeOptions}
        onClose={closeModal}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />

      <FinanceRejectModal
        open={!!rejectTarget}
        submitting={!!workflowBusy}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
