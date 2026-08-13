import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuUser,
  LuMail,
  LuPhone,
  LuMapPin,
  LuShield,
  LuPencil,
  LuCheck,
  LuArrowLeft,
  LuCalendar,
  LuCircleCheck,
  LuFileText,
  LuUpload,
  LuTrash2,
  LuKey,
  LuRefreshCw,
} from "react-icons/lu";
import { useAuth } from "../../hooks/useAuth";
import { adminAPI } from "../../api/admin";
import { authAPI } from "../../api/auth";
import { partyAPI } from "../../api/party";
import { isAdmin as userIsAdmin } from "../../utils/permissions";
import { useRoleOptions } from "../../hooks/useRoleOptions";
import ZoneCascadeSelect from "../../components/ZoneCascadeSelect";
import { useZoneCascade } from "../../hooks/useZoneCascade";
import { unwrapZone } from "../../utils/zone";

function formatDate(value) {
  if (!value || value.startsWith("0001-01-01")) return "-";
  return value.slice(0, 10);
}

function getInitials(name) {
  if (!name) return "U";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const first = Array.from(parts[0])[0] || "";
    const last = Array.from(parts[parts.length - 1])[0] || "";
    return (first + last).toUpperCase();
  }
  return Array.from(trimmed).slice(0, 2).join("").toUpperCase();
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
    ctx.strokeStyle = "#0f172a";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "480px",
        height: "160px",
        border: "1.5px dashed #cbd5e1",
        borderRadius: "12px",
        background: "#ffffff",
        backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        overflow: "hidden",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
      }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
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
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearCanvas}
          style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <LuTrash2 size={14} /> លុបហត្ថលេខា
        </button>
        <label
          className="btn btn-secondary btn-sm"
          style={{
            padding: "0.3rem 0.75rem",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          <LuUpload size={14} /> ផ្ទុកឡើងរូបភាព (PNG)
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
  const { roleLabelMap } = useRoleOptions();

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

  const [zoneLabel, setZoneLabel] = useState(user?.zone_name || user?.zone_code || "");

  useEffect(() => {
    if (refreshProfile) refreshProfile();
  }, []);

  useEffect(() => {
    const zCode = user?.zone_code;
    if (!zCode) {
      setZoneLabel(user?.zone_name || "—");
      return;
    }
    let isMounted = true;
    partyAPI.getZones({ code: zCode })
      .then((res) => {
        if (!isMounted) return;
        const zone = unwrapZone(res);
        setZoneLabel(zone?.name_kh || user?.zone_name || zCode);
      })
      .catch(() => {
        if (isMounted) setZoneLabel(user?.zone_name || zCode);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.zone_code, user?.zone_name]);

  const zoneHook = useZoneCascade({
    userZone: user?.zone_code || "",
    isAdmin: isAdmin,
    initialZoneCode: user?.zone_code || "",
    showVillage: true,
  });

  useEffect(() => {
    if (user && !editing) {
      setForm({
        full_name: user?.full_name || user?.name || "",
        email: user?.email || "",
        phone_number: user?.phone_number || "",
        zone_code: user?.zone_code || "",
        role: user?.role || "",
        signature: user?.signature || "",
        password: "",
      });
    }
  }, [user, editing]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const startEditing = () => {
    const freshZone = user?.zone_code || "";
    setForm({
      full_name: user?.full_name || user?.name || "",
      email: user?.email || "",
      phone_number: user?.phone_number || "",
      zone_code: freshZone,
      role: user?.role || "",
      signature: user?.signature || "",
      password: "",
    });
    setError("");
    setSuccess("");
    if (freshZone) {
      zoneHook.loadFromZoneCode(freshZone);
    } else {
      zoneHook.resetSelection();
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const resolvedZone = zoneHook.resolvedZone || form.zone_code;
      if (isAdmin) {
        await adminAPI.updateUser(user.id, {
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number || undefined,
          zone_code: resolvedZone || undefined,
          role: user.role,
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
      setSuccess("បានរក្សាទុកប្រវត្តិរូបដោយជោគជ័យ!");
      setEditing(false);
      if (refreshProfile) await refreshProfile();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "ការរក្សាទុកប្រវត្តិរូបបរាជ័យ");
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
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
          <LuRefreshCw className="animate-spin" size={20} /> กำลังផ្ទុកប្រវត្តិរូប...
        </div>
      </div>
    );
  }

  const userName = user.full_name || user.name || "User";

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate(-1)} title="ត្រឡប់ក្រោយ">
            <LuArrowLeft size={18} />
          </button>
          <h2 className="section-title">ប្រវត្តិរូបគណនី</h2>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>{success}</div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>
      )}

      {/* Hero Profile Banner Card */}
      <div className="profile-hero-card">
        <div className="profile-cover-banner" />
        <div className="profile-hero-body">
          <div className="profile-user-group">
            <div className="profile-avatar-wrapper">
              {getInitials(userName)}
              <span className="profile-online-badge" title="សកម្ម (Online)" />
            </div>
            <div className="profile-identity-info">
              <div className="profile-display-name">
                {userName}
                <LuCircleCheck style={{ color: "#10b981", fontSize: "1.2rem" }} title="គណនីបានផ្ទៀងផ្ទាត់" />
              </div>
              <div className="profile-meta-row">
                <span className="profile-status-active">
                  ● សកម្ម
                </span>
                {displayRoles.map((r) => (
                  <span key={r} className="profile-role-badge">
                    <LuShield size={12} /> {roleLabelMap[r] || r}
                  </span>
                ))}
                {(zoneLabel || user.zone_name || user.zone_code) && (
                  <span className="profile-meta-item">
                    <LuMapPin size={14} style={{ color: "#818cf8" }} />
                    {zoneLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {!editing ? (
              <button className="btn btn-primary" onClick={startEditing}>
                <LuPencil size={15} /> កែប្រែប្រវត្តិរូប
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                បោះបង់
              </button>
            )}
          </div>
        </div>
      </div>

      {!editing ? (
        <>
          {/* Executive Info Tile Grid */}
          <div className="profile-grid-container">
            <div className="profile-info-tile">
              <div className="profile-tile-icon blue">
                <LuUser />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">ឈ្មោះពេញ</span>
                <span className="profile-tile-value">{user.full_name || user.name || "-"}</span>
              </div>
            </div>

            <div className="profile-info-tile">
              <div className="profile-tile-icon sky">
                <LuMail />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">អាសយដ្ឋានអ៊ីមែល</span>
                <span className="profile-tile-value">{user.email || "-"}</span>
              </div>
            </div>

            <div className="profile-info-tile">
              <div className="profile-tile-icon emerald">
                <LuPhone />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">លេខទូរស័ព្ទ</span>
                <span className="profile-tile-value">{user.phone_number || "-"}</span>
              </div>
            </div>

            <div className="profile-info-tile">
              <div className="profile-tile-icon indigo">
                <LuMapPin />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">តំបន់ / ទីតាំង</span>
                <span className="profile-tile-value" title={zoneLabel}>{zoneLabel || "-"}</span>
              </div>
            </div>

            <div className="profile-info-tile">
              <div className="profile-tile-icon amber">
                <LuShield />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">តួនាទី និងសិទ្ធិ</span>
                <span className="profile-tile-value">
                  {displayRoles.map((r) => roleLabelMap[r] || r).join(", ") || "-"}
                </span>
              </div>
            </div>

            <div className="profile-info-tile">
              <div className="profile-tile-icon slate">
                <LuCalendar />
              </div>
              <div className="profile-tile-content">
                <span className="profile-tile-label">ចូលប្រើប្រាស់ដំបូង</span>
                <span className="profile-tile-value">{formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Digital Signature Card */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div className="profile-section-title">
                <LuFileText style={{ color: "var(--primary)" }} /> ហត្ថលេខាឌីជីថលផ្លូវការ
              </div>
              {user.signature ? (
                <span className="profile-status-active">● បានផ្ទៀងផ្ទាត់</span>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>មិនទាន់មាន</span>
              )}
            </div>
            <div className="signature-display-box">
              {user.signature ? (
                <img src={user.signature} alt="ហត្ថលេខា" className="signature-preview-img" />
              ) : (
                <span className="signature-empty-text">
                  <LuFileText size={18} /> មិនទាន់មានហត្ថលេខាឌីជីថល (ចុច "កែប្រែប្រវត្តិរូប" ដើម្បីគូរ ឬផ្ទុកឡើង)
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Edit Mode Form Card */
        <div className="card">
          <div className="profile-section-header" style={{ marginBottom: "1.25rem" }}>
            <div className="profile-section-title">
              <LuPencil style={{ color: "var(--primary)" }} /> កែប្រែព័ត៌មានប្រវត្តិរូប
            </div>
          </div>

          <div className="profile-edit-grid">
            <div className="form-group">
              <label><LuUser size={14} /> ឈ្មោះពេញ</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="បញ្ចូលឈ្មោះពេញ" />
            </div>

            <div className="form-group">
              <label><LuMail size={14} /> អ៊ីមែល</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@domain.com" />
            </div>

            <div className="form-group">
              <label><LuPhone size={14} /> លេខទូរស័ព្ទ</label>
              <input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="012 345 678" />
            </div>

            <div className="form-group">
              <label><LuKey size={14} /> ពាក្យសម្ងាត់ថ្មី</label>
              <input
                name="password"
                type="text"
                value={form.password}
                onChange={handleChange}
                placeholder="ទុកទទេរបើមិនចង់ប្តូរពាក្យសម្ងាត់"
              />
            </div>
          </div>

          {isAdmin && (
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem", display: "block" }}>
                <LuMapPin size={14} /> ជ្រើសរើសតំបន់/ទីតាំង (Zone)
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <ZoneCascadeSelect hook={zoneHook} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
              <LuFileText size={15} style={{ color: "var(--primary)" }} /> ហត្ថលេខាឌីជីថល (គូរ ឬផ្ទុកឡើង)
            </label>
            <SignatureDrawPad
              value={form.signature}
              onChange={(val) => setForm((prev) => ({ ...prev, signature: val }))}
            />
          </div>

          <div className="profile-actions">
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
              {saving ? "កំពុងរក្សាទុក..." : <><LuCheck size={16} /> រក្សាទុកព័ត៌មាន</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}