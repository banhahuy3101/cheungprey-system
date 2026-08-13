import { LuFileText, LuShield, LuUserCheck } from "react-icons/lu";

export default function AdminStats({ stats, total, users }) {
  const metrics = [
    [LuUserCheck, stats?.total_users ?? stats?.users_count ?? total ?? users.length ?? 0, "អ្នកប្រើប្រាស់សរុប"],
    [LuShield, stats?.total_members ?? stats?.members_count ?? 0, "សមាជិកបក្សសរុប"],
    [LuFileText, stats?.total_records ?? stats?.records_count ?? 0, "កំណត់ត្រាសរុប"],
  ];
  return <div className="rbac-metric-grid">{metrics.map(([Icon, value, label]) => <div className="rbac-metric" key={label}><div className="rbac-metric-icon"><Icon size={22} /></div><div><div className="rbac-metric-value">{value}</div><div className="rbac-metric-label">{label}</div></div></div>)}</div>;
}
