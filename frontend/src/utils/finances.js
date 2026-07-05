export const FMS_TXN_STATUS = {
  draft: { label: "ព្រាង", badge: "badge-draft" },
  pending_approval: { label: "រង់ចាំអនុម័ត", badge: "badge-pending_approval" },
  executed: { label: "បានអនុវត្ត", badge: "badge-executed" },
  rejected: { label: "បដិសេធ", badge: "badge-rejected" },
};

export const FMS_BUDGET_STATUS = {
  draft: { label: "ព្រាង", badge: "badge-draft" },
  approved: { label: "បានអនុម័ត", badge: "badge-executed" },
  active: { label: "សកម្ម", badge: "badge-executed" },
};

export const FMS_ACCOUNT_TYPES = [
  { value: "asset", label: "ទ្រព្យសកម្ម", badge: "badge-asset" },
  { value: "liability", label: "បំណុល", badge: "badge-liability" },
  { value: "revenue", label: "ចំណូល", badge: "badge-revenue" },
  { value: "expense", label: "ចំណាយ", badge: "badge-expense" },
];

export const FMS_FISCAL_YEARS = [2024, 2025, 2026, 2027];

export function formatFMSUSD(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return "$0";
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function apiMessage(err, fallback) {
  return err?.response?.data?.error || err?.response?.data?.message || fallback;
}

export function accountsForTxnType(accounts, type) {
  const want = type === "expense" ? "expense" : "revenue";
  return (accounts || []).filter((a) => a.is_active !== false && a.account_type === want);
}

export function accountLabel(a) {
  if (!a) return "";
  return `${a.account_code} — ${a.name_kh || a.account_name_kh || a.name_en || ""}`;
}

export function progressClass(pct) {
  if (pct > 90) return "fms-progress-danger";
  if (pct > 70) return "fms-progress-warn";
  return "";
}
