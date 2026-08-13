import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCheck, LuEye, LuFileCheck2, LuRefreshCw, LuSearch, LuShieldCheck, LuX } from "react-icons/lu";
import { membershipAPI } from "../../api/membership";
import { useToast } from "../../components/Toast";

const LABELS = { DRAFT: "ព្រាង", PENDING_VERIFICATION: "រង់ចាំផ្ទៀងផ្ទាត់", VERIFIED: "បានផ្ទៀងផ្ទាត់", APPROVED: "បានអនុម័ត", REJECTED: "បានបដិសេធ" };

export default function RegistrationQueue({ canReview }) {
  const navigate = useNavigate();
  const toast = useToast();
  const showError = toast.error;
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    membershipAPI.listRegistrations(status ? { status } : {}).then((response) => setRows(response.data?.data || response.data || [])).catch(() => showError("មិនអាចផ្ទុកពាក្យសុំបានទេ")).finally(() => setLoading(false));
  }, [showError, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const act = async (registration, action) => {
    try {
      if (action === "verify") await membershipAPI.verifyRegistration(registration.id, {});
      if (action === "approve") await membershipAPI.approveRegistration(registration.id, {});
      if (action === "reject") {
        const reason = window.prompt("សូមបញ្ចូលមូលហេតុបដិសេធ:");
        if (!reason?.trim()) return;
        await membershipAPI.rejectRegistration(registration.id, { reason: reason.trim() });
      }
      toast.success(action === "verify" ? "បានផ្ទៀងផ្ទាត់ពាក្យសុំ" : action === "approve" ? "បានអនុម័ត និងបង្កើតកាតសមាជិក" : "បានបដិសេធពាក្យសុំ");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "ប្រតិបត្តិការបរាជ័យ");
    }
  };

  const filtered = rows.filter((row) => `${row.registration_no} ${row.last_name_kh} ${row.first_name_kh} ${row.national_id}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="registration-queue">
    <div className="registration-queue-toolbar">
      <div className="registration-queue-search"><LuSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ស្វែងរកពាក្យសុំ ឈ្មោះ ឬអត្តសញ្ញាណប័ណ្ណ" /></div>
      <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">ស្ថានភាពទាំងអស់</option>{Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button className="btn-icon" title="ផ្ទុកឡើងវិញ" onClick={load}><LuRefreshCw /></button>
    </div>
    {loading ? <div className="loading">កំពុងផ្ទុក...</div> : filtered.length === 0 ? <div className="registration-empty"><LuFileCheck2 /><strong>មិនមានពាក្យសុំ</strong><span>ពាក្យសុំថ្មី និងព្រាងនឹងបង្ហាញនៅទីនេះ</span></div> : <div className="table-responsive"><table className="table registration-table"><thead><tr><th>លេខពាក្យសុំ</th><th>បេក្ខជន</th><th>អត្តសញ្ញាណប័ណ្ណ</th><th>ខ្សែចុះឈ្មោះ</th><th>ស្ថានភាព</th><th aria-label="សកម្មភាព" /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}>
      <td><strong>{row.registration_no}</strong><small>{row.created_at?.slice(0, 10)}</small></td>
      <td><strong>{row.last_name_kh} {row.first_name_kh}</strong><small>{row.last_name_en} {row.first_name_en}</small></td>
      <td>{row.national_id || "-"}</td><td>{row.registration_pathway === "Institutional" ? row.institutional_unit || "ស្ថាប័ន" : "ភូមិសាស្ត្រ"}</td>
      <td><span className={`registration-status status-${row.status.toLowerCase()}`}>{LABELS[row.status] || row.status}</span></td>
      <td><div className="registration-row-actions"><button className="btn-icon" title="មើល" onClick={() => navigate(`/membership/registrations/${row.id}/edit`)}><LuEye /></button>{canReview && row.status === "PENDING_VERIFICATION" && <><button className="btn-icon success" title="ផ្ទៀងផ្ទាត់" onClick={() => act(row, "verify")}><LuShieldCheck /></button><button className="btn-icon danger" title="បដិសេធ" onClick={() => act(row, "reject")}><LuX /></button></>}{canReview && row.status === "VERIFIED" && <><button className="btn-icon success" title="អនុម័ត" onClick={() => act(row, "approve")}><LuCheck /></button><button className="btn-icon danger" title="បដិសេធ" onClick={() => act(row, "reject")}><LuX /></button></>}</div></td>
    </tr>)}</tbody></table></div>}
  </div>;
}
