import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuPencil, LuTrash2, LuSearch, LuUser, LuQrCode
} from "react-icons/lu";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../settings/Modal";
import DataTable from "../../components/DataTable";
import { canAccess, FEATURES, isAdmin } from "../../utils/permissions";
import { useRoleOptions, getRoleBadgeStyle } from "../../hooks/useRoleOptions";
import AdminHeader from "./AdminHeader";
import AdminStats from "./AdminStats";
import UserProfileModal from "../../components/UserProfileModal";
import {
  getDefaultUserPassword,
} from "../../config/userSettings";

function formatDate(value) {
  if (!value || value.startsWith("0001-01-01")) return "-";
  return value.slice(0, 10);
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { roleOptions, roleLabelMap } = useRoleOptions();
  const canCreate = canAccess(user, FEATURES.users, "create");
  const canUpdate = canAccess(user, FEATURES.users, "update");
  const canDelete = canAccess(user, FEATURES.users, "delete");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [defaultPassword, setDefaultPassword] = useState(getDefaultUserPassword());
  const [actionMessage, setActionMessage] = useState("");
  const [resettingId, setResettingId] = useState(null);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");

  // QR modal state
  const [qrUser, setQrUser] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  // Profile modal state
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    const syncPassword = () => setDefaultPassword(getDefaultUserPassword());
    syncPassword();
    window.addEventListener("default-password-changed", syncPassword);
    window.addEventListener("focus", syncPassword);
    return () => {
      window.removeEventListener("default-password-changed", syncPassword);
      window.removeEventListener("focus", syncPassword);
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.getUsers({ search, page, limit: 20 }),
        adminAPI.getStatistics(),
      ]);
      const userInner = usersRes.data?.data || usersRes.data;
      setUsers(Array.isArray(userInner) ? userInner : userInner?.users || []);
      setTotal(Array.isArray(userInner) ? userInner.length : userInner?.total || 0);
      setStats(statsRes.data?.data || statsRes.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    let cancelled = false;
    fetchData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchData]);

  const openCreate = () => {
    navigate("/settings/users/create");
  };

  const openEdit = (u) => {
    if (!u?.id) return;
    navigate(`/settings/users/${u.id}/edit`);
  };

  const openProfile = (u) => {
    if (!u) return;
    setProfileUser(u);
  };

  const handleResetPassword = async (u) => {
    if (!u?.id) return;
    const password = resetPasswordInput || defaultPassword;
    setResettingId(u.id);
    setActionMessage("");
    try {
      await adminAPI.resetPassword(u.id, password);
      setActionMessage(`ពាក្យសម្ងាត់សម្រាប់ ${u.full_name || u.email} ត្រូវបានកំណត់ឡើងវិញទៅ៖ ${password}`);
      setResetTargetUser(null);
      setResetPasswordInput("");
      setTimeout(() => setActionMessage(""), 6000);
    } catch {
      setActionMessage("កំណត់ពាក្យសម្ងាត់ឡើងវិញមិនបានសម្រេច");
    } finally {
      setResettingId(null);
    }
  };

  const openQR = async (u) => {
    if (!u?.id) return;
    setQrUser(u);
    setQrData(null);
    setQrError("");
    setQrLoading(true);
    try {
      const res = await adminAPI.getUserQRCode(u.id, { params: { origin: window.location.origin } });
      const inner = res.data?.data || res.data;
      setQrData(inner?.qr_data_uri || "");
    } catch (err) {
      setQrError(err.response?.data?.error || err.response?.data?.message || err.message || "បង្កើត QR Code បរាជ័យ");
    } finally {
      setQrLoading(false);
    }
  };

  const closeQR = () => {
    setQrUser(null);
    setQrData(null);
    setQrError("");
  };

  const downloadQRCard = () => {
    if (!qrData || !qrUser) return;
    const name = qrUser.full_name || qrUser.name || "User";
    const email = qrUser.email || qrUser.phone_number || "";
    const scale = 3;
    const width = 480;
    const height = 640;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#1e40af";
    ctx.fillRect(0, 0, width, 14);
    ctx.fillRect(0, height - 14, width, 14);

    const img = new Image();
    img.onload = () => {
      const qrSize = 300;
      ctx.drawImage(img, (width - qrSize) / 2, 160, qrSize, qrSize);

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.font = "700 30px 'Khmer OS Siemreap', system-ui, sans-serif";
      ctx.fillText(name, width / 2, 110);
      if (email) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 20px system-ui, sans-serif";
        ctx.fillText(email, width / 2, 142);
      }

      ctx.fillStyle = "#475569";
      ctx.font = "500 19px 'Khmer OS Siemreap', system-ui, sans-serif";
      const hint1 = "ស្កេន QR Code នេះដើម្បីចូលប្រព័ន្ធដោយស្វ័យប្រវត្តិ";
      const hint2 = "ជំនួសអ្នកប្រើប្រាស់នេះ។ កូដអាចប្រើបានច្រើនដង";
      const hint3 = "ប៉ុន្តែផុតកំណត់ក្នុងរយៈពេល 24 ម៉ោង។";
      ctx.fillText(hint1, width / 2, 520);
      ctx.fillText(hint2, width / 2, 548);
      ctx.fillText(hint3, width / 2, 576);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${(name || "user").replace(/[^a-zA-Z0-9\u1780-\u17FF]+/g, "-")}.png`;
      a.click();
    };
    img.src = qrData;
  };

  const handleDelete = async (id) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបអ្នកប្រើប្រាស់នេះឬ?")) return;
    try {
      await adminAPI.deleteUser(id);
      setActionMessage("បានលុបអ្នកប្រើប្រាស់ដោយជោគជ័យ!");
      fetchData();
    } catch (err) {
      setActionMessage(err.response?.data?.error || "ការលុបអ្នកប្រើប្រាស់បរាជ័យ");
    }
  };

  const totalPages = Math.ceil(total / 20);

  if (!isAdmin(user)) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  const columns = [
    {
      key: "name",
      label: "អ្នកប្រើប្រាស់ / ឈ្មោះ",
      render: (_, u) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#dbeafe",
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "0.9rem",
              border: "1px solid #bfdbfe",
              flexShrink: 0,
            }}
          >
            {(u.full_name || u.name || u.email || "U").charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            className="link-button"
            onClick={() => openProfile(u)}
            title="មើលប្រវត្តិរូប"
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}
          >
            <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.88rem" }}>{u.full_name || u.name || "-"}</span>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>{u.email || "-"}</span>
          </button>
        </div>
      ),
    },
    {
      key: "phone_number",
      label: "លេខទូរស័ព្ទ",
      render: (val) => <span style={{ color: "#475569" }}>{val || "—"}</span>,
    },
    {
      key: "zone_name",
      label: "តំបន់ / ឃុំ",
      render: (val, row) => <span style={{ color: "#475569" }}>{val || row.zone_code || "—"}</span>,
    },
    {
      key: "date_of_birth",
      label: "ថ្ងៃខែឆ្នាំកំណើត",
      render: (val) => <span style={{ color: "#475569" }}>{val ? val.slice(0, 10) : "—"}</span>,
    },
    {
      key: "roles",
      label: "តួនាទី (Roles)",
      render: (_, u) => {
        const userRoles = u.roles?.length ? u.roles : (u.role ? [u.role] : []);
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {userRoles.map((r) => (
              <span
                key={r}
                style={{
                  padding: "0.15rem 0.55rem",
                  borderRadius: "20px",
                  fontSize: "0.74rem",
                  fontWeight: "600",
                  display: "inline-block",
                  ...getRoleBadgeStyle(r),
                }}
              >
                {roleLabelMap[r] || r}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "created_at",
      label: "កាលបរិច្ឆេទបង្កើត",
      render: (val) => <span style={{ color: "#64748b" }}>{formatDate(val)}</span>,
    },
    {
      key: "actions",
      label: "សកម្មភាព",
      align: "right",
      width: "150px",
      render: (_, u) => (
        <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => openProfile(u)}
            title="មើល ឬគ្រប់គ្រងប្រវត្តិរូប"
          >
            <LuUser size={16} />
          </button>
          {canUpdate && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => openEdit(u)}
              title="កែប្រែអ្នកប្រើប្រាស់"
            >
              <LuPencil size={16} />
            </button>
          )}
          <button
            type="button"
            className="btn-icon"
            onClick={() => openQR(u)}
            title="បង្ហាញ QR Code"
          >
            <LuQrCode size={16} />
          </button>
          {canDelete && u.id !== user?.id && (
            <button
              type="button"
              className="btn-icon danger"
              onClick={() => handleDelete(u.id)}
              title="លុបអ្នកប្រើប្រាស់"
            >
              <LuTrash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page rbac-shell">
      <AdminHeader navigate={navigate} onCreate={canCreate ? openCreate : null} />

      {actionMessage && (
        <div className="alert alert-success" style={{ marginBottom: "1.25rem", borderRadius: "10px" }}>
          {actionMessage}
        </div>
      )}

      <AdminStats stats={stats} total={total} users={users} />

      {/* Search Input Bar */}
      <div className="search-bar" style={{ marginBottom: "1.25rem" }}>
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកតាមឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="គ្មានទិន្នន័យអ្នកប្រើប្រាស់"
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Password Reset Confirmation Modal */}
      {resetTargetUser && (
        <Modal
          open={!!resetTargetUser}
          onClose={() => setResetTargetUser(null)}
          title="🔑 កំណត់ពាក្យសម្ងាត់ឡើងវិញ (Reset Password)"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
            <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>
              តើអ្នកពិតជាចង់កំណត់ពាក្យសម្ងាត់សម្រាប់ <strong>{resetTargetUser.full_name || resetTargetUser.email}</strong> ឡើងវិញ មែនទេ?
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "600", fontSize: "0.85rem", color: "#334155" }}>
                ពាក្យសម្ងាត់ថ្មី (New Password)
              </label>
              <input
                type="text"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder={`លោក/អ្នកស្រីអាចបញ្ចូលពាក្យសម្ងាត់ថ្មី ឬទុកទទេសម្រាប់ពាក្យសម្ងាត់ដើម (${defaultPassword})`}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                autoFocus
              />
              <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "#64748b" }}>
                ប្រសិនបើទុកទទេ នឹងប្រើពាក្យសម្ងាត់ដើម៖ <code style={{ fontWeight: 700, color: "#1d4ed8" }}>{defaultPassword}</code>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setResetTargetUser(null); setResetPasswordInput(""); }}>
                បោះបង់
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleResetPassword(resetTargetUser)}
                disabled={resettingId === resetTargetUser.id}
              >
                {resettingId === resetTargetUser.id ? "កំពុងកំណត់..." : "បញ្ជាក់ការកំណត់"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Profile Detail & Edit Modal */}
      <UserProfileModal
        user={profileUser}
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
        onSaved={fetchData}
        canUpdate={canUpdate}
        canDelete={canDelete}
        currentUserId={user?.id}
        roleOptions={roleOptions}
        onResetPassword={(u) => { setProfileUser(null); setResetTargetUser(u); }}
        onDeleteUser={(id) => handleDelete(id)}
      />

      {/* QR Code Modal */}
      {qrUser && (
        <Modal
          open={!!qrUser}
          onClose={closeQR}
          title="📱 QR Code អ្នកប្រើប្រាស់"
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "0.5rem 0", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#dbeafe",
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  border: "1px solid #bfdbfe",
                  flexShrink: 0,
                }}
              >
                {(qrUser.full_name || qrUser.name || qrUser.email || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.95rem" }}>{qrUser.full_name || qrUser.name || "-"}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{qrUser.email || qrUser.phone_number || "-"}</div>
              </div>
            </div>

            {qrLoading && <div className="loading" style={{ padding: "1.5rem" }}>កំពុងបង្កើត QR Code...</div>}

            {qrError && <div className="alert alert-error" style={{ fontSize: "0.85rem", width: "100%" }}>{qrError}</div>}

            {!qrLoading && !qrError && qrData && (
              <>
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    display: "inline-flex",
                  }}
                >
                  <img
                    src={qrData}
                    alt={`QR Code ${qrUser.full_name || qrUser.name || ""}`}
                    style={{ width: "220px", height: "220px", display: "block", imageRendering: "pixelated" }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                  ស្កេន QR Code នេះដើម្បីចូលប្រព័ន្ធដោយស្វ័យប្រវត្តិជំនួសអ្នកប្រើប្រាស់នេះ។ កូដនេះអាចប្រើបានច្រើនដង ប៉ុន្តែផុតកំណត់ក្នុងរយៈពេល 24 ម៉ោង។
                </p>
                <button
                  type="button"
                  onClick={downloadQRCard}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "10px" }}
                >
                  <LuQrCode size={16} /> ទាញយក QR Code
                </button>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.25rem", width: "100%" }}>
              <button type="button" className="btn btn-secondary" onClick={closeQR}>
                បិទ
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
