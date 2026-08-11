import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuCheck, LuX, LuClock, LuShieldCheck, LuUser, LuCalendar, LuMapPin, LuMessageSquare, LuChevronRight } from "react-icons/lu";
import { membershipAPI, approvalsAPI } from "../../api/membership";
import { approvalsAPI as workflowApprovalsAPI } from "../../api/modules";
import { useToast } from "../../components/Toast";

const STEP_LABEL = {
  commune_chief: "ប្រធានឃុំ",
  district_chief: "ប្រធានស្រុក",
  province_chief: "ប្រធានខេត្ត",
  admin: "Admin",
  super_admin: "Super Admin",
};

const STEP_ORDER = ["commune_chief", "district_chief", "province_chief", "admin", "super_admin"];

export default function ApprovalQueue({ onRefresh }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [approvals, setApprovals] = useState({});
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await membershipAPI.search({ status: "Pending", limit: 50 });
      const data = res.data?.data || res.data;
      const members = data.members || data || [];
      setItems(members);

      const approvalMap = {};
      await Promise.all(
        members.map(async (m) => {
          try {
            const aRes = await workflowApprovalsAPI.history("membership", m.id);
            approvalMap[m.id] = aRes.data?.data || aRes.data || [];
          } catch {
            approvalMap[m.id] = [];
          }
        })
      );
      setApprovals(approvalMap);
    } catch {} finally { setLoading(false); }
  };

  const handleApprove = async (memberId) => {
    setProcessing(memberId);
    try {
      const memberApprovals = approvals[memberId] || [];
      const pendingStep = memberApprovals.find((a) => a.status === "pending");
      if (pendingStep) {
        await workflowApprovalsAPI.approve(pendingStep.id);
        toast.success("Approved");
      } else {
        await membershipAPI.approve(memberId);
      }
      setItems((prev) => prev.filter((m) => m.id !== memberId));
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    } finally { setProcessing(null); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setProcessing(rejectModal);
    try {
      const memberApprovals = approvals[rejectModal] || [];
      const pendingStep = memberApprovals.find((a) => a.status === "pending");
      if (pendingStep) {
        await workflowApprovalsAPI.reject(pendingStep.id, { notes: rejectReason });
      } else {
        await membershipAPI.reject(rejectModal, { reason: rejectReason });
      }
      setItems((prev) => prev.filter((m) => m.id !== rejectModal));
      onRefresh?.();
      setRejectModal(null);
      setRejectReason("");
      toast.success("Rejected");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    } finally { setProcessing(null); }
  };

  const getCurrentStep = (memberId) => {
    const list = approvals[memberId] || [];
    const pending = list.find((a) => a.status === "pending");
    if (pending) return pending;
    if (list.length > 0) return list[list.length - 1];
    return null;
  };

  const getApproverDisplay = (memberId) => {
    const step = getCurrentStep(memberId);
    if (!step) return null;
    const role = STEP_LABEL[step.approver_role] || step.approver_role;
    const name = step.approver_name;
    return { role, name };
  };

  const getStepProgress = (memberId) => {
    const list = approvals[memberId] || [];
    const approved = list.filter((a) => a.status === "approved").length;
    const total = list.length || 1;
    return { approved, total };
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 1rem" }} />
        <div style={{ color: "#94a3b8", fontWeight: 500 }}>កំពុងផ្ទុក...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LuShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>បញ្ជីរង់ចាំការយល់ព្រម</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {items.length} {items.length === 1 ? "member" : "members"} waiting for approval
            </div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchQueue} style={{ borderRadius: 8 }}>
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9",
          padding: "3rem 2rem", textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}>
          <LuShieldCheck size={40} style={{ color: "#e2e8f0", marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 600, color: "#64748b", fontSize: "0.95rem" }}>មិនមានសមាជិករង់ចាំការយល់ព្រម</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>All pending members have been processed</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map((m) => {
            const currentStep = getCurrentStep(m.id);
            const approver = getApproverDisplay(m.id);
            const { approved, total } = getStepProgress(m.id);
            const isProcessing = processing === m.id;
            return (
              <div
                key={m.id}
                style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9",
                  overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/membership/${m.id}`)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.85rem 1.15rem" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `hsl(${(m.last_name_kh || "a").charCodeAt(0) % 360}, 65%, 55%)`,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "1rem", flexShrink: 0,
                  }}>
                    {(m.last_name_kh || "?")[0]}{(m.first_name_kh || "")[0]}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                      {m.last_name_kh} {m.first_name_kh}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.1rem" }}>
                      {m.last_name_en} {m.first_name_en}
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                        <LuCalendar size={12} /> {m.join_date || m.created_at?.slice(0, 10)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                        <LuMapPin size={12} /> {m.registered_village_code || "—"}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                        <LuUser size={12} /> {m.membership_card_no}
                      </span>
                    </div>
                  </div>

                  {/* WAITING FOR */}
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: "100px" }}>
                    <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.2rem" }}>
                      រង់ចាំ
                    </div>
                    <div style={{
                      display: "inline-flex", flexDirection: "column", alignItems: "center",
                      padding: "0.35rem 0.65rem", borderRadius: 8,
                      background: "#fef3c7", color: "#d97706",
                      fontWeight: 700, fontSize: "0.78rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <LuClock size={14} />
                        {approver?.role || "—"}
                      </div>
                      {approver?.name && (
                        <div style={{ fontSize: "0.65rem", fontWeight: 500, color: "#92400e", marginTop: "0.1rem" }}>
                          {approver.name}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                      Step {approved + 1} of {total}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleApprove(m.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.2rem",
                        padding: "0.45rem 0.75rem", borderRadius: 8,
                        border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#059669",
                        fontWeight: 600, fontSize: "0.75rem", cursor: "pointer",
                      }}
                    >
                      <LuCheck size={14} /> Approve
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => { setRejectModal(m.id); setRejectReason(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.2rem",
                        padding: "0.45rem 0.75rem", borderRadius: 8,
                        border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626",
                        fontWeight: 600, fontSize: "0.75rem", cursor: "pointer",
                      }}
                    >
                      <LuX size={14} /> Reject
                    </button>
                  </div>
                </div>

                {/* Approval steps progress */}
                {total > 0 && (
                  <div style={{ borderTop: "1px solid #f8fafc", padding: "0.55rem 1.15rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    {(approvals[m.id] || []).sort((a, b) => a.step_order - b.step_order).map((a) => {
                      const role = STEP_LABEL[a.approver_role] || a.approver_role;
                      const isDone = a.status === "approved";
                      const isPending = a.status === "pending";
                      const isRejected = a.status === "rejected";
                      return (
                        <div key={a.step_order} style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: isDone ? "#059669" : isRejected ? "#dc2626" : isPending ? "#f59e0b" : "#e2e8f0",
                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", fontWeight: 700, flexShrink: 0,
                          }}>
                            {isDone ? "✓" : isRejected ? "✕" : a.step_order}
                          </div>
                          <div>
                            <span style={{ fontSize: "0.62rem", color: isPending ? "#0f172a" : "#94a3b8", fontWeight: isPending ? 700 : 500 }}>
                              {role}
                            </span>
                            {a.approver_name && (
                              <div style={{ fontSize: "0.55rem", color: "#94a3b8" }}>{a.approver_name}</div>
                            )}
                          </div>
                          <span style={{ color: "#e2e8f0", margin: "0 0.1rem" }}>
                            <LuChevronRight size={10} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>បដិសេធសមាជិក</h3>
              <button className="btn-icon" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>មូលហេតុនៃការបដិសេធ</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="សូមបញ្ចូលមូលហេតុ..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setRejectModal(null); setRejectReason(""); }}>បោះបង់</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason.trim() || processing === rejectModal}>
                {processing === rejectModal ? "..." : "បដិសេធ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
