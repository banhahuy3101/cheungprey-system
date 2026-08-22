import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LuArrowLeft, LuUserCheck, LuTrash2, LuChevronRight, LuChevronDown,
  LuMapPin, LuBuilding2, LuHouse, LuTreePine, LuX, LuLoader, LuSearch,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { zoneChiefAPI } from "../../api/zoneChief";
import { adminAPI } from "../../api/admin";
import { partyAPI } from "../../api/party";
import FormInput from "../../components/FormInput";

const ZONE_TYPE = {
  Province: { label: "ខេត្ត", icon: LuMapPin, bg: "#e8eaf6", color: "#283593", border: "#5c6bc0" },
  District: { label: "ស្រុក", icon: LuBuilding2, bg: "#e0f2f1", color: "#00695c", border: "#26a69a" },
  Commune: { label: "ឃុំ", icon: LuHouse, bg: "#e8f5e9", color: "#2e7d32", border: "#66bb6a" },
  Village: { label: "ភូមិ", icon: LuTreePine, bg: "#fff3e0", color: "#e65100", border: "#ff9800" },
};

const CHILD_ZONE = {
  Province: "District",
  District: "Commune",
  Commune: "Village",
};

const TABS = [
  { key: "", label: "ទាំងអស់" },
  { key: "Province", label: "ខេត្ត" },
  { key: "District", label: "ស្រុក" },
  { key: "Commune", label: "ឃុំ" },
  { key: "Village", label: "ភូមិ" },
];

export default function SettingsZoneChief() {
  const navigate = useNavigate();
  const msgTimer = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [rootZones, setRootZones] = useState([]);
  const [zoneCounts, setZoneCounts] = useState({ Province: 0, District: 0, Commune: 0, Village: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState("");
  const [zoneSearch, setZoneSearch] = useState("");

  const [showAssign, setShowAssign] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [expandedNodes, setExpandedNodes] = useState({});
  const [childrenMap, setChildrenMap] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  const showMsg = (msg, isErr) => {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    if (isErr) {
      setError(msg); setMessage("");
      msgTimer.current = setTimeout(() => setError(""), 5000);
    } else {
      setMessage(msg); setError("");
      msgTimer.current = setTimeout(() => setMessage(""), 3000);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [assignRes, countsRes, userRes] = await Promise.all([
        zoneChiefAPI.list(),
        partyAPI.getZoneCounts(),
        adminAPI.getUsers(),
      ]);
      setAssignments(assignRes.data?.data ?? assignRes.data ?? []);
      setZoneCounts(countsRes.data?.data ?? countsRes.data ?? { Province: 0, District: 0, Commune: 0, Village: 0 });
      const userList = userRes.data?.data ?? userRes.data ?? [];
      setUsers(Array.isArray(userList) ? userList : []);
    } catch {
      setError("មិនអាចផ្ទុកទិន្នន័យ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const fetchRoots = async () => {
      setLoadingZones(true);
      setExpandedNodes({});
      setChildrenMap({});
      try {
        const zoneType = tab || "Province";
        const res = await partyAPI.getZones({ type: zoneType });
        const z = res.data?.data ?? res.data ?? [];
        if (!cancelled) setRootZones(Array.isArray(z) ? z : []);
      } catch {
        if (!cancelled) setRootZones([]);
      } finally {
        if (!cancelled) setLoadingZones(false);
      }
    };
    fetchRoots();
    return () => { cancelled = true; };
  }, [tab, loading]);

  const loadChildren = async (zoneCode) => {
    if (childrenMap[zoneCode]) return;
    setLoadingChildren((p) => ({ ...p, [zoneCode]: true }));
    try {
      const res = await partyAPI.getZones({ parent_code: zoneCode });
      const kids = res.data?.data ?? res.data ?? [];
      setChildrenMap((p) => ({ ...p, [zoneCode]: Array.isArray(kids) ? kids : [] }));
    } catch {
      setChildrenMap((p) => ({ ...p, [zoneCode]: [] }));
    } finally {
      setLoadingChildren((p) => ({ ...p, [zoneCode]: false }));
    }
  };

  const assignmentMap = useMemo(() => {
    const m = {};
    for (const a of assignments) m[a.zone_code] = a;
    return m;
  }, [assignments]);

  const assignedSet = useMemo(() => new Set(Object.keys(assignmentMap)), [assignmentMap]);

  const assignedCounts = useMemo(() => {
    const c = { Province: 0, District: 0, Commune: 0, Village: 0 };
    for (const a of assignments) {
      if (a.zone_type && c[a.zone_type] !== undefined) c[a.zone_type]++;
    }
    return c;
  }, [assignments]);

  const toggleExpand = async (zoneCode, zoneType) => {
    const isExpanded = expandedNodes[zoneCode];
    if (!isExpanded && !childrenMap[zoneCode]) {
      await loadChildren(zoneCode);
    }
    setExpandedNodes((prev) => ({ ...prev, [zoneCode]: !prev[zoneCode] }));
  };

  const handleAssign = async () => {
    if (!selectedZone || !selectedUser) return;
    setSaving(true);
    try {
      await zoneChiefAPI.assign({ zone_code: selectedZone.zone_code, user_id: selectedUser });
      showMsg("ចាត់តាំងជោគជ័យ");
      setShowAssign(false);
      await load();
    } catch {
      showMsg("មិនអាចចាត់តាំង", true);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (zoneCode, name) => {
    if (!confirm(`លុបការចាត់តាំង ${name || zoneCode}?`)) return;
    setSaving(true);
    try {
      await zoneChiefAPI.remove(zoneCode);
      showMsg("បានលុបការចាត់តាំង");
      await load();
    } catch {
      showMsg("មិនអាចលុប", true);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const lower = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower) ||
        u.zone_name?.toLowerCase().includes(lower),
    );
  }, [users, userSearch]);

  const filteredZones = useMemo(() => {
    if (!zoneSearch.trim()) return rootZones;
    const lower = zoneSearch.toLowerCase();
    return rootZones.filter(
      (z) =>
        z.name_kh?.toLowerCase().includes(lower) ||
        z.name_en?.toLowerCase().includes(lower) ||
        z.zone_code?.toLowerCase().includes(lower),
    );
  }, [rootZones, zoneSearch]);

  const renderZoneNode = (zone, parentBg) => {
    const zoneType = zone.zone_type;
    const childType = CHILD_ZONE[zoneType];
    const hasChildren = childType != null;
    const isLoading = loadingChildren[zone.zone_code];
    const expanded = expandedNodes[zone.zone_code];
    const kids = childrenMap[zone.zone_code];
    const hasChef = assignedSet.has(zone.zone_code);
    const a = assignmentMap[zone.zone_code];
    const t = ZONE_TYPE[zoneType] || ZONE_TYPE.Village;
    const Icon = t.icon;

    const showExpand = hasChildren;
    const hasLoadedKids = kids?.length > 0;
    const showKids = showExpand && expanded && hasLoadedKids;

    return (
      <div key={zone.zone_code}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.55rem 0.85rem", borderBottom: "1px solid #f0f0f0",
            fontSize: "0.84rem", transition: "background 0.15s", background: "transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fafbff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {showExpand ? (
            <button
              style={{
                width: 28, height: 28, border: "none", background: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", borderRadius: "6px", flexShrink: 0,
              }}
              onClick={() => toggleExpand(zone.zone_code, zoneType)}
            >
              {isLoading ? <LuLoader size={14} style={{ animation: "spin 1s linear infinite" }} />
              : expanded ? <LuChevronDown size={16} />
              : <LuChevronRight size={16} />}
            </button>
          ) : (
            <span style={{ width: 28, flexShrink: 0 }} />
          )}

          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              padding: "0.2rem 0.55rem", borderRadius: "20px", fontSize: "0.68rem",
              fontWeight: 600, background: t.bg, color: t.color, flexShrink: 0, whiteSpace: "nowrap",
            }}
          >
            <Icon size={12} /> {t.label}
          </span>

          <span style={{ flex: 1, fontWeight: 500 }}>
            {zone.name_kh || zone.name_en}
            <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "0.5rem", fontSize: "0.72rem" }}>
              {zone.zone_code}
            </span>
          </span>

          {hasChef ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.25rem 0.65rem", borderRadius: "20px",
                background: "#ecfdf5", color: "#065f46", fontSize: "0.78rem", fontWeight: 600,
              }}>
                <LuUserCheck size={14} /> {a.user_name}
              </span>
              <button
                style={{
                  width: 30, height: 30, border: "1px solid #fecaca", borderRadius: "8px",
                  background: "#fff", color: "#dc2626", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onClick={() => handleRemove(zone.zone_code, zone.name_kh)}
                title="លុប"
              >
                <LuTrash2 size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => {
                setSelectedZone(zone);
                setSelectedUser("");
                setUserSearch("");
                setShowAssign(true);
              }}
            >
              + ចាត់តាំង
            </button>
          )}
        </div>

        {showKids && (
          <div style={{ borderLeft: `3px solid ${t.border}`, marginLeft: "1.2rem" }}>
            {kids.map((child) => renderZoneNode(child, t.bg))}
          </div>
        )}

        {showExpand && expanded && !hasLoadedKids && !isLoading && (
          <div style={{ padding: "0.4rem 0.85rem 0.4rem 2.2rem", color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
            គ្មាន{subChildLabel(childType)}
          </div>
        )}
      </div>
    );
  };

  const subChildLabel = (type) => type === "District" ? "ស្រុក" : type === "Commune" ? "ឃុំ" : type === "Village" ? "ភូមិ" : "";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft size={20} />
          </button>
          <h2 className="section-title">កំណត់ប្រធានភូមិសាស្ត្រ</h2>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {["Province", "District", "Commune", "Village"].map((type) => {
            const t = ZONE_TYPE[type];
            const Icon = t.icon;
            const total = zoneCounts[type] || 0;
            const assigned = assignedCounts[type] || 0;
            const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
            return (
              <div
                key={type}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  padding: "1rem", display: "flex", alignItems: "center", gap: "0.85rem",
                  cursor: "pointer", transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "var(--shadow)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                onClick={() => setTab(tab === type ? "" : type)}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: "10px", display: "flex",
                  alignItems: "center", justifyContent: "center", background: t.bg, color: t.color, flexShrink: 0,
                }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{t.label}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>
                    {assigned}<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>/{total}</span>
                  </div>
                  <div style={{ marginTop: "0.2rem", height: 4, borderRadius: 2, background: "#f0f0f0" }}>
                    <div style={{ height: 4, borderRadius: 2, background: t.color, width: `${pct}%`, transition: "width 0.3s" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              height: 44, borderRadius: "8px",
              background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
              width: `${85 - i * 5}%`,
            }} />
          ))}
          <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
        <div style={{ marginBottom: "0.75rem" }}>
          <FormInput
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ ឬ zone code..."
            value={zoneSearch}
            onChange={(e) => setZoneSearch(e.target.value)}
            leadIcon={<LuSearch size={16} style={{ color: "var(--text-muted)" }} />}
            tailIcon={
              zoneSearch ? (
                <button
                  onClick={() => setZoneSearch("")}
                  style={{
                    border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "6px",
                  }}
                  title="សម្អាត"
                >
                  <LuX size={16} />
                </button>
              ) : null
            }
          />
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
          {loadingZones ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              <LuLoader size={24} className="spin" style={{ marginBottom: "0.5rem" }} />
              <div>កំពុងផ្ទុកទិន្នន័យ...</div>
            </div>
          ) : filteredZones.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              <LuMapPin size={32} style={{ marginBottom: "0.5rem", opacity: 0.3 }} />
              <div>{zoneSearch ? `គ្មានលទ្ធផលសម្រាប់ "${zoneSearch}"` : `គ្មានទិន្នន័យ${tab ? ZONE_TYPE[tab]?.label || "" : "ខេត្ត"}`}</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredZones.map((zone) => renderZoneNode(zone))}
            </div>
          )}
        </div>
        </>
      )}

      {showAssign && selectedZone && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header" style={{ justifyContent: "space-between" }}>
              <h3>ចាត់តាំងប្រធាន</h3>
              <button className="btn-icon" onClick={() => setShowAssign(false)} style={{ border: "none", width: 32, height: 32 }}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ padding: "0.85rem", borderRadius: "10px", border: "1px solid var(--border)", background: "#fafbfd", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {(() => {
                    const tz = ZONE_TYPE[selectedZone.zone_type] || ZONE_TYPE.Village;
                    const Icon = tz.icon;
                    return (
                      <span style={{ width: 36, height: 36, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: tz.bg, color: tz.color }}>
                        <Icon size={18} />
                      </span>
                    );
                  })()}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{selectedZone.name_kh}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {ZONE_TYPE[selectedZone.zone_type]?.label || selectedZone.zone_type} · {selectedZone.zone_code}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>ជ្រើសរើសអ្នកទទួលបន្ទុក</label>
                <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                  <LuSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input placeholder="ស្វែងរកតាមឈ្មោះឬអ៊ីមែល..." value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)} style={{ paddingLeft: "2rem" }} autoFocus />
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "10px", background: "#fff" }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>គ្មានអ្នកប្រើប្រាស់</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUser === u.id;
                      return (
                        <div key={u.id} style={{
                          display: "flex", alignItems: "center", gap: "0.6rem",
                          padding: "0.6rem 0.85rem", cursor: "pointer", borderBottom: "1px solid #f5f5f5",
                          background: isSelected ? "#eff6ff" : "transparent",
                          borderLeft: isSelected ? "3px solid var(--primary)" : "3px solid transparent",
                          transition: "background 0.15s",
                        }} onClick={() => setSelectedUser(u.id)}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            background: isSelected ? "var(--primary)" : "#e2e8f0",
                            color: isSelected ? "#fff" : "var(--text-muted)",
                            fontWeight: 600, fontSize: "0.85rem", flexShrink: 0,
                          }}>
                            {(u.full_name || "?")[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: "0.88rem" }}>{u.full_name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {u.email}{u.zone_name ? ` · ${u.zone_name}` : ""}
                            </div>
                          </div>
                          {isSelected && (
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <LuUserCheck size={12} color="#fff" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowAssign(false)}>បោះបង់</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={saving || !selectedUser}>
                {saving ? "កំពុងរក្សាទុក..." : "ចាត់តាំង"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
