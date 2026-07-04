export const TRANSACTION_TYPES = [
  { value: "Donation", label: "ការបរិច្ចាគ" },
  { value: "Event Fundraising", label: "ប្រមូលថវិកាព្រឹត្តិការណ៍" },
  { value: "Expense", label: "ចំណាយ" },
];

export const PAYMENT_METHODS = [
  { value: "Bakong/KHQR", label: "Bakong/KHQR" },
  { value: "Cash", label: "សាច់ប្រាក់" },
  { value: "Bank Transfer", label: "ផ្ទេរធនាគារ" },
  { value: "Other", label: "ផ្សេងៗ" },
];

export const TYPE_LABELS = Object.fromEntries(
  TRANSACTION_TYPES.map(({ value, label }) => [value, label])
);

export const PAYMENT_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map(({ value, label }) => [value, label])
);

export function isExpense(type) {
  return type === "Expense";
}

export const FINANCE_MODES = {
  income: {
    label: "ចំណូល",
    direction: "income",
    defaultType: "Donation",
    heroSub: "កត់ត្រា និងតាមដានចំណូល (បរិច្ចាគ ប្រមូលថវិកា)",
  },
  expense: {
    label: "ចំណាយ",
    direction: "expense",
    defaultType: "Expense",
    heroSub: "កត់ត្រា និងតាមដានចំណាយតាមឃុំ",
  },
};

export function typesForMode(mode) {
  if (mode === "expense") {
    return TRANSACTION_TYPES.filter((t) => t.value === "Expense");
  }
  if (mode === "income") {
    return TRANSACTION_TYPES.filter((t) => t.value !== "Expense");
  }
  return TRANSACTION_TYPES;
}

export function canModifyFinance(finance, user, canApprove) {
  if (!finance) return false;
  const status = finance.status || "approved";
  if (status === "approved" || status === "submitted") {
    return canApprove;
  }
  if (user?.id && finance.created_by === user.id) return true;
  return canApprove || user?.role === "super_admin" || user?.role === "admin";
}

export function workflowActionLabel(action) {
  switch (action) {
    case "submit": return "បានដាក់ស្នើ";
    case "approve": return "បានអនុម័ត";
    case "reject": return "បានបដិសេធ";
    default: return "បានរក្សាទុក";
  }
}

export function formatUSD(val) {
  const num = Number(val);
  if (isNaN(num)) return "$0";
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatKHR(val) {
  const num = Number(val);
  if (isNaN(num) || num === 0) return null;
  return `${num.toLocaleString()} ៛`;
}

export const initialFinanceForm = {
  transaction_type: "Donation",
  amount_usd: "",
  amount_khr: "",
  payment_method: "Cash",
  transaction_date: new Date().toISOString().slice(0, 10),
  contributor_name_kh: "",
  contributor_name_en: "",
  member_id: "",
  reference_number: "",
  notes: "",
};

export function formToFinancePayload(form, zoneCode) {
  const payload = {
    transaction_type: form.transaction_type,
    amount_usd: parseFloat(form.amount_usd) || 0,
    amount_khr: parseFloat(form.amount_khr) || 0,
    payment_method: form.payment_method,
    transaction_date: new Date(form.transaction_date + "T12:00:00").toISOString(),
    zone_code: zoneCode,
  };
  if (form.contributor_name_kh) payload.contributor_name_kh = form.contributor_name_kh;
  if (form.contributor_name_en) payload.contributor_name_en = form.contributor_name_en;
  if (form.member_id) payload.member_id = form.member_id;
  if (form.reference_number) payload.reference_number = form.reference_number;
  if (form.notes) payload.notes = form.notes;
  return payload;
}

export function financeToForm(f) {
  const date = f.transaction_date?.slice(0, 10) || f.created_at?.slice(0, 10) || "";
  return {
    transaction_type: f.transaction_type || "Donation",
    amount_usd: f.amount_usd != null ? String(f.amount_usd) : "",
    amount_khr: f.amount_khr != null ? String(f.amount_khr) : "",
    payment_method: f.payment_method || "Cash",
    transaction_date: date,
    contributor_name_kh: f.contributor_name_kh || "",
    contributor_name_en: f.contributor_name_en || "",
    member_id: f.member_id || "",
    reference_number: f.reference_number || "",
    notes: f.notes || "",
  };
}

export const FINANCE_STATUS = {
  draft: { label: "ព្រាង", badge: "badge-secondary" },
  submitted: { label: "បានដាក់ស្នើ", badge: "badge-warning" },
  approved: { label: "បានអនុម័ត", badge: "badge-success" },
  rejected: { label: "បានបដិសេធ", badge: "badge-danger" },
};

export const BUDGET_TYPES = [
  { value: "expense", label: "ចំណាយ" },
  { value: "income", label: "ចំណូល" },
  { value: "total", label: "សរុប" },
];

export const PERIOD_TYPES = [
  { value: "month", label: "ប្រចាំខែ" },
  { value: "quarter", label: "ប្រចាំត្រីមាស" },
  { value: "year", label: "ប្រចាំឆ្នាំ" },
];
