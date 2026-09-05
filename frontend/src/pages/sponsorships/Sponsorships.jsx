import { useState, useEffect, useCallback } from "react";
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
import { sponsorshipAPI } from "../../api/sponsorship";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import { useToast } from "../../components/Toast";
import SponsorshipForm from "./SponsorshipForm";
import "../../style/sponsorships.css";

const COMMON_SECTIONS = [
  "ទាំងអស់ (All)",
  "ការឧបត្ថម្ភរបស់សម្តេចតេជោ ហ៊ុន សែន និងសម្តេចកិត្តិព្រឹទ្ធបណ្ឌិត",
  "ការឧបត្ថម្ភរបស់សម្តេចមហាបវរធិបតី ហ៊ុន ម៉ាណែត និងលោកជំទាវបណ្ឌិត",
  "ការចំណាយរបស់ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន និងលោកជំទាវបណ្ឌិត អ៊ុក ម៉ាលី",
  "ការឧបត្ថម្ភរបស់ក្រុមការងារចុះជួយមូលដ្ឋាន",
  "ការឧបត្ថម្ភរបស់សប្បុរសជននានា",
];

const COMMON_PERIODS = [
  "ទាំងអស់ (All)",
  "សរុប ៩ខែ",
  "ខែតុលា",
  "ខែវិច្ឆិកា",
  "ខែធ្នូ",
  "ប្រចាំត្រីមាសទី១",
  "ប្រចាំត្រីមាសទី២",
  "ប្រចាំត្រីមាសទី៣",
  "ប្រចាំត្រីមាសទី៤",
  "ប្រចាំឆ្នាំ",
];

const COMMON_COMMUNES = [
  "ទាំងអស់ (All)",
  "ទូទាំងស្រុក (District-wide)",
  "ឃុំស្ដៅជុំ",
  "ឃុំសូភាស",
  "ឃុំព្រៃចារ",
  "ឃុំខ្នុរដំបង",
  "ឃុំគោកត្របែក",
  "ឃុំផ្តៅជុំ",
  "ឃុំត្រពាំងគរ",
  "ឃុំសូទិប",
  "ឃុំតាំងក្រសាំង",
  "ឃុំសំបូរ",
];

const STATUS_FILTERS = [
  { label: "ស្ថានភាពទាំងអស់", value: "" },
  { label: "សេចក្តីព្រាង (Draft)", value: "draft" },
  { label: "បានដាក់ស្នើ (Submitted)", value: "submitted" },
  { label: "បានពិនិត្យ (Reviewed)", value: "reviewed" },
  { label: "បានអនុម័ត (Approved)", value: "approved" },
  { label: "បានបង្វែរមកវិញ (Returned)", value: "returned" },
];

export default function Sponsorships() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    section_group: "",
    record_period: "",
    target_location: "",
    status: "",
    search: "",
  });

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Permissions check
  const canCreate = canAccess(user, FEATURES.sponsorships_create) || canAccess(user, FEATURES.sponsorships, "create");
  const canReview = canAccess(user, FEATURES.sponsorships_review) || canAccess(user, FEATURES.users);
  const canApprove = canAccess(user, FEATURES.sponsorships_approve) || canAccess(user, FEATURES.users);
  const canDelete = canAccess(user, FEATURES.sponsorships_delete) || canAccess(user, FEATURES.users);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = {
        section_group: filters.section_group && filters.section_group !== "ទាំងអស់ (All)" ? filters.section_group : undefined,
        record_period: filters.record_period && filters.record_period !== "ទាំងអស់ (All)" ? filters.record_period : undefined,
        target_location: filters.target_location && filters.target_location !== "ទាំងអស់ (All)" ? filters.target_location : undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        limit: 1000,
      };

      const [listRes, summaryRes] = await Promise.all([
        sponsorshipAPI.list(queryParams),
        sponsorshipAPI.getSummary(queryParams),
      ]);

      setRecords(listRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      showToast(err.response?.data?.error || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបកំណត់ត្រានេះមែនទេ?")) return;
    try {
      await sponsorshipAPI.delete(id);
      showToast("បានលុបកំណត់ត្រាជោគជ័យ", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "មិនអាចលុបកំណត់ត្រាបានទេ", "error");
    }
  };

  const handleSubmitReview = async (id) => {
    try {
      await sponsorshipAPI.submit(id);
      showToast("បានដាក់ស្នើពិនិត្យជោគជ័យ", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "មិនអាចដាក់ស្នើបានទេ", "error");
    }
  };

  const handleReviewAction = async (id, action) => {
    const notes = window.prompt(
      action === "return"
        ? "បញ្ចូលមូលហេតុនៃការបង្វែរមកវិញ (Return notes):"
        : "ចំណាំបន្ថែមសម្រាប់ការពិនិត្យ (Review notes - ស្រេចចិត្ត):"
    );
    if (action === "return" && notes === null) return;

    try {
      await sponsorshipAPI.review(id, { action, notes: notes || "" });
      showToast(
        action === "return" ? "បានបង្វែរកំណត់ត្រាទៅកែសម្រួលវិញ" : "បានពិនិត្យ និងយល់ព្រម",
        "success"
      );
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "មានបញ្ហាក្នុងការដំណើរការ", "error");
    }
  };

  const handleApproveAction = async (id) => {
    const notes = window.prompt("ចំណាំការអនុម័ត (Approval notes - ស្រេចចិត្ត):");
    if (notes === null) return;

    try {
      await sponsorshipAPI.approve(id, { notes: notes || "" });
      showToast("បានអនុម័ត និងចាក់សោរបាយការណ៍ជោគជ័យ", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "មិនអាចអនុម័តបានទេ", "error");
    }
  };

  // Group records by section_group for display
  const groupedSections = records.reduce((acc, rec) => {
    const key = rec.section_group || "ការឧបត្ថម្ភទូទៅ";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});

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
              onClick={() => {
                setEditItem(null);
                setShowModal(true);
              }}
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
                <option key={s} value={s === "ទាំងអស់ (All)" ? "" : s}>
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
                <option key={p} value={p === "ទាំងអស់ (All)" ? "" : p}>
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
                <option key={l} value={l === "ទាំងអស់ (All)" ? "" : l}>
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
              {STATUS_FILTERS.map((st) => (
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
                    {secRecords.map((r, rIdx) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: "center", fontWeight: "600" }}>
                          {toKhmerDigits(r.entry_no || rIdx + 1)}
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", color: "#1e293b" }}>
                            {r.contributor_name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.15rem" }}>
                            {r.record_period} • <strong style={{ color: "#1e3a8a" }}>{r.target_location}</strong>
                          </div>
                          {r.usage_description && (
                            <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "0.25rem", fontStyle: "italic" }}>
                              {r.usage_description}
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
                          <span className={`status-pill ${r.status || "draft"}`}>
                            {r.status === "draft" && "សេចក្តីព្រាង"}
                            {r.status === "submitted" && "បានដាក់ស្នើ"}
                            {r.status === "reviewed" && "បានពិនិត្យ"}
                            {r.status === "approved" && "បានអនុម័ត"}
                            {r.status === "returned" && "បង្វែរមកវិញ"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                            {/* Submit Button for Draft or Returned */}
                            {(r.status === "draft" || r.status === "returned") && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => handleSubmitReview(r.id)}
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
                                onClick={() => {
                                  setEditItem(r);
                                  setShowModal(true);
                                }}
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
                                onClick={() => handleDelete(r.id)}
                                title="លុប"
                              >
                                <LuTrash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Modal Form */}
      {showModal && (
        <SponsorshipForm
          initialData={editItem}
          onClose={() => {
            setShowModal(false);
            setEditItem(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditItem(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
