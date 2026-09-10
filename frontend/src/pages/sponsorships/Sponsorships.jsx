import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuPlus,
  LuPrinter,
  LuFolderOpen,
  LuEye,
  LuTrash2,
  LuCalendar,
  LuDollarSign,
  LuUsers,
  LuPackage,
} from "react-icons/lu";
import { SponsorshipProvider, useSponsorships } from "../../context/SponsorshipContext";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES, isAdmin } from "../../utils/permissions";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import { PERIOD_TYPE_MAP } from "../../utils/sponsorshipUtils";
import PageHeader from "../../components/PageHeader";
import MainSponsorshipModal from "./MainSponsorshipModal";
import "../../style/sponsorships.css";

function SponsorshipsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    periods,
    periodsLoading,
    fetchPeriods,
    deletePeriod,
  } = useSponsorships();

  const canCreate =
    canAccess(user, FEATURES.sponsorships_create) ||
    canAccess(user, FEATURES.sponsorships, "create") ||
    canAccess(user, FEATURES.sponsorships) ||
    isAdmin(user);
  const canDelete =
    canAccess(user, FEATURES.sponsorships_delete) ||
    canAccess(user, FEATURES.users) ||
    isAdmin(user);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // Summary stats across all periods
  const totalStats = useMemo(() => {
    let usd = 0;
    let khr = 0;
    let totalRecs = 0;
    let totalItems = 0;

    periods.forEach((p) => {
      usd += p.total_usd || 0;
      khr += p.total_khr || 0;
      totalRecs += p.records_count || 0;
      totalItems += p.items_count || 0;
    });

    return { usd, khr, totalRecs, totalItems, periodsCount: periods.length };
  }, [periods]);

  const handlePeriodCreated = (newPeriod) => {
    if (newPeriod?.id) {
      navigate(`/sponsorships/items/${newPeriod.id}`);
    }
  };

  return (
    <div className="page sponsorship-page">
      {/* Page Header */}
      <PageHeader
        title="តារាងឧបត្ថម្ភមេ (Sponsorship Periods)"
        subtitle="គ្រប់គ្រងកាលបរិច្ឆេទឧបត្ថម្ភតាម ខែ (Month), ឆមាស (Semester) ឬ ឆ្នាំ (Year)"
        breadcrumbs={[
          { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
          { label: "ការឧបត្ថម្ភ" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary flex items-center gap-1.5 font-medium"
              onClick={() => navigate("/sponsorships/appendix")}
            >
              <LuPrinter size={16} />
              <span>បោះពុម្ពតារាងរួម (Print All)</span>
            </button>

            {canCreate && (
              <button
                type="button"
                className="btn btn-primary flex items-center gap-1.5 font-semibold"
                onClick={() => setCreateModalOpen(true)}
              >
                <LuPlus size={18} />
                <span>បង្កើតតារាងឧបត្ថម្ភមេ</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI / Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-l-blue-600 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              តារាងមេសរុប (Periods)
            </span>
            <LuCalendar size={20} className="text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 mt-2">
            {toKhmerDigits(totalStats.periodsCount)} តារាង
          </div>
        </div>

        <div className="card p-4 border-l-4 border-l-emerald-600 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ថវិកាសរុបជាដុល្លារ ($ USD)
            </span>
            <LuDollarSign size={20} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {toKhmerDigits(totalStats.usd)} $
          </div>
        </div>

        <div className="card p-4 border-l-4 border-l-purple-600 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ថវិកាសរុបជារៀល (៛ KHR)
            </span>
            <LuDollarSign size={20} className="text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 mt-2">
            {toKhmerDigits(totalStats.khr)} ៛
          </div>
        </div>

        <div className="card p-4 border-l-4 border-l-amber-600 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              អ្នកឧបត្ថម្ភសរុប (Donors)
            </span>
            <LuUsers size={20} className="text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">
            {toKhmerDigits(totalStats.totalRecs)} នាក់
          </div>
        </div>
      </div>

      {/* Master Table of Sponsorship Periods */}
      <div className="card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="table-responsive">
          <table className="table m-0 w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold uppercase">
                <th className="w-[5%] text-center py-3 px-3">ល.រ</th>
                <th className="w-[32%] py-3 px-3">ឈ្មោះតារាងឧបត្ថម្ភមេ (Sponsorship Period)</th>
                <th className="w-[12%] py-3 px-3">ប្រភេទកាលបរិច្ឆេទ</th>
                <th className="w-[10%] text-center py-3 px-3">ឆ្នាំ (Year)</th>
                <th className="w-[15%] text-right py-3 px-3">ថវិកាសរុប ($ USD)</th>
                <th className="w-[15%] text-right py-3 px-3">ថវិកាសរុប (៛ KHR)</th>
                <th className="w-[8%] text-center py-3 px-3">អ្នកឧបត្ថម្ភ</th>
                <th className="w-[11%] text-center py-3 px-3">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodsLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    កំពុងទាញយកទិន្នន័យពីមូលដ្ឋានទិន្នន័យ (Database)...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <div className="mb-2 text-base font-semibold text-slate-700">
                      មិនទាន់មានតារាងឧបត្ថម្ភមេនៅឡើយទេ
                    </div>
                    <p className="m-0 text-sm text-slate-500">
                      ចុចប៊ូតុង &quot;+ បង្កើតតារាងឧបត្ថម្ភមេ&quot; ខាងលើ ដើម្បីបង្កើតកាលបរិច្ឆេទថ្មី (ខែ, ឆមាស ឬ ឆ្នាំ)។
                    </p>
                  </td>
                </tr>
              ) : (
                periods.map((p, idx) => {
                  const typeLabel = PERIOD_TYPE_MAP[p.period_type] || p.period_type || "ប្រចាំឆ្នាំ";

                  return (
                    <tr
                      key={p.id || idx}
                      onClick={() => navigate(`/sponsorships/items/${p.id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="text-center font-bold text-slate-700 py-3 px-3">
                        {toKhmerDigits(idx + 1)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <LuFolderOpen size={18} className="text-blue-600 shrink-0" />
                          <span className="font-semibold text-indigo-900 text-sm hover:underline">
                            {p.period_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {typeLabel}
                        </span>
                      </td>
                      <td className="text-center font-medium text-slate-700 py-3 px-3">
                        {toKhmerDigits(p.fiscal_year, false)}
                      </td>
                      <td className="text-right font-bold text-emerald-600 py-3 px-3 font-mono">
                        {(p.total_usd || 0) > 0
                          ? `${toKhmerDigits(p.total_usd)} $`
                          : "-"}
                      </td>
                      <td className="text-right font-bold text-blue-600 py-3 px-3 font-mono">
                        {(p.total_khr || 0) > 0
                          ? `${toKhmerDigits(p.total_khr)} ៛`
                          : "-"}
                      </td>
                      <td className="text-center font-bold text-slate-700 py-3 px-3">
                        {toKhmerDigits(p.records_count || 0)} នាក់
                      </td>
                      <td className="text-center py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary p-1.5 rounded"
                            onClick={() => navigate(`/sponsorships/items/${p.id}`)}
                            title="បើកមើលអ្នកឧបត្ថម្ភ"
                            aria-label="បើកមើល"
                          >
                            <LuEye size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary p-1.5 rounded hover:bg-slate-200"
                            onClick={() => navigate(`/sponsorships/appendix?period_id=${p.id}&period=${encodeURIComponent(p.period_name)}`)}
                            title="បោះពុម្ពតារាងឧបសម្ព័ន្ធ"
                            aria-label="បោះពុម្ព"
                          >
                            <LuPrinter size={14} />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-1.5 rounded"
                              onClick={() => deletePeriod(p.id)}
                              title="លុបតារាងមេ"
                              aria-label="លុប"
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
          </table>
        </div>
      </div>

      {/* Main Sponsorship Creation Modal (Level 1) */}
      <MainSponsorshipModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handlePeriodCreated}
      />
    </div>
  );
}

export default function Sponsorships() {
  return (
    <SponsorshipProvider>
      <SponsorshipsContent />
    </SponsorshipProvider>
  );
}
