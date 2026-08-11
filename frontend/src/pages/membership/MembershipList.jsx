import { useState, useEffect } from "react";
import { LuSearch, LuPencil, LuEye, LuBanknote, LuActivity, LuCreditCard, LuChevronDown, LuChevronUp, LuCheck, LuX } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { membershipAPI, approvalsAPI } from "../../api/membership";
import Select from "../../components/Select";
import EmptyState from "../../components/EmptyState";
import { SkeletonTable, SkeletonGrid } from "../../components/Skeleton";

export default function MembershipList({
  members, search, setSearch,
  statusFilter, setStatusFilter,
  zoneFilter, setZoneFilter,
  roleFilter, setRoleFilter,
  genderFilter, setGenderFilter,
  page, setPage, total, loading,
  canApprove, onRefresh,
}) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const totalPages = Math.ceil(total / 20);

  useEffect(() => {
    membershipAPI.getStats().then((res) => {
      setStats(res.data?.data || res.data);
    }).catch(() => {});
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === members.length && members.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.id));
    }
  };

  const statusBadge = (s) => {
    const map = { Pending: "badge-info", Active: "badge-success", Suspended: "badge-warning", Resigned: "badge-danger", Expelled: "badge-danger", Deceased: "badge-danger" };
    return map[s] || "badge";
  };

  const statusLabel = (s) => {
    const map = { Pending: "រង់ចាំ", Active: "សកម្ម", Suspended: "ផ្អាក", Resigned: "លាឈប់", Expelled: "បណ្តេញ", Deceased: "មរណភាព" };
    return map[s] || s;
  };

  const approveMember = async (id) => {
    try {
      await membershipAPI.approve(id);
      onRefresh?.();
    } catch (e) {
      alert(e.response?.data?.error || "Failed");
    }
  };

  const rejectMember = async (m) => {
    const reason = window.prompt(`Reject ${m.last_name_kh} ${m.first_name_kh}\nReason:`);
    if (!reason) return;
    try {
      await membershipAPI.reject(m.id, { reason });
      onRefresh?.();
    } catch (e) {
      alert(e.response?.data?.error || "Failed");
    }
  };

  const filterPills = [
    { key: "status", value: "Active", label: "សកម្ម", color: "var(--success)" },
    { key: "status", value: "Suspended", label: "ផ្អាក", color: "var(--warning)" },
    { key: "status", value: "Pending", label: "រង់ចាំ", color: "var(--primary)" },
    { key: "gender", value: "Male", label: "ប្រុស", color: "#3b82f6" },
    { key: "gender", value: "Female", label: "ស្រី", color: "#ec4899" },
  ];

  return (
    <>
      {/* Stats bar */}
      {loading ? (
        <div style={{ marginBottom: "1rem" }}><SkeletonGrid count={4} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          <StatCard value={stats?.total_members || members.length} label="សមាជិកសរុប" color="var(--primary)" />
          <StatCard value={stats?.active_members || 0} label="សកម្ម" color="var(--success)" />
          <StatCard value={stats?.new_this_month || 0} label="ថ្មីខែនេះ" color="#3b82f6" />
          <StatCard value={`$${stats?.dues_this_month || 0}`} label="រំលោះខែនេះ" color="#d97706" />
        </div>
      )}

      {/* Quick filter pills */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button
          className={`btn ${statusFilter || roleFilter || genderFilter ? "btn-secondary" : "btn-primary"}`}
          style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
          onClick={() => { setStatusFilter(""); setRoleFilter(""); setGenderFilter(""); setPage(1); }}
        >
          ទាំងអស់
        </button>
        {filterPills.map((p) => (
          <button
            key={`${p.key}-${p.value}`}
            className="btn btn-secondary"
            style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderColor: p.color, color: p.color }}
            onClick={() => {
              if (p.key === "status") { setStatusFilter(statusFilter === p.value ? "" : p.value); setRoleFilter(""); setGenderFilter(""); }
              if (p.key === "gender") { setGenderFilter(genderFilter === p.value ? "" : p.value); setStatusFilter(""); setRoleFilter(""); }
              setPage(1);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="search-bar" style={{ marginBottom: "0.5rem" }}>
        <LuSearch className="search-icon" />
        <input
          type="text"
          placeholder="ស្វែងរកតាមឈ្មោះ លេខទូរសព្ទ លេខសមាជិក..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="form-row" style={{ marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <div className="form-group" style={{ minWidth: "100px", flex: "0 0 auto" }}>
          <input
            type="text"
            placeholder="លេខកូដតំបន់..."
            value={zoneFilter}
            onChange={(e) => { setZoneFilter(e.target.value); setPage(1); }}
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem" }}
          />
        </div>
        <div className="form-group" style={{ minWidth: "100px", flex: "0 0 auto" }}>
          <Select name="role" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setStatusFilter(""); setGenderFilter(""); setPage(1); }}>
            <option value="">ឋានៈទាំងអស់</option>
            <option value="Member">Member</option>
            <option value="Board Member">Board Member</option>
            <option value="Committee Member">Committee Member</option>
            <option value="Officer">Officer</option>
            <option value="Advisor">Advisor</option>
          </Select>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", padding: "0.6rem 1rem", background: "#eff6ff", borderRadius: "var(--radius)" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--primary)" }}>
            {selectedIds.length} សមាជិកបានជ្រើសរើស
          </span>
          <button className="btn btn-secondary" style={{ fontSize: "0.8rem" }} onClick={() => setSelectedIds([])}>
            សម្អាត
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "0.8rem" }} onClick={async () => {
            const ids = selectedIds.join(",");
            try {
              const res = await membershipAPI.export({ ids });
              const data = res.data?.data || res.data;
              const csv = jsonToCSV(data);
              downloadFile(csv, `membership-export-${new Date().toISOString().slice(0,10)}.csv`, "text/csv");
            } catch {
              alert("ការនាំចេញបរាជ័យ");
            }
          }}>
            នាំចេញ
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : members.length === 0 ? (
        <EmptyState type="search" actionLabel="បន្ថែមសមាជិកថ្មី" onAction={() => navigate("/membership/create")} />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input type="checkbox" checked={selectedIds.length === members.length && members.length > 0} onChange={toggleAll} />
                </th>
                <th>#</th>
                <th>ឈ្មោះខ្មែរ</th>
                <th>ភេទ</th>
                <th>លេខទូរសព្ទ</th>
                <th>ឋានៈ</th>
                <th>ស្ថានភាព</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                  <td>{(page - 1) * 20 + i + 1}</td>
                  <td>
                    <MemberHoverCard member={m}>
                      <span style={{ cursor: "pointer" }}>{m.last_name_kh} {m.first_name_kh}</span>
                    </MemberHoverCard>
                  </td>
                  <td><span style={{ fontSize: "0.82rem" }}>{m.gender === "Male" ? "ប្រុស" : m.gender === "Female" ? "ស្រី" : "ផ្សេងៗ"}</span></td>
                  <td style={{ fontSize: "0.85rem" }}>{m.phone_number}</td>
                  <td>{m.party_role}</td>
                  <td><span className={`badge ${statusBadge(m.status)}`}>{statusLabel(m.status)}</span></td>
                  <td>
                    <div className="actions">
                      {canApprove && m.status === "Pending" && (
                        <>
                          <button
                            className="btn-icon"
                            style={{ color: "var(--success)" }}
                            title="យល់ព្រម"
                            onClick={() => approveMember(m.id)}
                          ><LuCheck /></button>
                          <button
                            className="btn-icon"
                            style={{ color: "var(--danger)" }}
                            title="បដិសេធ"
                            onClick={() => rejectMember(m)}
                          ><LuX /></button>
                        </>
                      )}
                      <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}`)} title="មើល"><LuEye /></button>
                      <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/edit`)} title="កែប្រែ"><LuPencil /></button>
                      {m.status !== "Pending" && (
                        <>
                          <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/dues`)} title="បង់រំលោះ"><LuBanknote /></button>
                          <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/activity`)} title="សកម្មភាព"><LuActivity /></button>
                          <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/cards`)} title="កាត"><LuCreditCard /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>មុន</button>
          <span>ទំព័រ {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>បន្ទាប់</button>
        </div>
      )}
    </>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="card" style={{ padding: "0.85rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color, marginBottom: "0.15rem" }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function jsonToCSV(arr) {
  if (!arr || arr.length === 0) return "";
  const headers = Object.keys(arr[0]);
  const rows = arr.map(row =>
    headers.map(h => {
      const v = row[h] != null ? String(row[h]) : "";
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadFile(content, filename, mime) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MemberHoverCard({ member, children }) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState(null);

  const show = () => {
    const t = setTimeout(() => setOpen(true), 400);
    setTimer(t);
  };
  const hide = () => {
    clearTimeout(timer);
    setOpen(false);
  };

  return (
    <span style={{ position: "relative" }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 100,
          background: "#fff", border: "1px solid var(--border)", borderRadius: "10px",
          padding: "0.75rem", minWidth: "200px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "0.25rem", fontSize: "0.85rem" }}>
            {member.last_name_en} {member.first_name_en}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            <div>{member.membership_card_no}</div>
            <div>{member.phone_number}</div>
            <div>{member.party_role} · {member.membership_type}</div>
            <div><span className={`badge ${member.status === "Active" ? "badge-success" : member.status === "Suspended" ? "badge-warning" : "badge"}`}>{member.status}</span></div>
          </div>
        </div>
      )}
    </span>
  );
}
