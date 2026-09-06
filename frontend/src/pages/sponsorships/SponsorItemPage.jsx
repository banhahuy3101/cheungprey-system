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
} from "react-icons/lu";
import { SponsorshipProvider, useSponsorships } from "../../context/SponsorshipContext";
import { sponsorshipAPI } from "../../api/sponsorship";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES, isAdmin } from "../../utils/permissions";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import { calculateSponsorshipTotals } from "../../utils/sponsorshipUtils";
import PageHeader from "../../components/PageHeader";
import "../../style/sponsorships.css";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function SponsorItemContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // URL parameter: e.g. /sponsorships/items/:id

  const {
    records,
    loading,
    filters,
    setFilters,
    deleteRecord,
    fetchSponsorships,
  } = useSponsorships();

  useEffect(() => {
    fetchSponsorships?.();
  }, [fetchSponsorships]);

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

  // Clean up any legacy localStorage periods
  useEffect(() => {
    try {
      localStorage.removeItem("cheungprey_custom_periods");
    } catch {
      // ignore
    }
  }, []);

  // Fetch the main sponsorship record by ID from the API (GET /sponsorships/:id)
  const decodedId = id ? decodeURIComponent(id) : null;
  const isUuidId = Boolean(decodedId && UUID_RE.test(decodedId));
  const [idRecord, setIdRecord] = useState(null);

  useEffect(() => {
    if (!isUuidId) return undefined;
    let cancelled = false;
    sponsorshipAPI
      .getByID(decodedId)
      .then((res) => {
        if (!cancelled) setIdRecord(res.data?.data || null);
      })
      .catch((err) => {
        console.warn("Sponsorship getByID warning:", err);
        if (!cancelled) setIdRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [decodedId, isUuidId]);

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

  // Determine active main sponsor: primary source is the record fetched by ID from the API
  const activeMainSponsor = useMemo(() => {
    if (!id) return null;
    const decodedId = decodeURIComponent(id);

    if (idRecord && String(idRecord.id) === String(decodedId)) {
      const pName =
        idRecord.record_period ||
        (idRecord.fiscal_year ? `ប្រចាំឆ្នាំ ${idRecord.fiscal_year}` : "ការឧបត្ថម្ភទូទៅ");
      return {
        id: idRecord.id,
        name: pName,
        year: String(idRecord.fiscal_year || new Date().getFullYear()),
        period_type: idRecord.period_type || "year",
        records: records.filter(
          (r) =>
            r.record_period === pName ||
            r.record_period === decodedId ||
            String(r.id) === String(decodedId) ||
            (!r.record_period && String(r.fiscal_year) === String(idRecord.fiscal_year))
        ),
      };
    }

    // Fallback: match against list records (non-UUID ids such as period name or index)
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
          records: records.filter(
            (r) =>
              r.record_period === pName ||
              r.record_period === decodedId ||
              String(r.id) === String(decodedId) ||
              (!r.record_period && String(r.fiscal_year) === String(directDbRecord.fiscal_year))
          ),
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
        records: records.filter(
          (r) =>
            r.record_period === decodedId ||
            r.record_period === String(id) ||
            String(r.id) === String(id)
        ),
      }
    );
  }, [id, idRecord, mainSponsors, records]);

  // Line items under this main sponsor
  const lineItems = useMemo(() => {
    let list = records;
    if (activeMainSponsor) {
      const pName = activeMainSponsor.name;
      const pYear = String(activeMainSponsor.year || "");
      const targetId = String(id || "").toLowerCase();
      const decodedTargetId = decodedId ? String(decodedId).toLowerCase() : "";
      const idRecPeriod = idRecord?.record_period || "";
      const idRecYear = idRecord?.fiscal_year ? String(idRecord.fiscal_year) : "";

      list = records.filter((r) => {
        const rPeriod = r.record_period || "";
        const rYear = String(r.fiscal_year || "");
        const rId = String(r.id || "").toLowerCase();

        // 1. Direct period name match
        if (rPeriod && rPeriod === pName) return true;
        // 2. Direct ID / UUID match as period or record
        if (rPeriod && (rPeriod.toLowerCase() === targetId || rPeriod.toLowerCase() === decodedTargetId)) return true;
        if (rId && (rId === targetId || rId === decodedTargetId)) return true;
        // 3. Match by idRecord's period
        if (rPeriod && idRecPeriod && rPeriod === idRecPeriod) return true;
        // 4. Fallback fiscal year matching if period is empty
        if (!rPeriod && pYear && rYear === pYear) return true;
        if (!rPeriod && idRecYear && rYear === idRecYear) return true;
        if (!rPeriod && pName && pName.includes(rYear)) return true;

        return false;
      });
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
  }, [records, activeMainSponsor, id, decodedId, idRecord, filters.search]);

  const totals = calculateSponsorshipTotals(lineItems);

  const openAppendixReport = () => {
    if (activeMainSponsor) {
      navigate(`/sponsorships/appendix?period=${encodeURIComponent(activeMainSponsor.name)}`);
    } else {
      navigate("/sponsorships/appendix");
    }
  };

  return (
    <div className="page sponsorship-page">
      {/* Standard Reusable PageHeader Component */}
      <PageHeader
        title={activeMainSponsor?.name || `តារាងឧបត្ថម្ភ #${id}`}
        subtitle="តារាងតាមដានការឧបត្ថម្ភថវិកា និងសម្ភារលម្អិត (៧ ជួរឈរផ្លូវការ)"
        showBack={() => navigate("/sponsorships")}
        backText="ត្រឡប់ទៅបញ្ជីតារាងមេ"
        breadcrumbs={[
          { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
          { label: "ការឧបត្ថម្ភ", path: "/sponsorships" },
          { label: activeMainSponsor?.name || `តារាងឧបត្ថម្ភ #${id}` },
        ]}
        badge={
          activeMainSponsor?.year ? (
            <span
              style={{
                fontSize: "0.8rem",
                background: "#f1f5f9",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                fontWeight: "600",
                color: "#334155",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <LuCalendar size={13} />
              <span>ឆ្នាំ {toKhmerDigits(activeMainSponsor.year)}</span>
            </span>
          ) : null
        }
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
                onClick={() => navigate(`/sponsorships/items/${id}/create`)}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
              >
                <LuPlus size={18} />
                <span>បញ្ចូលអ្នកឧបត្ថម្ភ</span>
              </button>
            )}
          </>
        }
      />

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

      <div className="card" style={{ overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: "5%", textAlign: "center" }}>ល.រ</th>
                <th style={{ width: "20%" }}>គោត្តនាម និង នាម</th>
                <th style={{ width: "18%" }}>សម្ភារ / ឯកតា</th>
                <th style={{ width: "11%", textAlign: "right" }}>ថវិកា - ដុល្លារ</th>
                <th style={{ width: "11%", textAlign: "right" }}>ថវិកា - រៀល</th>
                <th style={{ width: "17%" }}>ទីកន្លែងទទួល និង ប្រើប្រាស់</th>
                <th style={{ width: "11%" }}>ផ្សេងៗ (Remarks)</th>
                <th style={{ width: "7%", textAlign: "center" }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>កំពុងផ្ទុកទិន្នន័យពីមូលដ្ឋានទិន្នន័យ (DB)...</span>
                    </div>
                  </td>
                </tr>
              ) : lineItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
                    <div style={{ maxWidth: "340px", margin: "0 auto" }}>
                      <p style={{ fontWeight: "600", fontSize: "1rem", color: "#475569", marginBottom: "0.35rem" }}>
                        មិនទាន់មានទិន្នន័យអ្នកឧបត្ថម្ភ
                      </p>
                      <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                        សូមចុចប៊ូតុង &quot;បញ្ចូលអ្នកឧបត្ថម្ភ&quot; ដើម្បីបញ្ចូលទិន្នន័យចូលក្នុងតារាងនេះ។
                      </p>
                      {canCreate && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/sponsorships/items/${id}/create`)}
                        >
                          + បញ្ចូលអ្នកឧបត្ថម្ភដំបូង
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                lineItems.map((r, index) => {
                  const itemsList = r.items || r.in_kind_items || [];
                  const rowNo = r.entry_no || r.record_id || index + 1;
                  const usdVal = Number(r.amount_usd) || Number(r.currency_usd) || 0;
                  const khrVal = Number(r.amount_khr) || Number(r.currency_khr) || 0;

                  return (
                    <tr key={r.id || index}>
                      <td style={{ textAlign: "center", fontWeight: "600", verticalAlign: "top" }}>
                        {toKhmerDigits(rowNo)}
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>
                          {r.contributor_name || r.donor_name}
                        </div>
                        {r.representatives && (
                          <div style={{ fontSize: "0.8rem", color: "#4f46e5", marginTop: "0.2rem" }}>
                            {r.representatives}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        {itemsList.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            {itemsList.map((it, itIdx) => (
                              <div
                                key={itIdx}
                                style={{
                                  fontSize: "0.88rem",
                                  color: "#334155",
                                }}
                              >
                                • {it.item_name} : <strong>{toKhmerDigits(it.item_qty)} {it.item_unit}</strong>
                              </div>
                            ))}
                          </div>
                        ) : r.expense_label || r.is_expense_total ? (
                          <span style={{ color: "#b91c1c", fontWeight: "600", fontSize: "0.85rem" }}>
                            {r.expense_label || "សរុបការចំណាយ"}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#059669", verticalAlign: "top" }}>
                        {usdVal > 0 ? `${toKhmerDigits(usdVal)} $` : "-"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "#2563eb", verticalAlign: "top" }}>
                        {khrVal > 0 ? `${toKhmerDigits(khrVal)} ៛` : "-"}
                      </td>
                      <td style={{ verticalAlign: "top", fontSize: "0.85rem", color: "#334155", whiteSpace: "pre-line" }}>
                        {r.usage_description || (itemsList || []).map((it) => it.usage_description).filter(Boolean).join("\n") || r.allocation_purpose || "-"}
                      </td>
                      <td style={{ verticalAlign: "top", fontSize: "0.85rem", color: "#64748b", fontStyle: "italic", whiteSpace: "pre-line" }}>
                        {r.remarks || (itemsList || []).map((it) => it.remarks).filter(Boolean).join(", ") || "-"}
                      </td>
                      <td style={{ textAlign: "center", verticalAlign: "top" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                          {canEdit && (
                            <button
                              type="button"
                              className="btn-icon text-primary"
                              onClick={() => navigate(`/sponsorships/items/${id}/edit/${r.id}`)}
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
                    សរុបរួម ({activeMainSponsor?.name})
                  </td>
                  <td style={{ textAlign: "right", color: "#059669", fontSize: "1rem", padding: "0.75rem" }}>
                    {toKhmerDigits(totals.totalUSD)} $
                  </td>
                  <td style={{ textAlign: "right", color: "#2563eb", fontSize: "1rem", padding: "0.75rem" }}>
                    {toKhmerDigits(totals.totalKHR)} ៛
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
