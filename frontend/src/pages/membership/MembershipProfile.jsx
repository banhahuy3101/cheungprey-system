import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuPencil,
  LuBanknote,
  LuActivity,
  LuUserCheck,
  LuCreditCard,
  LuCalendar,
  LuPhone,
  LuMail,
  LuMapPin,
  LuShieldCheck,
  LuBadgeCheck,
  LuTrash2,
  LuRefreshCw,
  LuUser,
} from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import { canAccess, FEATURES } from "../../utils/permissions";
import { membershipAPI } from "../../api/membership";
import { partyAPI } from "../../api/party";
import { approvalsAPI } from "../../api/modules";
import Select from "../../components/Select";

const TABS = [
  { key: "overview", label: "ទិដ្ឋភាពទូទៅ" },
  { key: "demographics", label: "ទិន្នន័យផ្ទាល់ខ្លួន" },
  { key: "history", label: "ប្រវត្តិស្ថានភាព" },
  { key: "approval", label: "ដំណើរការយល់ព្រម" },
];

const STATUS_MAP = {
  Pending: "pending",
  Active: "active",
  Suspended: "suspended",
  Resigned: "resigned",
  Expelled: "expelled",
  Deceased: "deceased",
};

const STATUS_LABEL = {
  Pending: "កំពុងរងចាំ",
  Active: "សកម្ម",
  Suspended: "ផ្អាក",
  Resigned: "លាឈប់",
  Expelled: "បណ្តេញចេញ",
  Deceased: "មរណៈ",
};

const GENDER_LABEL = { Male: "ប្រុស", Female: "ស្រី" };

export default function MembershipProfile({ profile: initialProfile, onBack, onEdit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusHistory, setStatusHistory] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: "", reason: "" });
  const [statusError, setStatusError] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [approvalHistory, setApprovalHistory] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const member = profile?.member;
  const demos = profile?.demographics;
  const positions = profile?.positions || [];
  const dues = profile?.current_dues;
  const cards = profile?.cards || [];
  const activity = profile?.activity || [];
  const canAdmin = canAccess(user, FEATURES.membership_admin);
  const currentPosition = positions.find((p) => p.is_current);

  const loadHistory = () => {
    if (!member) return;
    setStatusLoading(true);
    membershipAPI
      .getStatusHistory(member.id)
      .then((res) => setStatusHistory(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  };

  const loadApprovals = () => {
    if (!member) return;
    setApprovalLoading(true);
    approvalsAPI.history("membership", member.id)
      .then((res) => setApprovalHistory(res.data?.data || res.data || []))
      .catch(() => setApprovalHistory([]))
      .finally(() => setApprovalLoading(false));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "history") loadHistory();
    if (tab === "approval") loadApprovals();
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setStatusError("");
    setStatusSubmitting(true);
    try {
      await membershipAPI.changeStatus(member.id, statusForm);
      setShowStatusModal(false);
      setStatusForm({ status: "", reason: "" });
      const res = await membershipAPI.getProfile(member.id);
      const updated = res.data?.data || res.data;
      if (updated) {
        setProfile(updated);
        loadHistory();
      }
    } catch (err) {
      setStatusError(err.response?.data?.error || "បរាជ័យ");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await partyAPI.deleteMember(member.id);
      toast.success("បានលុបសមាជិក");
      onBack();
    } catch {
      toast.error("ការលុបបានបរាជ័យ");
    }
    setShowConfirmDelete(false);
  };

  const statusBadge = (s) => {
    const map = {
      Pending: "badge-info",
      Active: "badge-success",
      Suspended: "badge-warning",
      Resigned: "badge-danger",
      Expelled: "badge-danger",
      Deceased: "badge-danger",
    };
    return map[s] || "badge";
  };

  if (!member) {
    return (
      <div className="page">
        <div className="loading">កំពុងផ្ទុក...</div>
      </div>
    );
  }

  const initials = ((member.last_name_kh?.[0] || "") + (member.first_name_kh?.[0] || "")) || "?";

  return (
    <div className="page">
      {/* Hero Card */}
      <div className="member-hero">
        <div className="member-hero-head">
          <button className="btn-icon" onClick={onBack} style={{ color: "#fff", zIndex: 1, marginRight: "0.5rem" }}>
            <LuArrowLeft />
          </button>
          <div className="member-avatar">{initials}</div>
          <div className="member-hero-info">
            <h2 className="member-hero-name">
              {member.last_name_kh} {member.first_name_kh}
            </h2>
            <p className="member-hero-sub">
              {member.last_name_en} {member.first_name_en}
            </p>
            <div className="member-hero-badges">
              <span className={`member-badge member-badge status-${STATUS_MAP[member.status] || "pending"}`}>
                {STATUS_LABEL[member.status] || member.status}
              </span>
              <span className="member-badge member-badge" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {member.membership_card_no}
              </span>
              {member.party_role && (
                <span className="member-badge member-badge" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {member.party_role}
                </span>
              )}
            </div>
          </div>
          <div className="member-hero-actions">
            <button className="btn" onClick={onEdit}><LuPencil /> កែប្រែ</button>
            {canAdmin && (
              <>
                <button className="btn" onClick={() => setShowStatusModal(true)}><LuRefreshCw /> ស្ថានភាព</button>
                <button className="btn btn-danger" onClick={() => setShowConfirmDelete(true)}><LuTrash2 /></button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="member-quick-stats">
          <div className="member-stat-item">
            <span className="member-stat-value">{member.gender ? GENDER_LABEL[member.gender] || member.gender : "—"}</span>
            <span className="member-stat-label">ភេទ</span>
          </div>
          <div className="member-stat-item">
            <span className="member-stat-value">{member.date_of_birth || "—"}</span>
            <span className="member-stat-label">ថ្ងៃខែឆ្នាំកំណើត</span>
          </div>
          <div className="member-stat-item">
            <span className="member-stat-value">{member.phone_number || "—"}</span>
            <span className="member-stat-label">លេខទូរសព្ទ</span>
          </div>
          <div className="member-stat-item">
            <span className="member-stat-value">{member.join_date || "—"}</span>
            <span className="member-stat-label">ថ្ងៃចូលជាសមាជិក</span>
          </div>
          <div className="member-stat-item">
            <span className="member-stat-value">
              {member.membership_type || "—"} / {member.membership_tier || "—"}
            </span>
            <span className="member-stat-label">ប្រភេទ / កម្រិត</span>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="member-toolbar">
          <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/dues`)}>
            <LuBanknote /> បង់រំលោះ {dues ? `($${dues.total_paid || 0})` : ""}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/activity`)}>
            <LuActivity /> សកម្មភាព ({activity.length})
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/positions`)}>
            <LuUserCheck /> ឋានៈ ({positions.length})
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/cards`)}>
            <LuCreditCard /> កាត ({cards.length})
          </button>
        </div>

        {/* Tabs */}
        <div className="member-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`member-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="member-tab-content">
          {activeTab === "overview" && (
            <div className="member-section">
              {/* Current Position */}
              {currentPosition ? (
                <div className="member-card">
                  <div className="member-card-header">
                    <div className="member-card-icon purple"><LuUserCheck size={18} /></div>
                    <h4 className="member-card-title">ឋានៈបច្ចុប្បន្ន</h4>
                  </div>
                  <div className="member-card-body">
                    <div className="member-card-row">
                      <span className="member-card-row-label">តួនាទី</span>
                      <span className="member-card-row-value">
                        {currentPosition.party_role}
                        {currentPosition.position_title ? ` — ${currentPosition.position_title}` : ""}
                      </span>
                    </div>
                    {currentPosition.committee && (
                      <div className="member-card-row">
                        <span className="member-card-row-label">គណៈកម្មការ</span>
                        <span className="member-card-row-value">{currentPosition.committee}</span>
            </div>
          )}

          {activeTab === "approval" && (
            <div>
              {approvalLoading ? (
                <div className="loading">កំពុងផ្ទុក...</div>
              ) : approvalHistory.length === 0 ? (
                <div className="member-history-empty">
                  <div className="member-history-empty-icon"><LuShieldCheck size={36} /></div>
                  <p>មិនមានដំណើរការយល់ព្រម</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {approvalHistory.map((a, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      padding: "0.7rem 1rem", borderRadius: 10,
                      background: "#fff", border: "1px solid #f1f5f9",
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                        background: a.status === "approved" ? "#ecfdf5" : a.status === "rejected" ? "#fef2f2" : "#fef3c7",
                        color: a.status === "approved" ? "#059669" : a.status === "rejected" ? "#dc2626" : "#d97706",
                      }}>
                        {a.status === "approved" ? "✓" : a.status === "rejected" ? "✕" : a.step_order}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                          Step {a.step_order} — {a.approver_role === "commune_chief" ? "ប្រធានឃុំ" :
                            a.approver_role === "district_chief" ? "ប្រធានស្រុក" :
                            a.approver_role === "province_chief" ? "ប្រធានខេត្ត" :
                            a.approver_role || "—"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>
                          {a.approver_name && <span>អ្នកទទួលបន្ទុក: <strong style={{ color: "#0f172a" }}>{a.approver_name}</strong> · </span>}
                          {a.status === "approved" ? "បានយល់ព្រម" :
                           a.status === "rejected" ? "បានបដិសេធ" : "រង់ចាំការយល់ព្រម"}
                          {a.approved_by_name && <span> ដោយ <strong style={{ color: "#0f172a" }}>{a.approved_by_name}</strong></span>}
                          {a.approved_at && ` · ${new Date(a.approved_at).toLocaleString()}`}
                          {a.notes && ` · ${a.notes}`}
                        </div>
                      </div>
                      <span className={`badge ${
                        a.status === "approved" ? "badge-success" :
                        a.status === "rejected" ? "badge-danger" : "badge-info"
                      }`} style={{ fontSize: "0.7rem" }}>
                        {a.status === "approved" ? "បានយល់ព្រម" :
                         a.status === "rejected" ? "បដិសេធ" : "រង់ចាំ"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
                    <div className="member-card-row">
                      <span className="member-card-row-label">ចាប់ពី</span>
                      <span className="member-card-row-value">{currentPosition.start_date}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="member-card">
                  <div className="member-card-header">
                    <div className="member-card-icon purple"><LuUserCheck size={18} /></div>
                    <h4 className="member-card-title">ឋានៈបច្ចុប្បន្ន</h4>
                  </div>
                  <div className="member-card-body">
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                      មិនទាន់មានឋានៈ
                    </p>
                  </div>
                </div>
              )}

              {/* Dues Summary */}
              <div className="member-card">
                <div className="member-card-header">
                  <div className="member-card-icon green"><LuBanknote size={18} /></div>
                  <h4 className="member-card-title">ការបង់រំលោះ</h4>
                </div>
                <div className="member-card-body">
                  {dues ? (
                    <>
                      <div className="member-card-row">
                        <span className="member-card-row-label">សរុបបានបង់</span>
                        <span className="member-card-row-value" style={{ color: "#059669" }}>${dues.total_paid}</span>
                      </div>
                      <div className="member-card-row">
                        <span className="member-card-row-label">ចំនួនដង</span>
                        <span className="member-card-row-value">{dues.payment_count}</span>
                      </div>
                      <div className="member-card-row">
                        <span className="member-card-row-label">បង់ចុងក្រោយ</span>
                        <span className="member-card-row-value">{dues.last_payment_date || "—"}</span>
                      </div>
                      <div className="member-card-row">
                        <span className="member-card-row-label">ចំនួនចុងក្រោយ</span>
                        <span className="member-card-row-value">${dues.last_payment_amount || 0}</span>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                      មិនទាន់មានការបង់រំលោះ
                    </p>
                  )}
                </div>
              </div>

              {/* Demographics */}
              {demos ? (
                <div className="member-card">
                  <div className="member-card-header">
                    <div className="member-card-icon blue"><LuUser size={18} /></div>
                    <h4 className="member-card-title">ទិន្នន័យផ្ទាល់ខ្លួន</h4>
                  </div>
                  <div className="member-card-body">
                    <div className="member-card-row">
                      <span className="member-card-row-label">ស្ថានភាពអាពាហ៍</span>
                      <span className="member-card-row-value">{demos.marital_status || "—"}</span>
                    </div>
                    <div className="member-card-row">
                      <span className="member-card-row-label">មុខរបរ</span>
                      <span className="member-card-row-value">{demos.occupation || "—"}</span>
                    </div>
                    <div className="member-card-row">
                      <span className="member-card-row-label">កម្រិតសិក្សា</span>
                      <span className="member-card-row-value">{demos.education_level || "—"}</span>
                    </div>
                    <div className="member-card-row">
                      <span className="member-card-row-label">ជនជាតិ</span>
                      <span className="member-card-row-value">{demos.ethnicity || "—"}</span>
                    </div>
                    <div className="member-card-row">
                      <span className="member-card-row-label">សាសនា</span>
                      <span className="member-card-row-value">{demos.religion || "—"}</span>
                    </div>
                    <div className="member-card-row">
                      <span className="member-card-row-label">ប្រភេទឈាម</span>
                      <span className="member-card-row-value">{demos.blood_type || "—"}</span>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}
                      onClick={() => navigate(`/membership/${member.id}/demographics`)}
                    >
                      កែប្រែទិន្នន័យ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="member-card">
                  <div className="member-card-header">
                    <div className="member-card-icon blue"><LuUser size={18} /></div>
                    <h4 className="member-card-title">ទិន្នន័យផ្ទាល់ខ្លួន</h4>
                  </div>
                  <div className="member-card-body">
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                      មិនទាន់មានទិន្នន័យ
                    </p>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem" }}
                      onClick={() => navigate(`/membership/${member.id}/demographics`)}
                    >
                      បន្ថែមទិន្នន័យ
                    </button>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="member-card">
                <div className="member-card-header">
                  <div className="member-card-icon amber"><LuPhone size={18} /></div>
                  <h4 className="member-card-title">ព័ត៌មានទំនាក់ទំនង</h4>
                </div>
                <div className="member-card-body">
                  <div className="member-card-row">
                    <span className="member-card-row-label"><LuPhone size={14} style={{ marginRight: 4 }} /> ទូរសព្ទ</span>
                    <span className="member-card-row-value">{member.phone_number || "—"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label"><LuMail size={14} style={{ marginRight: 4 }} /> អ៊ីមែល</span>
                    <span className="member-card-row-value">{member.email || "—"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label"><LuActivity size={14} style={{ marginRight: 4 }} /> Telegram</span>
                    <span className="member-card-row-value">{member.telegram_username || "—"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label"><LuMapPin size={14} style={{ marginRight: 4 }} /> លេខសម្គាល់</span>
                    <span className="member-card-row-value">{member.national_id || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="member-card">
                <div className="member-card-header">
                  <div className="member-card-icon purple"><LuBadgeCheck size={18} /></div>
                  <h4 className="member-card-title">ព័ត៌មានសមាជិកភាព</h4>
                </div>
                <div className="member-card-body">
                  <div className="member-card-row">
                    <span className="member-card-row-label">លេខសមាជិក</span>
                    <span className="member-card-row-value">{member.membership_card_no}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label">ប្រភេទ</span>
                    <span className="member-card-row-value">{member.membership_type || "—"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label">កម្រិត</span>
                    <span className="member-card-row-value">{member.membership_tier || "—"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label">ឋានៈ</span>
                    <span className="member-card-row-value">{member.party_role || "—"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label">លើកលែងបង់រំលោះ</span>
                    <span className="member-card-row-value">{member.exempt_from_dues ? "បាទ/ចាស" : "ទេ"}</span>
                  </div>
                  <div className="member-card-row">
                    <span className="member-card-row-label"><LuCalendar size={14} style={{ marginRight: 4 }} /> ថ្ងៃចូល</span>
                    <span className="member-card-row-value">{member.join_date || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "demographics" && (
            <div>
              {demos ? (
                <div className="profile-detail-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">ស្ថានភាពអាពាហ៍</span>
                    <span className="profile-detail-value">{demos.marital_status || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">មុខរបរ</span>
                    <span className="profile-detail-value">{demos.occupation || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">កម្រិតសិក្សា</span>
                    <span className="profile-detail-value">{demos.education_level || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">ជនជាតិ</span>
                    <span className="profile-detail-value">{demos.ethnicity || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">សាសនា</span>
                    <span className="profile-detail-value">{demos.religion || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">ប្រភេទឈាម</span>
                    <span className="profile-detail-value">{demos.blood_type || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">ឈ្មោះទំនាក់ទំនងបន្ទាន់</span>
                    <span className="profile-detail-value">{demos.emergency_contact_name || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">ទូរសព្ទបន្ទាន់</span>
                    <span className="profile-detail-value">{demos.emergency_contact_phone || "—"}</span>
                  </div>
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">អាសយដ្ឋាន</span>
                    <span className="profile-detail-value">{demos.address || "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="member-history-empty">
                  <div className="member-history-empty-icon"><LuUser size={36} /></div>
                  <p>មិនទាន់មានទិន្នន័យផ្ទាល់ខ្លួន</p>
                </div>
              )}
              <button
                className="btn btn-secondary"
                style={{ marginTop: "1rem" }}
                onClick={() => navigate(`/membership/${member.id}/demographics`)}
              >
                កែប្រែទិន្នន័យ
              </button>
            </div>
          )}

          {activeTab === "history" && (
            <div>
              {statusLoading ? (
                <div className="loading">កំពុងផ្ទុក...</div>
              ) : statusHistory.length === 0 ? (
                <div className="member-history-empty">
                  <div className="member-history-empty-icon"><LuRefreshCw size={36} /></div>
                  <p>មិនទាន់មានប្រវត្តិផ្លាស់ប្តូរស្ថានភាព</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>កាលបរិច្ឆេទ</th>
                        <th>ពី</th>
                        <th>ទៅ</th>
                        <th>មូលហេតុ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusHistory.map((h) => (
                        <tr key={h.id}>
                          <td>{new Date(h.changed_at).toLocaleDateString()}</td>
                          <td><span className={`badge ${statusBadge(h.old_status)}`}>{h.old_status}</span></td>
                          <td><span className={`badge ${statusBadge(h.new_status)}`}>{h.new_status}</span></td>
                          <td>{h.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3>ប្តូរស្ថានភាពសមាជិក</h3>
              <button className="btn-icon" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleStatusSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>ស្ថានភាពថ្មី *</label>
                  <Select
                    name="status"
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  >
                    <option value="">-- ជ្រើសរើស --</option>
                    <option value="Pending">Pending — កំពុងរងចាំ</option>
                    <option value="Active">Active — សកម្ម</option>
                    <option value="Suspended">Suspended — ផ្អាក</option>
                    <option value="Resigned">Resigned — លាឈប់</option>
                    <option value="Expelled">Expelled — បណ្តេញចេញ</option>
                    <option value="Deceased">Deceased — មរណៈ</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>មូលហេតុ</label>
                  <textarea
                    rows={3}
                    value={statusForm.reason}
                    onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                    placeholder="សូមបញ្ចូលមូលហេតុនៃការផ្លាស់ប្តូរស្ថានភាព..."
                  />
                </div>
                {statusError && <div className="alert alert-error">{statusError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
                  បោះបង់
                </button>
                <button type="submit" className="btn btn-primary" disabled={statusSubmitting}>
                  {statusSubmitting ? "រក្សាទុក..." : "រក្សាទុក"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirmDelete}
        title="លុបសមាជិក"
        message={`តើអ្នកពិតជាចង់លុប ${member?.last_name_kh || ""} ${member?.first_name_kh || ""} ឬ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`}
        confirmLabel="លុប"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}
