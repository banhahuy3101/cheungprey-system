import { useNavigate } from "react-router-dom";
import {
  LuPlus,
  LuPrinter,
  LuDollarSign,
  LuPackage,
  LuClock,
  LuCheck,
  LuPencil,
  LuTrash2,
  LuSend,
  LuShieldCheck,
  LuRotateCcw,
  LuLayers,
} from "react-icons/lu";
import { SponsorshipProvider, useSponsorships } from "../../context/SponsorshipContext";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import {
  COMMON_SECTIONS,
  COMMON_PERIODS,
  COMMON_COMMUNES,
  STATUS_OPTIONS,
  STATUS_MAP,
  ENTRY_CLASSIFICATIONS,
  CLASSIFICATION_MAP,
  groupSponsorshipsBySection,
} from "../../utils/sponsorshipUtils";
import SponsorshipForm from "./SponsorshipForm";
import "../../style/sponsorships.css";

function SponsorshipsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    records,
    summary,
    loading,
    filters,
    setFilters,
    openCreateModal,
    openEditModal,
    deleteRecord,
    submitRecord,
    reviewRecord,
    approveRecord,
  } = useSponsorships();

  const canCreate = canAccess(user, FEATURES.sponsorships_create) || canAccess(user, FEATURES.sponsorships, "create");
  const canReview = canAccess(user, FEATURES.sponsorships_review) || canAccess(user, FEATURES.users);
  const canApprove = canAccess(user, FEATURES.sponsorships_approve) || canAccess(user, FEATURES.users);
  const canDelete = canAccess(user, FEATURES.sponsorships_delete) || canAccess(user, FEATURES.users);

  const handleReviewAction = (id, action) => {
    const notes = window.prompt(
      action === "return"
        ? "បញ្ចូលមូលហេតុនៃការបង្វែរមកវិញ (Return notes):"
        : "ចំណាំបន្ថែមសម្រាប់ការពិនិត្យ (Review notes - ស្រេចចិត្ត):"
    );
    if (action === "return" && notes === null) return;
    reviewRecord(id, action, notes || "");
  };

  const handleApproveAction = (id) => {
    const notes = window.prompt("ចំណាំការអនុម័ត (Approval notes - ស្រេចចិត្ត):");
    if (notes === null) return;
    approveRecord(id, notes || "");
  };

  const groupedSections = groupSponsorshipsBySection(records);

  const openAppendixReport = () => {
    const query = new URLSearchParams();
    if (filters.record_period && filters.record_period !== "ទាំងអស់ (All)") {
      query.set("period", filters.record_period);
    }
    if (filters.section_group && filters.section_group !== "ទាំងអស់ (All)") {
      query.set("section", filters.section_group);
    }
    if (filters.target_location && filters.target_location !== "ទាំងអស់ (All)") {
      query.set("location", filters.target_location);
    }
    navigate(`/sponsorships/appendix?${query.toString()}`);
  };

  return (
    <div className="sponsorship-page">
      {/* Hero Header */}
      <div className="sponsorship-hero">
        <div>
          <h2 className="sponsorship-hero-title">តារាងឧបសម្ព័ន្ធ ថវិកា សម្ភារ</h2>
          <p className="sponsorship-hero-sub">
            ប្រព័ន្ធគ្រប់គ្រង និងបូកសរុបការឧបត្ថម្ភថវិកា (USD & KHR) និងសម្ភាររបស់ថ្នាក់ដឹកនាំ និងសប្បុរសជន
          </p>
        </div>

        <div className="sponsorship-hero-actions">
          <button
            type="button"
            className="btn btn-light"
            onClick={openAppendixReport}
            style={{
              background: "#ffffff",
              color: "#1e3a8a",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              border: "none",
            }}
          >
            <LuPrinter size={16} />
            <span>បោះពុម្ពតារាងឧបសម្ព័ន្ធ (Appendix)</span>
          </button>

          {canCreate && (
            <button
              type="button"
              className="btn btn-success"
              onClick={openCreateModal}
              style={{
                background: "#10b981",
                border: "none",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <LuPlus size={18} />
              <span>+ បញ្ចូលកំណត់ត្រាថ្មី</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div className="sponsorship-kpi-grid">
          <div className="sponsorship-kpi-card">
            <div className="sponsorship-kpi-icon usd">
              <LuDollarSign />
            </div>
            <div>
              <span className="sponsorship-kpi-value">
                {toKhmerDigits(summary.total_usd)} $
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
                {toKhmerDigits(summary.total_khr)} ៛
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
                {toKhmerDigits(summary.inventory_rollup?.length || 0)} មុខ
              </span>
              <span className="sponsorship-kpi-label">មុខសម្ភារឧបត្ថម្ភសរុប (In-Kind)</span>
            </div>
          </div>

          <div className="sponsorship-kpi-card">
            <div className="sponsorship-kpi-icon pending">
              <LuClock />
            </div>
            <div>
              <span className="sponsorship-kpi-value">
                {toKhmerDigits(summary.pending_review || 0)}
              </span>
              <span className="sponsorship-kpi-label">រង់ចាំការពិនិត្យ / អនុម័ត</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="sponsorship-filters-card">
        <div className="sponsorship-filters-grid">
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600" }}>
              ក្រុមឧបត្ថម្ភ (Header Section)
            </label>
            <select
              className="form-control form-control-sm"
              value={filters.section_group}
              onChange={(e) => setFilters({ ...filters, section_group: e.target.value })}
            >
              {COMMON_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600" }}>
              កាលបរិច្ឆេទ / ខែ (Period)
            </label>
            <select
              className="form-control form-control-sm"
              value={filters.record_period}
              onChange={(e) => setFilters({ ...filters, record_period: e.target.value })}
            >
              {COMMON_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600" }}>
              ឃុំ / ទីតាំងគោលដៅ
            </label>
            <select
              className="form-control form-control-sm"
              value={filters.target_location}
              onChange={(e) => setFilters({ ...filters, target_location: e.target.value })}
            >
              {COMMON_COMMUNES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600" }}>
              ស្ថានភាព (Status)
            </label>
            <select
              className="form-control form-control-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600" }}>
              ស្វែងរក (Search)
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="ឈ្មោះ, ការប្រើប្រាស់, ទីតាំង..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Inventory Roll-up summary preview */}
      {summary?.inventory_rollup && summary.inventory_rollup.length > 0 && (
        <div className="inventory-rollup-card">
          <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <LuLayers />
            <span>សរុបមុខសម្ភារឧបត្ថម្ភ (Master Inventory Roll-Up)</span>
          </h4>
          <div className="inventory-rollup-grid">
            {summary.inventory_rollup.map((it, idx) => (
              <div key={idx} className="inventory-rollup-item">
                <span className="inventory-rollup-name">{it.item_name}</span>
                <span className="inventory-rollup-qty">
                  {toKhmerDigits(it.total_qty)} {it.item_unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabular Ledger Grouped by Leadership Section */}
      {loading ? (
        <div className="loading">កំពុងផ្ទុកទិន្នន័យ...</div>
      ) : Object.keys(groupedSections).length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          មិនមានទិន្នន័យឧបត្ថម្ភតាមលក្ខខណ្ឌស្វែងរកនេះទេ
        </div>
      ) : (
        Object.entries(groupedSections).map(([sectionTitle, secRecords]) => {
          const secUSD = secRecords.reduce((sum, r) => sum + (Number(r.amount_usd) || 0), 0);
          const secKHR = secRecords.reduce((sum, r) => sum + (Number(r.amount_khr) || 0), 0);

          return (
            <div key={sectionTitle} className="sponsorship-section-block">
              <div className="sponsorship-section-header">
                <h3 className="sponsorship-section-title">
                  <span>{sectionTitle}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "#64748b" }}>
                    ({toKhmerDigits(secRecords.length)} កំណត់ត្រា)
                  </span>
                </h3>

                <div className="sponsorship-section-subtotals">
                  {secUSD > 0 && (
                    <span className="subtotal-pill usd">
                      សរុប ៖ {toKhmerDigits(secUSD)} $
                    </span>
                  )}
                  {secKHR > 0 && (
                    <span className="subtotal-pill khr">
                      សរុប ៖ {toKhmerDigits(secKHR)} ៛
                    </span>
                  )}
                </div>
              </div>

              <div className="table-responsive">
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: "5%", textAlign: "center" }}>ល.រ</th>
                      <th style={{ width: "25%" }}>អ្នកឧបត្ថម្ភ និងកាលបរិច្ឆេទ</th>
                      <th style={{ width: "22%" }}>មុខសម្ភារ (In-Kind Goods)</th>
                      <th style={{ width: "12%", textAlign: "right" }}>ដុល្លារ ($)</th>
                      <th style={{ width: "12%", textAlign: "right" }}>រៀល (៛)</th>
                      <th style={{ width: "8%", textAlign: "center" }}>ស្ថានភាព</th>
                      <th style={{ width: "16%", textAlign: "center" }}>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secRecords.map((r, rIdx) => {
                      const statusInfo = STATUS_MAP[r.status] || STATUS_MAP.draft;
                      const classif = CLASSIFICATION_MAP[r.entry_classification] || CLASSIFICATION_MAP.donation;

                      return (
                        <tr key={r.id}>
                          <td style={{ textAlign: "center", fontWeight: "600" }}>
                            {toKhmerDigits(r.entry_no || rIdx + 1)}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>
                                {r.contributor_name || r.donor_name}
                              </span>
                              {r.fiscal_year && (
                                <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#475569", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: "600" }}>
                                  ឆ្នាំ {toKhmerDigits(r.fiscal_year)}
                                </span>
                              )}
                              {(r.entry_classification || r.category) && (
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "4px",
                                    background: classif.bg,
                                    color: classif.color,
                                    fontWeight: "600",
                                    border: `1px solid ${classif.color}33`,
                                  }}
                                >
                                  {classif.label}
                                </span>
                              )}
                            </div>
                            {r.representatives && (
                              <div style={{ fontSize: "0.78rem", color: "#4f46e5", fontWeight: "500", marginTop: "0.15rem" }}>
                                <strong>{r.representatives}</strong>
                              </div>
                            )}
                            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.15rem" }}>
                              {r.record_period} • <strong style={{ color: "#1e3a8a" }}>{r.target_location}</strong>
                            </div>
                            {(r.usage_description || r.allocation_purpose) && (
                              <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "0.25rem", fontStyle: "italic", whiteSpace: "pre-line" }}>
                                {r.usage_description || r.allocation_purpose}
                              </div>
                            )}
                            {r.remarks && (
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem", background: "#f8fafc", padding: "0.15rem 0.4rem", borderRadius: "4px", border: "1px dashed #cbd5e1" }}>
                                <strong>ផ្សេងៗ ៖</strong> {r.remarks}
                              </div>
                            )}
                          </td>
                          <td>
                            {r.items && r.items.length > 0 ? (
                              <div className="material-items-list">
                                {r.items.map((it, itIdx) => (
                                  <span key={itIdx} className="material-item-chip">
                                    <span>{it.item_name}</span>
                                    <span className="qty">
                                      {toKhmerDigits(it.item_qty)} {it.item_unit}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>
                                (ថវិកាសុទ្ធ)
                              </span>
                            )}
                          </td>
                          <td className="amount-cell amount-usd">
                            {r.amount_usd > 0 ? `${toKhmerDigits(r.amount_usd)} $` : "-"}
                          </td>
                          <td className="amount-cell amount-khr">
                            {r.amount_khr > 0 ? `${toKhmerDigits(r.amount_khr)} ៛` : "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={statusInfo.className}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                              {/* Submit Button for Draft or Returned */}
                              {(r.status === "draft" || r.status === "returned") && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={() => submitRecord(r.id)}
                                  title="ដាក់ស្នើពិនិត្យ"
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                >
                                  <LuSend size={13} />
                                </button>
                              )}

                              {/* Review Button for Submitted */}
                              {canReview && r.status === "submitted" && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleReviewAction(r.id, "review")}
                                    title="ពិនិត្យ និងយល់ព្រម"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    <LuCheck size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning"
                                    onClick={() => handleReviewAction(r.id, "return")}
                                    title="បង្វែរទៅកែសម្រួលវិញ"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    <LuRotateCcw size={13} />
                                  </button>
                                </>
                              )}

                              {/* Final Approve Button for Reviewed or Submitted */}
                              {canApprove && (r.status === "reviewed" || r.status === "submitted") && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleApproveAction(r.id)}
                                  title="អនុម័ត និងចាក់សោ (Approve & Lock)"
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "#047857" }}
                                >
                                  <LuShieldCheck size={14} />
                                </button>
                              )}

                              {/* Edit Button (Enabled if not approved or user is admin) */}
                              {(r.status !== "approved" || canApprove) && (
                                <button
                                  type="button"
                                  className="btn-icon text-primary"
                                  onClick={() => openEditModal(r)}
                                  title="កែប្រែ"
                                >
                                  <LuPencil size={16} />
                                </button>
                              )}

                              {/* Delete Button */}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn-icon text-danger"
                                  onClick={() => deleteRecord(r.id)}
                                  title="លុប"
                                >
                                  <LuTrash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Modal Form */}
      <SponsorshipForm />
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
