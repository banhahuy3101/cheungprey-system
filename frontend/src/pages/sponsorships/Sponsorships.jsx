import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuPlus,
  LuPrinter,
  LuDollarSign,
  LuPackage,
  LuPencil,
  LuTrash2,
  LuSearch,
  LuArrowLeft,
  LuFolderOpen,
  LuEye,
} from "react-icons/lu";
import { SponsorshipProvider, useSponsorships } from "../../context/SponsorshipContext";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES, isAdmin } from "../../utils/permissions";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import { calculateSponsorshipTotals, PERIOD_TYPE_MAP } from "../../utils/sponsorshipUtils";
import PageHeader from "../../components/PageHeader";
import SponsorshipForm from "./SponsorshipForm";
import MainSponsorshipModal from "./MainSponsorshipModal";
import "../../style/sponsorships.css";

function SponsorshipsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // URL parameter: e.g. /sponsorships/1 or /sponsorships/period-name

  const {
    records,
    loading,
    filters,
    setFilters,
    openCreateModal,
    openEditModal,
    deleteRecord,
    createRecord,
  } = useSponsorships();

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
  const canDelete = canAccess(user, FEATURES.sponsorships_delete) || canAccess(user, FEATURES.users) || isAdmin(user);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Clean up any legacy localStorage periods
  useEffect(() => {
    try {
      localStorage.removeItem("cheungprey_custom_periods");
    } catch {
      // ignore
    }
  }, []);

  // Group database records dynamically from API records ONLY
  const mainSponsors = useMemo(() => {
    const periodMap = new Map();

    records.forEach((r) => {
      const periodName = r.record_period || (r.fiscal_year ? `ប្រចាំឆ្នាំ ${r.fiscal_year}` : "ការឧបត្ថម្ភទូទៅ");
      if (!periodMap.has(periodName)) {
        periodMap.set(periodName, {
          id: r.id, // Purely from API DB UUID
          name: periodName,
          year: String(r.fiscal_year || new Date().getFullYear()),
          period_type: r.period_type || "year",
          records: [],
        });
      }
      periodMap.get(periodName).records.push(r);
    });

    return Array.from(periodMap.values());
  }, [records]);

  // Determine active main sponsor from URL :id (supports DB UUID, period name, or index from API)
  const activeMainSponsor = useMemo(() => {
    if (!id) return null;
    const decodedId = decodeURIComponent(id);

    // Check direct DB record ID match from API
    const directDbRecord = records.find((r) => String(r.id) === String(id) || String(r.id) === decodedId);
    if (directDbRecord) {
      const pName = directDbRecord.record_period || (directDbRecord.fiscal_year ? `ប្រចាំឆ្នាំ ${directDbRecord.fiscal_year}` : "ការឧបត្ថម្ភទូទៅ");
      return (
        mainSponsors.find((m) => m.name === pName) || {
          id: directDbRecord.id,
          name: pName,
          year: String(directDbRecord.fiscal_year || new Date().getFullYear()),
          period_type: directDbRecord.period_type || "year",
          records: records.filter((r) => r.record_period === pName || (!r.record_period && String(r.fiscal_year) === String(directDbRecord.fiscal_year))),
        }
      );
    }

    return (
      mainSponsors.find((m) => String(m.id) === String(id) || m.name === decodedId) ||
      (Number(id) > 0 && Number(id) <= mainSponsors.length ? mainSponsors[Number(id) - 1] : null) ||
      {
        id: id,
        name: decodedId,
        year: String(new Date().getFullYear()),
        period_type: "custom",
        records: records.filter((r) => r.record_period === decodedId || String(r.id) === String(id)),
      }
    );
  }, [id, mainSponsors, records]);

  // Create a new Main Sponsor period via backend API
  const handleCreateMainSponsor = async (newMain) => {
    try {
      const created = await createRecord({
        record_period: newMain.name,
        fiscal_year: Number(newMain.year) || new Date().getFullYear(),
        contributor_name: "ការឧបត្ថម្ភ",
        entry_classification: "sponsorship",
        section_group: "ទូទៅ",
        amount_usd: 0,
        amount_khr: 0,
        usage_description: "",
        items: [],
      });
      if (created?.id) {
        navigate(`/sponsorships/items/${created.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Line items under the active main sponsor
  const lineItems = useMemo(() => {
    let list = records;
    if (activeMainSponsor) {
      list = records.filter(
        (r) =>
          r.record_period === activeMainSponsor.name ||
          (!r.record_period && activeMainSponsor.name.includes(String(r.fiscal_year)))
      );
    }

    if (!filters.search) return list;
    const term = filters.search.toLowerCase();
    return list.filter((r) => {
      const name = (r.contributor_name || r.donor_name || "").toLowerCase();
      const rep = (r.representatives || "").toLowerCase();
      const usage = (r.usage_description || r.allocation_purpose || "").toLowerCase();
      const remarks = (r.remarks || "").toLowerCase();
      const itemsText = (r.items || []).map((it) => it.item_name).join(" ").toLowerCase();
      return (
        name.includes(term) ||
        rep.includes(term) ||
        usage.includes(term) ||
        remarks.includes(term) ||
        itemsText.includes(term)
      );
    });
  }, [records, activeMainSponsor, filters.search]);

  const totals = calculateSponsorshipTotals(lineItems);

  const openAppendixReport = () => {
    if (activeMainSponsor) {
      navigate(`/sponsorships/appendix?period=${encodeURIComponent(activeMainSponsor.name)}`);
    } else {
      navigate("/sponsorships/appendix");
    }
  };

  // Helper to compute stats for a single main sponsor row from DB records
  const getMainSponsorStats = (periodName) => {
    const periodRecords = records.filter((r) => r.record_period === periodName);
    const periodTotals = calculateSponsorshipTotals(periodRecords);
    return {
      totalUSD: periodTotals.totalUSD,
      totalKHR: periodTotals.totalKHR,
      count: periodRecords.length,
    };
  };

  return (
    <div className="page sponsorship-page">
      {/* ============================================================ */}
      {/* SCREEN 1: ALL MAIN SPONSORSHIPS TABLE LIST (/sponsorships) */}
      {/* ============================================================ */}
      {!activeMainSponsor ? (
        <>
          {/* Reusable PageHeader Component */}
          <PageHeader
            title="តារាងឧបត្ថម្ភមេ (Main Sponsorships)"
            subtitle="ទិន្នន័យពីមូលដ្ឋានទិន្នន័យ (DB) តាម ខែ (Month), ឆមាស (Semester) ឬ ឆ្នាំ (Year)"
            breadcrumbs={[
              { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
              { label: "ការឧបត្ថម្ភ" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openAppendixReport}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <LuPrinter size={16} />
                  <span>បោះពុម្ពតារាងរួម (Print All)</span>
                </button>

                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCreateModalOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
                  >
                    <LuPlus size={18} />
                    <span>+ បង្កើតតារាងឧបត្ថម្ភមេ</span>
                  </button>
                )}
              </>
            }
          />

          {/* Master Table of Main Sponsors from DB */}
          <div className="card" style={{ overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ width: "6%", textAlign: "center" }}>ល.រ</th>
                    <th style={{ width: "32%" }}>ឈ្មោះតារាងឧបត្ថម្ភមេ (Main Sponsor Period)</th>
                    <th style={{ width: "14%" }}>ប្រភេទកាលបរិច្ឆេទ</th>
                    <th style={{ width: "16%", textAlign: "right" }}>ថវិកាសរុប ($ USD)</th>
                    <th style={{ width: "16%", textAlign: "right" }}>ថវិកាសរុប (៛ KHR)</th>
                    <th style={{ width: "8%", textAlign: "center" }}>ចំនួនអ្នកឧបត្ថម្ភ</th>
                    <th style={{ width: "8%", textAlign: "center" }}>សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        កំពុងទាញយកទិន្នន័យពីមូលដ្ឋានទិន្នន័យ (Database)...
                      </td>
                    </tr>
                  ) : mainSponsors.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        មិនទាន់មានទិន្នន័យក្នុងមូលដ្ឋានទិន្នន័យ (DB) នៅឡើយទេ (ចុច &quot;+ បង្កើតតារាងឧបត្ថម្ភមេ&quot; ដើម្បីចាប់ផ្តើម)
                      </td>
                    </tr>
                  ) : (
                    mainSponsors.map((m, idx) => {
                      const stats = getMainSponsorStats(m.name);
                      const displayId = m.id || String(idx + 1);
                      const typeLabel = PERIOD_TYPE_MAP[m.period_type] || m.period_type || "ប្រចាំឆ្នាំ";

                      return (
                        <tr
                          key={m.name || idx}
                          onClick={() => navigate(`/sponsorships/items/${displayId}`)}
                          style={{ cursor: "pointer" }}
                          className="hover-row"
                        >
                          <td style={{ textAlign: "center", fontWeight: "600" }}>
                            {toKhmerDigits(displayId)}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <LuFolderOpen size={18} color="#2563eb" />
                              <span style={{ fontWeight: "700", color: "#1e3a8a", fontSize: "0.95rem" }}>
                                {m.name}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#475569" }}>
                              {typeLabel}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#059669" }}>
                            {stats.totalUSD > 0 ? `${toKhmerDigits(stats.totalUSD)} $` : "-"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#2563eb" }}>
                            {stats.totalKHR > 0 ? `${toKhmerDigits(stats.totalKHR)} ៛` : "-"}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "600" }}>
                            {toKhmerDigits(stats.count)} នាក់
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sponsorships/items/${displayId}`);
                              }}
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                            >
                              <LuEye size={13} />
                              <span>បើកមើល</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================ */
        /* SCREEN 2: DETAIL VIEW 7-COLUMN TABLE (/sponsorships/:id)     */
        /* ============================================================ */
        <>
          {/* Reusable PageHeader Component */}
          <PageHeader
            title={activeMainSponsor.name}
            subtitle="តារាងតាមដានការឧបត្ថម្ភថវិកា និងសម្ភារលម្អិត"
            showBack={() => navigate("/sponsorships")}
            backText="ត្រឡប់ទៅបញ្ជីតារាងមេ"
            breadcrumbs={[
              { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
              { label: "ការឧបត្ថម្ភ", path: "/sponsorships" },
              { label: activeMainSponsor.name },
            ]}
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openAppendixReport}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <LuPrinter size={16} />
                  <span>បោះពុម្ពតារាង (Print)</span>
                </button>

                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCreateModal}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
                  >
                    <LuPlus size={18} />
                    <span>+ បញ្ចូលអ្នកឧបត្ថម្ភ</span>
                  </button>
                )}
              </>
            }
          />

          {/* KPI Summary for this Main Sponsor */}
          <div className="sponsorship-kpi-grid">
            <div className="sponsorship-kpi-card">
              <div className="sponsorship-kpi-icon usd">
                <LuDollarSign />
              </div>
              <div>
                <span className="sponsorship-kpi-value">
                  {toKhmerDigits(totals.totalUSD)} $
                </span>
                <span className="sponsorship-kpi-label">ថវិកាសរុបជាប្រាក់ដុល្លារ (USD)</span>
              </div>
            </div>

            <div className="sponsorship-kpi-card">
              <div className="sponsorship-kpi-icon khr">
                <span>៛</span>
              </div>
              <div>
                <span className="sponsorship-kpi-value">
                  {toKhmerDigits(totals.totalKHR)} ៛
                </span>
                <span className="sponsorship-kpi-label">ថវិកាសរុបជាប្រាក់រៀល (KHR)</span>
              </div>
            </div>

            <div className="sponsorship-kpi-card">
              <div className="sponsorship-kpi-icon material">
                <LuPackage />
              </div>
              <div>
                <span className="sponsorship-kpi-value">
                  {toKhmerDigits(totals.totalRecords)} នាក់
                </span>
                <span className="sponsorship-kpi-label">ចំនួនអ្នកឧបត្ថម្ភសរុប</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="sponsorship-filters-card" style={{ padding: "0.75rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuSearch size={18} color="#64748b" />
              <input
                type="text"
                className="form-control"
                placeholder="ស្វែងរកតាមឈ្មោះអ្នកឧបត្ថម្ភ, តាមរយៈ, សម្ភារ, ទីកន្លែងទទួល..."
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ border: "none", boxShadow: "none", padding: "0.35rem 0.5rem" }}
              />
              {filters.search && (
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => setFilters({ ...filters, search: "" })}
                >
                  សម្អាត
                </button>
              )}
            </div>
          </div>

          {/* 7-Column Master-Detail Data Table */}
          <div className="card" style={{ overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ width: "5%", textAlign: "center" }}>ល.រ</th>
                    <th style={{ width: "23%" }}>គោត្តនាម និង នាម</th>
                    <th style={{ width: "20%" }}>សម្ភារ / ឯកតា</th>
                    <th style={{ width: "12%", textAlign: "right" }}>ថវិកា - ដុល្លារ</th>
                    <th style={{ width: "12%", textAlign: "right" }}>ថវិកា - រៀល</th>
                    <th style={{ width: "20%" }}>ទីកន្លែងទទួល និង ប្រើប្រាស់</th>
                    <th style={{ width: "8%", textAlign: "center" }}>សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>កំពុងផ្ទុកទិន្នន័យពីមូលដ្ឋានទិន្នន័យ (DB)...</span>
                        </div>
                      </td>
                    </tr>
                  ) : lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                        <div>មិនទាន់មានទិន្នន័យអ្នកឧបត្ថម្ភក្នុង &quot;{activeMainSponsor.name}&quot; នៅឡើយទេ</div>
                        {canCreate && (
                          <div style={{ marginTop: "1rem" }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={openCreateModal}
                            >
                              + បញ្ចូលអ្នកឧបត្ថម្ភដំបូង
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((r, idx) => {
                      const itemsList = r.items || r.in_kind_items || [];
                      const usdVal = Number(r.amount_usd) || Number(r.currency_usd) || 0;
                      const khrVal = Number(r.amount_khr) || Number(r.currency_khr) || 0;

                      return (
                        <tr key={r.id || idx}>
                          {/* Col 1: ល.រ (Sequential Row Number) */}
                          <td style={{ textAlign: "center", fontWeight: "600", verticalAlign: "top" }}>
                            {toKhmerDigits(r.entry_no || idx + 1)}
                          </td>

                          {/* Col 2: គោត្តនាម និង នាម (Honorific & Full Name including representative) */}
                          <td style={{ verticalAlign: "top" }}>
                            <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>
                              {r.contributor_name || r.donor_name}
                            </div>
                            {r.representatives && (
                              <div style={{ fontSize: "0.8rem", color: "#4f46e5", marginTop: "0.2rem" }}>
                                {r.representatives}
                              </div>
                            )}
                            {r.remarks && (
                              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem", fontStyle: "italic" }}>
                                ផ្សេងៗ ៖ {r.remarks}
                              </div>
                            )}
                          </td>

                          {/* Col 3: សម្ភារ / ឯកតា (Material Description and Unit Count) */}
                          <td style={{ verticalAlign: "top" }}>
                            {itemsList.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                {itemsList.map((it, itIdx) => (
                                  <div
                                    key={itIdx}
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "#334155",
                                    }}
                                  >
                                    • {it.item_name} : <strong>{toKhmerDigits(it.item_qty)} {it.item_unit}</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>-</span>
                            )}
                          </td>

                          {/* Col 4: ថវិកា - ដុល្លារ (Amount in USD) */}
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#059669", verticalAlign: "top" }}>
                            {usdVal > 0 ? `${toKhmerDigits(usdVal)} $` : "-"}
                          </td>

                          {/* Col 5: ថវិកា - រៀល (Amount in KHR) */}
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#2563eb", verticalAlign: "top" }}>
                            {khrVal > 0 ? `${toKhmerDigits(khrVal)} ៛` : "-"}
                          </td>

                          {/* Col 6: ទីកន្លែងទទួល និង ប្រើប្រាស់ (Structured text) */}
                          <td style={{ verticalAlign: "top", fontSize: "0.85rem", color: "#334155", whiteSpace: "pre-line" }}>
                            {r.usage_description || r.allocation_purpose || "-"}
                          </td>

                          {/* Col 7: សកម្មភាព (Actions) */}
                          <td style={{ textAlign: "center", verticalAlign: "top" }}>
                            <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="btn-icon text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(r);
                                  }}
                                  title="កែប្រែ"
                                >
                                  <LuPencil size={15} />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn-icon text-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteRecord(r.id);
                                  }}
                                  title="លុប"
                                >
                                  <LuTrash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Grand Total Bottom Footer */}
                {!loading && lineItems.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", fontWeight: "700", borderTop: "2px solid #cbd5e1" }}>
                      <td colSpan={3} style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.95rem" }}>
                        សរុបរួម ({activeMainSponsor.name})
                      </td>
                      <td style={{ textAlign: "right", color: "#059669", fontSize: "1rem", padding: "0.75rem" }}>
                        {toKhmerDigits(totals.totalUSD)} $
                      </td>
                      <td style={{ textAlign: "right", color: "#2563eb", fontSize: "1rem", padding: "0.75rem" }}>
                        {toKhmerDigits(totals.totalKHR)} ៛
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* Main Sponsorship Creation Modal */}
      <MainSponsorshipModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreateMainSponsor}
      />

      {/* Sponsor Line-Item Entry Modal */}
      <SponsorshipForm
        currentPeriod={activeMainSponsor}
        availablePeriods={mainSponsors}
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
