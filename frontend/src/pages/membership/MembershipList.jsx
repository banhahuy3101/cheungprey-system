import { useState, useEffect } from "react";
import { LuSearch, LuPencil, LuEye, LuBanknote, LuActivity, LuCreditCard, LuCheck, LuX, LuPrinter } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { membershipAPI } from "../../api/membership";
import Select from "../../components/Select";
import { SkeletonGrid } from "../../components/Skeleton";
import DataTable from "../../components/DataTable";

export default function MembershipList({
  members, search, setSearch,
  setStatusFilter,
  zoneFilter, setZoneFilter,
  roleFilter, setRoleFilter,
  setGenderFilter,
  page, setPage, total, loading,
  canApprove, canUpdate, onRefresh,
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

  const handlePrintRoster = () => {
    const listToPrint = selectedIds.length > 0
      ? members.filter(m => selectedIds.includes(m.id))
      : members;

    const win = window.open("", "_blank");
    if (!win) return;

    const rowsHtml = listToPrint.map((m, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold;">${m.membership_card_no || "—"}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold;">${m.last_name_kh || ""} ${m.first_name_kh || ""}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${m.gender === "Male" || m.gender === "ប្រុស" ? "ប្រុស" : "ស្រី"}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${m.phone_number || "—"}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${m.party_role || "សមាជិក"}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${m.join_date?.slice(0, 10) || "—"}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${statusLabel(m.status)}</td>
      </tr>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>បញ្ជីសមាជិក - ស្រុកជើងព្រៃ</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
            }
            body { font-family: 'Kantumruy Pro', 'Hanuman', 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #0f172a; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 18pt; color: #1e3a8a; }
            .header h4 { margin: 5px 0 0 0; font-size: 12pt; color: #475569; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; font-size: 10pt; }
            th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 8px; text-align: left; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11pt; text-align: center; }
            .signature-block { width: 220px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ព្រះរាជាណាចក្រកម្ពុជា · ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
            <h4>គណបក្សប្រជាជនកម្ពុជា គណៈកម្មាធិការបក្សស្រុកជើងព្រៃ</h4>
            <h3 style="margin-top: 15px; text-decoration: underline;">តារាងបញ្ជីឈ្មោះសមាជិកគណបក្ស</h3>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10pt; margin-bottom:10px;">
            <span>សរុបសមាជិក: <strong>${listToPrint.length} នាក់</strong></span>
            <span>កាលបរិច្ឆេទបោះពុម្ព: ${new Date().toLocaleDateString('km-KH')}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">ល.រ</th>
                <th>លេខប័ណ្ណ</th>
                <th>គោត្តនាម និង នាម</th>
                <th style="width: 50px; text-align: center;">ភេទ</th>
                <th>លេខទូរសព្ទ</th>
                <th>តួនាទីគណបក្ស</th>
                <th>ថ្ងៃចូលបក្ស</th>
                <th style="width: 70px; text-align: center;">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <div class="signature-block">
              <p>បានឃើញ និងពិនិត្យ</p>
              <p style="margin-top: 50px;"><strong>ប្រធានគណៈកម្មាធិការបក្សស្រុក</strong></p>
            </div>
            <div class="signature-block">
              <p>ថ្ងៃ........ខែ........ឆ្នាំ........ព.ស.២៥៧...</p>
              <p style="margin-top: 50px;"><strong>អ្នករៀបចំបញ្ជី</strong></p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

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
        <div className="form-group" style={{ marginLeft: "auto", flex: "0 0 auto" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrintRoster}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "8px", fontWeight: "600", fontSize: "0.82rem" }}
            title="បោះពុម្ពបញ្ជីសមាជិក (A4 Landscape)"
          >
            <LuPrinter size={16} /> បោះពុម្ពបញ្ជី
          </button>
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
      <DataTable
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={toggleSelect}
        onSelectAll={toggleAll}
        loading={loading}
        emptyMessage="មិនទាន់មានសមាជិក"
        columns={[
          {
            key: "idx",
            label: "#",
            width: "40px",
            render: (_, __, i) => (page - 1) * 20 + i + 1,
          },
          {
            key: "name",
            label: "ឈ្មោះខ្មែរ",
            render: (_, m) => (
              <MemberHoverCard member={m}>
                <span style={{ cursor: "pointer", fontWeight: "700", color: "#0f172a" }}>
                  {m.last_name_kh} {m.first_name_kh}
                </span>
              </MemberHoverCard>
            ),
          },
          {
            key: "gender",
            label: "ភេទ",
            width: "60px",
            render: (val) => (
              <span style={{ fontSize: "0.82rem" }}>
                {val === "Male" ? "ប្រុស" : val === "Female" ? "ស្រី" : "ផ្សេងៗ"}
              </span>
            ),
          },
          {
            key: "phone_number",
            label: "លេខទូរសព្ទ",
            render: (val) => <span style={{ fontSize: "0.85rem", color: "#475569" }}>{val || "—"}</span>,
          },
          {
            key: "party_role",
            label: "ឋានៈ",
            render: (val) => val || "សមាជិក",
          },
          {
            key: "status",
            label: "ស្ថានភាព",
            render: (val) => (
              <span className={`badge ${statusBadge(val)}`}>
                {statusLabel(val)}
              </span>
            ),
          },
          {
            key: "actions",
            label: "សកម្មភាព",
            align: "right",
            width: "180px",
            render: (_, m) => (
              <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem" }}>
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
                {canUpdate && <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/edit`)} title="កែប្រែ"><LuPencil /></button>}
                {m.status !== "Pending" && (
                  <>
                    <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/dues`)} title="បង់រំលោះ"><LuBanknote /></button>
                    <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/activity`)} title="សកម្មភាព"><LuActivity /></button>
                    <button className="btn-icon" onClick={() => navigate(`/membership/${m.id}/cards`)} title="កាត"><LuCreditCard /></button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={members}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
      />
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
