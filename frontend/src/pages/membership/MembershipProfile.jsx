import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuPencil, LuBanknote, LuActivity, LuUserCheck, LuCreditCard } from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import { canAccess, FEATURES } from "../../utils/permissions";
import { membershipAPI } from "../../api/membership";
import { partyAPI } from "../../api/party";
import Select from "../../components/Select";

const TABS = [
  { key: "overview", label: "ទិដ្ឋភាពទូទៅ" },
  { key: "demographics", label: "ទិន្នន័យផ្ទាល់ខ្លួន" },
  { key: "history", label: "ប្រវត្តិស្ថានភាព" },
];

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
    membershipAPI.getStatusHistory(member.id).then((res) => {
      setStatusHistory(res.data?.data || res.data || []);
    }).catch(() => {}).finally(() => setStatusLoading(false));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "history") loadHistory();
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
      setStatusError(err.response?.data?.error || "Failed to change status");
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
    const map = { Pending: "badge-info", Active: "badge-success", Suspended: "badge-warning", Resigned: "badge-danger", Expelled: "badge-danger", Deceased: "badge-danger" };
    return map[s] || "badge";
  };

  if (!member) {
    return <div className="page"><div className="loading">កំពុងផ្ទុក...</div></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={onBack}><LuArrowLeft /></button>
          <h2 className="section-title">ព័ត៌មានសមាជិក</h2>
        </div>
        <div className="actions" style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={onEdit}><LuPencil /> កែប្រែ</button>
          {canAdmin && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(true)}>ប្តូរស្ថានភាព</button>
              <button className="btn btn-danger" onClick={() => setShowConfirmDelete(true)}>លុប</button>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="profile-detail-grid">
          <div className="profile-detail-item">
            <span className="profile-detail-label">ឈ្មោះខ្មែរ</span>
            <span className="profile-detail-value">{member.last_name_kh} {member.first_name_kh}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ឈ្មោះឡាតាំង</span>
            <span className="profile-detail-value">{member.last_name_en} {member.first_name_en}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">លេខសមាជិក</span>
            <span className="profile-detail-value">{member.membership_card_no}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">អត្តសញ្ញាណប័ណ្ណ</span>
            <span className="profile-detail-value">{member.national_id || "—"}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ភេទ</span>
            <span className="profile-detail-value">{member.gender === "Male" ? "ប្រុស" : member.gender === "Female" ? "ស្រី" : "ផ្សេងៗ"}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ថ្ងៃខែឆ្នាំកំណើត</span>
            <span className="profile-detail-value">{member.date_of_birth}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">លេខទូរសព្ទ</span>
            <span className="profile-detail-value">{member.phone_number}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">អ៊ីមែល</span>
            <span className="profile-detail-value">{member.email || "—"}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">Telegram</span>
            <span className="profile-detail-value">{member.telegram_username || "—"}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ថ្ងៃចូល</span>
            <span className="profile-detail-value">{member.join_date}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ឋានៈ</span>
            <span className="profile-detail-value">{member.party_role}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ស្ថានភាព</span>
            <span className="profile-detail-value">
              <span className={`badge ${statusBadge(member.status)}`}>{member.status}</span>
            </span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">ប្រភេទ</span>
            <span className="profile-detail-value">{member.membership_type}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">កម្រិត</span>
            <span className="profile-detail-value">{member.membership_tier}</span>
          </div>
          <div className="profile-detail-item">
            <span className="profile-detail-label">លើកលែងបង់រំលោះ</span>
            <span className="profile-detail-value">{member.exempt_from_dues ? "បាទ/ចាស" : "ទេ"}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/dues`)}><LuBanknote /> បង់រំលោះ {dues && `($${dues.total_paid || 0})`}</button>
        <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/activity`)}><LuActivity /> សកម្មភាព ({activity.length})</button>
        <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/positions`)}><LuUserCheck /> ឋានៈ ({positions.length})</button>
        <button className="btn btn-secondary" onClick={() => navigate(`/membership/${member.id}/cards`)}><LuCreditCard /> កាត ({cards.length})</button>
      </div>

      <div className="card">
        <div className="tabs" style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", marginBottom: "1rem" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-secondary"}`}
              style={{ borderRadius: 0, borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "none" }}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {currentPosition && (
              <div className="card" style={{ padding: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>ឋានៈបច្ចុប្បន្ន</h4>
                <p style={{ margin: 0 }}>{currentPosition.party_role}{currentPosition.position_title ? ` — ${currentPosition.position_title}` : ""}{currentPosition.committee ? ` (${currentPosition.committee})` : ""}</p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>ចាប់ពី: {currentPosition.start_date}</p>
              </div>
            )}
            {dues && (
              <div className="card" style={{ padding: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>សង្ខេបការបង់រំលោះ</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div><span className="profile-detail-label">សរុបបានបង់</span><span className="profile-detail-value">${dues.total_paid}</span></div>
                  <div><span className="profile-detail-label">ចំនួនដង</span><span className="profile-detail-value">{dues.payment_count}</span></div>
                  <div><span className="profile-detail-label">បង់ចុងក្រោយ</span><span className="profile-detail-value">{dues.last_payment_date || "—"}</span></div>
                  <div><span className="profile-detail-label">ចំនួនចុងក្រោយ</span><span className="profile-detail-value">${dues.last_payment_amount || 0}</span></div>
                </div>
              </div>
            )}
            {demos && (
              <div className="card" style={{ padding: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>ទិន្នន័យផ្ទាល់ខ្លួន</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div><span className="profile-detail-label">ស្ថានភាពអាពាហ៍</span><span className="profile-detail-value">{demos.marital_status || "—"}</span></div>
                  <div><span className="profile-detail-label">មុខរបរ</span><span className="profile-detail-value">{demos.occupation || "—"}</span></div>
                  <div><span className="profile-detail-label">កម្រិតសិក្សា</span><span className="profile-detail-value">{demos.education_level || "—"}</span></div>
                  <div><span className="profile-detail-label">ជនជាតិ</span><span className="profile-detail-value">{demos.ethnicity || "—"}</span></div>
                  <div><span className="profile-detail-label">សាសនា</span><span className="profile-detail-value">{demos.religion || "—"}</span></div>
                  <div><span className="profile-detail-label">ប្រភេទឈាម</span><span className="profile-detail-value">{demos.blood_type || "—"}</span></div>
                </div>
                <button className="btn btn-secondary" style={{ marginTop: "0.5rem" }} onClick={() => navigate(`/membership/${member.id}/demographics`)}>កែប្រែទិន្នន័យ</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "demographics" && (
          <div>
            {demos ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="profile-detail-item"><span className="profile-detail-label">ស្ថានភាពអាពាហ៍</span><span className="profile-detail-value">{demos.marital_status || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">មុខរបរ</span><span className="profile-detail-value">{demos.occupation || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">កម្រិតសិក្សា</span><span className="profile-detail-value">{demos.education_level || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">ជនជាតិ</span><span className="profile-detail-value">{demos.ethnicity || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">សាសនា</span><span className="profile-detail-value">{demos.religion || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">ប្រភេទឈាម</span><span className="profile-detail-value">{demos.blood_type || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">ឈ្មោះទំនាក់ទំនងបន្ទាន់</span><span className="profile-detail-value">{demos.emergency_contact_name || "—"}</span></div>
                <div className="profile-detail-item"><span className="profile-detail-label">ទូរសព្ទបន្ទាន់</span><span className="profile-detail-value">{demos.emergency_contact_phone || "—"}</span></div>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>មិនទាន់មានទិន្នន័យ</p>
            )}
            <button className="btn btn-secondary" style={{ marginTop: "1rem" }} onClick={() => navigate(`/membership/${member.id}/demographics`)}>កែប្រែទិន្នន័យ</button>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            {statusLoading ? (
              <div className="loading">កំពុងផ្ទុក...</div>
            ) : statusHistory.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>មិនទាន់មានប្រវត្តិ</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>កាលបរិច្ឆេទ</th><th>ពី</th><th>ទៅ</th><th>មូលហេតុ</th></tr></thead>
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

      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>ប្តូរស្ថានភាពសមាជិក</h3>
              <button className="btn-icon" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleStatusSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>ស្ថានភាពថ្មី *</label>
                  <Select name="status" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                    <option value="">-- ជ្រើសរើស --</option>
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Expelled">Expelled</option>
                    <option value="Deceased">Deceased</option>
                  </Select>
                </div>
                <div className="form-group">
                  <label>មូលហេតុ</label>
                  <input value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} />
                </div>
                {statusError && <div className="alert alert-error">{statusError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>បោះបង់</button>
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
