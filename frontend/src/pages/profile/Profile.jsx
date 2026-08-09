import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuUser, LuMail, LuPhone, LuMapPin, LuShield, LuPencil, LuCheck, LuArrowLeft } from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { adminAPI } from "../../api/admin";
import { authAPI } from "../../api/auth";
import { isAdmin as userIsAdmin } from "../../utils/permissions";
import { useRoleOptions } from "../../hooks/useRoleOptions";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../hooks/useZoneCascade";

const ROLE_OPTIONS_FALLBACK = [
  { value: "recorder", label: "Recorder" },
  { value: "village_chief", label: "Village Chief" },
  { value: "commune_clerk", label: "Commune Clerk" },
  { value: "commune_chief", label: "Commune Chief" },
  { value: "district_chief", label: "District Chief" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

function formatDate(value) {
  if (!value || value.startsWith("0001-01-01")) return "-";
  return value.slice(0, 10);
}

function SignatureDrawPad({ value, onChange }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b"; // Slate-800

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      alert("សូមជ្រើសរើសតែរូបភាពប្រភេទ PNG ប៉ុណ្ណោះ! (Please upload PNG image only)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: "400px", height: "150px", border: "1px dashed #cbd5e1", borderRadius: "8px", background: "#f8fafc", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: "100%", height: "100%", cursor: "crosshair", display: "block" }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearCanvas}
          style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }}
        >
          លុបហត្ថលេខា
        </button>
        <label
          className="btn btn-secondary btn-sm"
          style={{
            padding: "0.2rem 0.6rem",
            fontSize: "0.78rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
          }}
        >
          📤 ផ្ទុកឡើងរូបភាព (PNG)
          <input
            type="file"
            accept="image/png"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { roleOptions, roleLabelMap } = useRoleOptions();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    zone_code: user?.zone_code || "",
    role: user?.role || "",
    signature: user?.signature || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = userIsAdmin(user);
  const displayRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);

  useEffect(() => {
    if (refreshProfile) refreshProfile();
  }, []);

  const zoneHook = useZoneCascade({
    userZone: user?.zone_code || "",
    isAdmin: isAdmin,
    initialZoneCode: user?.zone_code || "",
    showVillage: true,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (isAdmin) {
        await adminAPI.updateUser(user.id, {
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number || undefined,
          zone_code: zoneHook.resolvedZone || undefined,
          role: user.role, // role can't edit, keep original user role
          signature: form.signature || undefined,
        });
      } else {
        await authAPI.updateProfile({
          full_name: form.full_name,
          phone_number: form.phone_number || undefined,
          signature: form.signature || undefined,
        });
      }

      if (form.password) {
        await adminAPI.resetUserPassword(user.id, form.password);
      }
      setSuccess("បានរក្សាទុកដោយជោគជ័យ");
      setEditing(false);
      if (refreshProfile) refreshProfile();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "ការរក្សាទុកបរាជ័យ");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({
      full_name: user?.full_name || user?.name || "",
      email: user?.email || "",
      phone_number: user?.phone_number || "",
      zone_code: user?.zone_code || "",
      role: user?.role || "",
      signature: user?.signature || "",
      password: "",
    });
    setError("");
    if (user?.zone_code) {
      zoneHook.loadFromZoneCode(user.zone_code);
    } else {
      zoneHook.resetSelection();
    }
  };

  if (!user) {
    return <div className="loading">កំពុងផ្ទុក...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate(-1)} title="ត្រឡប់ក្រោយ">
            <LuArrowLeft />
          </button>
          <h2 className="section-title">ប្រវត្តិរូប</h2>
        </div>
        {!editing ? (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <LuPencil size={14} /> កែប្រែ
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
            បោះបង់
          </button>
        )}
      </div>

      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
          <div className="profile-avatar" style={{ width: 56, height: 56 }}>
            <LuUser size={28} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{user.full_name || user.name || "User"}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span className="profile-detail-value">
                {displayRoles.map((r) => (
                  <span key={r} className="badge" style={{ marginRight: "0.25rem" }}>
                    {roleLabelMap[r] || r}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>

        {!editing ? (
          <div className="profile-detail-grid">
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuUser size={14} /> ឈ្មោះ</span>
              <span className="profile-detail-value">{user.full_name || user.name || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuMail size={14} /> អ៊ីមែល</span>
              <span className="profile-detail-value">{user.email || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuPhone size={14} /> លេខទូរស័ព្ទ</span>
              <span className="profile-detail-value">{user.phone_number || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuMapPin size={14} /> តំបន់</span>
              <span className="profile-detail-value">{user.zone_name || user.zone_code || "-"}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label"><LuShield size={14} /> តួនាទី</span>
              <span className="profile-detail-value">
                {displayRoles.map((r) => (
                  <span key={r} className="badge" style={{ marginRight: "0.25rem" }}>
                    {roleLabelMap[r] || r}
                  </span>
                ))}
              </span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">ចូលប្រើតាំងពី</span>
              <span className="profile-detail-value">{formatDate(user.created_at)}</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</span>
              <span className="profile-detail-value">{formatDate(user.updated_at)}</span>
            </div>
            <div className="profile-detail-item" style={{ gridColumn: "span 2" }}>
              <span className="profile-detail-label"><LuPencil size={14} /> ហត្ថលេខា</span>
              <span className="profile-detail-value" style={{ marginTop: "0.5rem" }}>
                {user.signature ? (
                  <img
                    src={user.signature}
                    alt="ហត្ថលេខា"
                    style={{
                      maxHeight: "80px",
                      background: "#ffffff",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "8px",
                      padding: "4px",
                    }}
                  />
                ) : (
                  <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>មិនទាន់មានហត្ថលេខា</span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>ឈ្មោះ</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>អ៊ីមែល</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>លេខទូរស័ព្ទ</label>
              <input name="phone_number" value={form.phone_number} onChange={handleChange} />
            </div>
            {isAdmin && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", width: "100%", marginBottom: "1rem" }}>
                  <ZoneCascadeSelect hook={zoneHook} />
                </div>
                <div className="form-group">
                  <label>តួនាទី (មិនអាចកែប្រែបាន)</label>
                  <input
                    type="text"
                    value={roleLabelMap[user.role] || user.role}
                    disabled
                    style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label>ពាក្យសម្ងាត់ថ្មី (ទុកទទេរបើមិនប្តូរ)</label>
              <input
                name="password"
                type="text"
                value={form.password}
                onChange={handleChange}
                placeholder="ទុកទទេរ"
              />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}><LuPencil size={14} /> គូរហត្ថលេខា</label>
              <SignatureDrawPad
                value={form.signature}
                onChange={(val) => setForm((prev) => ({ ...prev, signature: val }))}
              />
            </div>
            <div className="profile-actions" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                បោះបង់
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "រក្សាទុក..." : <><LuCheck size={14} /> រក្សាទុក</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}