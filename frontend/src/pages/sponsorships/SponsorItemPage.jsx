import { useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuPlus,
  LuPrinter,
  LuDollarSign,
  LuPackage,
  LuPencil,
  LuTrash2,
  LuSearch,
  LuCalendar,
  LuLayers,
} from "react-icons/lu";
import { SponsorshipProvider, useSponsorships } from "../../context/SponsorshipContext";
import { sponsorshipAPI } from "../../api/sponsorship";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { canAccess, FEATURES, isAdmin } from "../../utils/permissions";
import { toKhmerDigits, toKhmerDigitsInText } from "../../utils/khmerNumberSpelling";
import { calculateSponsorshipTotals } from "../../utils/sponsorshipUtils";
import PageHeader from "../../components/PageHeader";
import FormInput from "../../components/FormInput";
import Pagination from "../../components/Pagination";
import "../../style/sponsorships.css";

function SponsorItemContent() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams(); // URL parameter: periodId

  const {
    periods,
    deleteRecord,
    fetchSponsorships,
  } = useSponsorships();

  const [period, setPeriod] = useState(null);
  const [periodRecords, setPeriodRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consolidating, setConsolidating] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const canCreate =
    canAccess(user, FEATURES.sponsorships_create) ||
    canAccess(user, FEATURES.sponsorships, "create") ||
    canAccess(user, FEATURES.sponsorships) ||
    isAdmin(user);
  const canEdit =
    canAccess(user, FEATURES.sponsorships_update) ||
    canAccess(user, FEATURES.sponsorships, "update") ||
    canAccess(user, FEATURES.sponsorships) ||
    isAdmin(user);
  const canDelete =
    canAccess(user, FEATURES.sponsorships_delete) ||
    canAccess(user, FEATURES.sponsorships, "delete") ||
    canAccess(user, FEATURES.sponsorships) ||
    isAdmin(user);

  // Fetch Period and its records from API
  const loadPeriodData = async () => {
    if (!id) return;
    try {
      setLoading(true);

      const [periodRes, recsRes] = await Promise.all([
        sponsorshipAPI.getPeriodByID(id).catch(() => null),
        sponsorshipAPI.list({ period_id: id, limit: 1000 }).catch(() => ({ data: { data: [] } })),
      ]);

      if (periodRes?.data?.data) {
        setPeriod(periodRes.data.data);
      }
      setPeriodRecords(recsRes.data?.data || []);
    } catch (err) {
      console.error("loadPeriodData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodData();
  }, [id]);

  const sortedRecords = useMemo(() => {
    return [...periodRecords].sort((a, b) => {
      const noA = Number(a.entry_no) || Number(a.record_id) || 0;
      const noB = Number(b.entry_no) || Number(b.record_id) || 0;
      if (noA && noB && noA !== noB) return noA - noB;
      if (noA && !noB) return -1;
      if (!noA && noB) return 1;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  }, [periodRecords]);

  const filteredRecords = useMemo(() => {
    if (!search) return sortedRecords;
    const term = search.replace(/\s+/g, "").toLowerCase();
    const normalize = (str) => (str || "").replace(/\s+/g, "").toLowerCase();
    return sortedRecords.filter((r) => {
      const name = normalize(r.contributor_name || r.donor_name);
      const rep = normalize(r.representatives);
      const usage = normalize(r.usage_description || r.allocation_purpose);
      const remarks = normalize(r.remarks);
      const itemsText = normalize((r.items || []).map((it) => it.item_name).join(""));
      return (
        name.includes(term) ||
        rep.includes(term) ||
        usage.includes(term) ||
        remarks.includes(term) ||
        itemsText.includes(term)
      );
    });
  }, [sortedRecords, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totals = calculateSponsorshipTotals(filteredRecords);

  const handleDeleteRecord = async (recordId) => {
    await deleteRecord(recordId);
    loadPeriodData();
  };

  const handleConsolidate = async () => {
    if (!id) return;
    try {
      setConsolidating(true);
      const res = await sponsorshipAPI.consolidatePeriod(id);
      const mergedCount = res?.data?.merged_count ?? 0;
      toast?.success?.(
        `បានប្រមូលផ្តុំទិន្នន័យដោយជោគជ័យ (សរុប ${toKhmerDigits(mergedCount)} អ្នកឧបត្ថម្ភ)`
      );
      await loadPeriodData();
    } catch (err) {
      console.error("Consolidation error:", err);
      toast?.error?.(err.response?.data?.error || "មិនអាចប្រមូលផ្តុំទិន្នន័យបានទេ");
    } finally {
      setConsolidating(false);
    }
  };

  const openAppendixReport = () => {
    if (period) {
      navigate(`/sponsorships/appendix?period_id=${period.id}&period=${encodeURIComponent(period.period_name)}`);
    } else {
      navigate("/sponsorships/appendix");
    }
  };

  const isConsolidatable = period?.period_type === "year" || period?.period_type === "semester";

  return (
    <div className="page sponsorship-page">
      {/* Standard Reusable PageHeader Component */}
      <PageHeader
        title={period?.period_name || "តារាងឧបត្ថម្ភលម្អិត"}
        subtitle="តារាងតាមដានការឧបត្ថម្ភថវិកា និងសម្ភារលម្អិត (៧ ជួរឈរផ្លូវការ)"
        showBack={() => navigate("/sponsorships")}
        backText="ត្រឡប់ទៅបញ្ជីតារាងមេ"
        breadcrumbs={[
          { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
          { label: "ការឧបត្ថម្ភ", path: "/sponsorships" },
          { label: period?.period_name || "តារាងលម្អិត" },
        ]}
        badge={
          period?.fiscal_year ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
              <LuCalendar size={13} />
              <span>ឆ្នាំ {toKhmerDigits(period.fiscal_year, false)}</span>
            </span>
          ) : null
        }
        actions={
          <div className="flex items-center gap-2">
            {isConsolidatable && canCreate && (
              <button
                type="button"
                className="btn btn-secondary flex items-center gap-1.5 font-medium border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100"
                onClick={handleConsolidate}
                disabled={consolidating}
                title="ប្រមូលផ្តុំទិន្នន័យពីខែផ្សេងៗក្នុងឆ្នាំនេះ"
              >
                <LuLayers size={16} className={consolidating ? "animate-spin" : "text-indigo-600"} />
                <span>{consolidating ? "កំពុងប្រមូលផ្តុំ..." : "ប្រមូលផ្តុំទិន្នន័យ"}</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary flex items-center gap-1.5 font-medium"
              onClick={openAppendixReport}
            >
              <LuPrinter size={16} />
              <span>បោះពុម្ពតារាង (Print)</span>
            </button>

            {canCreate && (
              <button
                type="button"
                className="btn btn-primary flex items-center gap-1.5 font-semibold"
                onClick={() => navigate(`/sponsorships/items/${id}/create`)}
              >
                <LuPlus size={18} />
                <span>បន្ថែមអ្នកឧបត្ថម្ភ</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="sponsorship-kpi-grid">
        <div className="sponsorship-kpi-card">
          <div className="sponsorship-kpi-icon usd">
            <LuDollarSign />
          </div>
          <div>
            <span className="sponsorship-kpi-label">ថវិកាសរុបជាដុល្លារ ($ USD)</span>
            <span className="sponsorship-kpi-value" style={{ color: "#059669" }}>
              {(totals.totalUSD || Number(period?.total_usd) || 0) > 0
                ? `${toKhmerDigits(totals.totalUSD || Number(period?.total_usd) || 0)} $`
                : "០.០០ $"}
            </span>
          </div>
        </div>

        <div className="sponsorship-kpi-card">
          <div className="sponsorship-kpi-icon khr">
            <LuDollarSign />
          </div>
          <div>
            <span className="sponsorship-kpi-label">ថវិកាសរុបជារៀល (៛ KHR)</span>
            <span className="sponsorship-kpi-value" style={{ color: "#2563eb" }}>
              {(totals.totalKHR || Number(period?.total_khr) || 0) > 0
                ? `${toKhmerDigits(totals.totalKHR || Number(period?.total_khr) || 0)} ៛`
                : "០ ៛"}
            </span>
          </div>
        </div>

        <div className="sponsorship-kpi-card">
          <div className="sponsorship-kpi-icon material">
            <LuPackage />
          </div>
          <div>
            <span className="sponsorship-kpi-label">ចំនួនអ្នកឧបត្ថម្ភ</span>
            <span className="sponsorship-kpi-value" style={{ color: "#7c3aed" }}>
              {toKhmerDigits(filteredRecords.length > 0 ? filteredRecords.length : (period?.records_count || 0))} នាក់
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ width: "100%", maxWidth: "340px" }}>
          <FormInput
            leadIcon={<LuSearch size={16} />}
            placeholder="ស្វែងរកតាមឈ្មោះ, គោលបំណង..."
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/\s+/g, ""))}
          />
        </div>
      </div>

      {/* Detail Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive" style={{ border: "none", borderRadius: 0, minHeight: "480px" }}>
          <table className="table" style={{ margin: 0, width: "100%" }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold uppercase">
                <th className="w-[4%] text-center py-3 px-3">ល.រ</th>
                <th className="w-[20%] py-3 px-3">ឈ្មោះអ្នកឧបត្ថម្ភ</th>
                <th className="w-[10%] text-right py-3 px-3">ថវិកា ($ USD)</th>
                <th className="w-[11%] text-right py-3 px-3">ថវិកា (៛ KHR)</th>
                <th className="w-[15%] py-3 px-3">សម្ភារឧបត្ថម្ភ</th>
                <th className="w-[30%] py-3 px-3">គោលបំណង និង ទីកន្លែងប្រើប្រាស់</th>
                <th className="w-[10%] text-center py-3 px-3">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    កំពុងទាញយកទិន្នន័យ...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="mb-2 font-semibold text-slate-700">មិនទាន់មានអ្នកឧបត្ថម្ភក្នុងតារាងនេះនៅឡើយទេ</div>
                    <p className="m-0 text-sm text-slate-500">
                      ចុច &quot;បន្ថែមអ្នកឧបត្ថម្ភ&quot; ដើម្បីបញ្ចូលអ្នកឧបត្ថម្ភថ្មី។
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const donorName = r.contributor_name || r.donor_name || "មិនមានឈ្មោះ";
                  const rep = r.representatives ? ` (${r.representatives})` : "";
                  const items = r.items || r.in_kind_items || [];

                  const recUsd = Number(r.expense_amount_usd) || Number(r.amount_usd) || Number(r.currency_usd) || 0;
                  const recKhr = Number(r.expense_amount_khr) || Number(r.amount_khr) || Number(r.currency_khr) || 0;
                  const itemsUsd = items.reduce((sum, it) => sum + (Number(it.amount_usd) || Number(it.expense_amount_usd) || Number(it.cash_allocation_usd) || 0), 0);
                  const itemsKhr = items.reduce((sum, it) => sum + (Number(it.amount_khr) || Number(it.expense_amount_khr) || Number(it.cash_allocation_khr) || 0), 0);
                  const displayUsd = recUsd > 0 ? recUsd : itemsUsd;
                  const displayKhr = recKhr > 0 ? recKhr : itemsKhr;

                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="text-center font-bold text-slate-700 py-3 px-3">
                        {toKhmerDigits(r.entry_no || (currentPage - 1) * pageSize + idx + 1)}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-indigo-900 block font-semibold text-sm">
                          {toKhmerDigitsInText(donorName)}
                        </strong>
                        {rep && (
                          <span className="font-normal text-slate-500 text-xs block mt-0.5">
                            {toKhmerDigitsInText(rep)}
                          </span>
                        )}
                      </td>
                      <td className="text-right font-bold text-emerald-600 py-3 px-3 font-mono">
                        {displayUsd > 0
                          ? `${toKhmerDigits(displayUsd)} $`
                          : "-"}
                      </td>
                      <td className="text-right font-bold text-blue-600 py-3 px-3 font-mono">
                        {displayKhr > 0
                          ? `${toKhmerDigits(displayKhr)} ៛`
                          : "-"}
                      </td>
                      <td className="py-3 px-3">
                        {items.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {items.map((it, iIdx) => (
                              <span
                                key={it.id || iIdx}
                                className="inline-flex items-center text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                              >
                                • {it.item_name} {it.item_qty ? `${toKhmerDigits(it.item_qty)} ` : ""}{it.item_unit || ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 leading-relaxed">
                        {r.usage_description ? (
                          <div className="flex flex-col gap-1">
                            {String(r.usage_description)
                              .split(/\r?\n/)
                              .map((line, lIdx) => (
                                <div key={lIdx} className={line.trim() === "" ? "h-2" : ""}>
                                  {toKhmerDigitsInText(line) || "\u00A0"}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary p-1.5 rounded hover:bg-slate-200"
                              onClick={() => navigate(`/sponsorships/items/${id}/edit/${r.id}`)}
                              title="កែសម្រួល"
                            >
                              <LuPencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-1.5 rounded"
                              onClick={() => handleDeleteRecord(r.id)}
                              title="លុប"
                            >
                              <LuTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-200 text-slate-800">
                  <td colSpan={2} className="text-right py-3 px-4">
                    សរុបរួម ៖
                  </td>
                  <td className="text-right text-emerald-600 py-3 px-3 font-mono font-bold">
                    {(totals.totalUSD || Number(period?.total_usd) || 0) > 0
                      ? `${toKhmerDigits(totals.totalUSD || Number(period?.total_usd) || 0)} $`
                      : "-"}
                  </td>
                  <td className="text-right text-blue-600 py-3 px-3 font-mono font-bold">
                    {(totals.totalKHR || Number(period?.total_khr) || 0) > 0
                      ? `${toKhmerDigits(totals.totalKHR || Number(period?.total_khr) || 0)} ៛`
                      : "-"}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Reusable Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          pageSizeOptions={[25, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="នាក់"
        />
      </div>
    </div>
  );
}

export default function SponsorItemPage() {
  return (
    <SponsorshipProvider>
      <SponsorItemContent />
    </SponsorshipProvider>
  );
}
