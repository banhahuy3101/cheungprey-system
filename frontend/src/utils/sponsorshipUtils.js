/**
 * Sponsorships & Contribution Tracking Utilities
 */

export const COMMON_UNITS = [
  "គ.ក",
  "កេស",
  "យួរ",
  "ឈុត",
  "ដើម",
  "សម្រាប់",
  "ឡាន",
  "កញ្ចប់",
  "ដប",
  "ធុង",
  "លីត្រ",
  "គូ",
  "សន្លឹក",
  "កំប៉ុង",
];

export const COMMON_MATERIALS = [
  "អង្ករ",
  "មី",
  "មីម៉ាម៉ា",
  "ទឹកត្រី",
  "ទឹកស៊ីអ៊ីវ",
  "ត្រីខ",
  "ប្រេងឆា",
  "ស្ករស",
  "អំបិល",
  "ប៊ីចេង",
  "ទឹកបរិសុទ្ធ",
  "ទឹកក្រូច",
  "ភេសជ្ជៈ",
  "សារុង",
  "ក្រមា",
  "ភួយ",
  "មុង",
  "កន្ទេល",
  "សៀវភៅ",
  "ប៊ិច",
  "កាបូបសិស្ស",
  "កង់",
  "ស៊ីម៉ងត៍",
  "ដីខ្សាច់",
  "ថ្ម",
  "ក្បឿង",
  "ស័ង្កសី",
  "ឈើ",
  "សម្ភារសិក្សា",
  "សម្ភារពេទ្យ",
  "ថ្នាំសង្កូវ",
  "តង់កៅស៊ូ",
  "ម៉ាស៊ីនបូមទឹក",
];

export const COMMON_SECTION_GROUPS = [
  "ទូទៅ",
  "ថ្នាក់ដឹកនាំ",
  "ក្រុមការងារ",
  "សប្បុរសជន",
];

export const PERIOD_TYPES = [
  { value: "month", label: "ប្រចាំខែ (Monthly)" },
  { value: "semester", label: "ប្រចាំឆមាស (Semester)" },
  { value: "year", label: "ប្រចាំឆ្នាំ (Yearly)" },
  { value: "custom", label: "ផ្សេងៗ (Custom Period)" },
];

export const PERIOD_TYPE_MAP = {
  month: "ប្រចាំខែ",
  semester: "ប្រចាំឆមាស",
  year: "ប្រចាំឆ្នាំ",
  custom: "ផ្សេងៗ",
};

export const STATUS_OPTIONS = [
  { label: "ស្ថានភាពទាំងអស់ (All)", value: "" },
  { label: "សេចក្តីព្រាង (Draft)", value: "draft" },
  { label: "បានដាក់ស្នើ (Submitted)", value: "submitted" },
  { label: "បានពិនិត្យ (Reviewed)", value: "reviewed" },
  { label: "បានអនុម័ត (Approved)", value: "approved" },
  { label: "បានបង្វែរមកវិញ (Returned)", value: "returned" },
];

export const STATUS_MAP = {
  draft: { label: "សេចក្តីព្រាង", className: "status-pill draft" },
  submitted: { label: "បានដាក់ស្នើ", className: "status-pill submitted" },
  reviewed: { label: "បានពិនិត្យ", className: "status-pill reviewed" },
  approved: { label: "បានអនុម័ត", className: "status-pill approved" },
  returned: { label: "បង្វែរមកវិញ", className: "status-pill returned" },
};

/**
 * Normalizes Khmer digits (០-៩) to ASCII digits (0-9) and sanitizes zero-width space
 */
export function normalizeKhmerDigits(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  const khmerDigitMap = {
    "០": "0", "១": "1", "២": "2", "៣": "3", "៤": "4",
    "៥": "5", "៦": "6", "៧": "7", "៨": "8", "៩": "9",
  };
  return str.replace(/[០-៩]/g, (ch) => khmerDigitMap[ch] || ch);
}

/**
 * Sanitizes input so only digits (and optional single decimal point) are kept.
 * Automatically converts Khmer digits (០-៩) to 0-9.
 */
export function sanitizeNumericInput(val, allowDecimal = true) {
  if (val === null || val === undefined) return "";
  const normalized = normalizeKhmerDigits(String(val));
  if (allowDecimal) {
    const cleaned = normalized.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    return cleaned;
  }
  return normalized.replace(/[^0-9]/g, "");
}

/**
 * Sanitizes Khmer text (normalizes zero-width space U+200B and trims)
 */
export function normalizeKhmerText(val) {
  if (!val) return "";
  return String(val).replace(/[\u200B\u200C\u200D\uFEFF]/g, "").trim();
}

/**
 * Parses user numeric input, stripping currency symbols and converting Khmer digits
 */
export function parseNumericInput(val, isInteger = false) {
  if (val === null || val === undefined || val === "") return 0;
  let clean = normalizeKhmerDigits(String(val))
    .replace(/[$៛,USDusdKHRkhr\s]/g, "")
    .trim();
  if (!clean) return 0;
  const num = isInteger ? parseInt(clean, 10) : parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Validate sponsorship form inputs based on BRD rules
 * - Contributor Name is mandatory
 * - Item fields can be blank
 */
export function validateSponsorshipPayload(form, items = []) {
  const contributor = normalizeKhmerText(form.contributor_name);
  if (!contributor) {
    return { valid: false, error: "សូមបញ្ចូលគោត្តនាម និង នាមអ្នកឧបត្ថម្ភ (Honorific & Full Name is required)" };
  }

  const validItems = (items || [])
    .filter((it) => normalizeKhmerText(it.item_name) !== "" || Number(it.amount_usd || it.expense_amount_usd || it.cash_allocation_usd) > 0 || Number(it.amount_khr || it.expense_amount_khr || it.cash_allocation_khr) > 0)
    .map((it) => {
      const usageDesc = normalizeKhmerText(it.usage_description);
      const remarkDesc = normalizeKhmerText(it.remarks);
      let notes = normalizeKhmerText(it.item_notes);
      if (!notes) {
        notes = [usageDesc, remarkDesc].filter(Boolean).join(" | ");
      }
      const usd = parseNumericInput(it.amount_usd !== undefined && it.amount_usd !== "" ? it.amount_usd : it.expense_amount_usd !== undefined && it.expense_amount_usd !== "" ? it.expense_amount_usd : it.cash_allocation_usd, false);
      const khr = parseNumericInput(it.amount_khr !== undefined && it.amount_khr !== "" ? it.amount_khr : it.expense_amount_khr !== undefined && it.expense_amount_khr !== "" ? it.expense_amount_khr : it.cash_allocation_khr, true);
      const expenseLabel = normalizeKhmerText(it.is_expense_label || it.expense_label || "");

      return {
        item_name: normalizeKhmerText(it.item_name),
        item_qty: parseNumericInput(it.item_qty, false) || 1,
        item_unit: normalizeKhmerText(it.item_unit),
        amount_usd: usd,
        amount_khr: khr,
        expense_amount_usd: usd,
        expense_amount_khr: khr,
        currency_usd: usd,
        cash_allocation_usd: usd,
        currency_khr: khr,
        cash_allocation_khr: khr,
        is_expense_label: expenseLabel,
        expense_label: expenseLabel,
        usage_description: usageDesc,
        remarks: remarkDesc,
        item_notes: notes,
      };
    });

  const allUsages = validItems.map((it) => it.usage_description).filter(Boolean);
  const usage = allUsages.length > 0 ? allUsages.join("\n") : normalizeKhmerText(form.usage_description);
  const allRemarks = validItems.map((it) => it.remarks).filter(Boolean);
  const remarks = allRemarks.length > 0 ? allRemarks.join(", ") : normalizeKhmerText(form.remarks);
  const itemsTotalUSD = validItems.reduce((acc, it) => acc + (it.amount_usd || it.expense_amount_usd || it.cash_allocation_usd || 0), 0);
  const itemsTotalKHR = validItems.reduce((acc, it) => acc + (it.amount_khr || it.expense_amount_khr || it.cash_allocation_khr || 0), 0);

  let usdVal = 0;
  let khrVal = 0;
  if (form.is_expense_total || validItems.length === 0) {
    usdVal = parseNumericInput(form.amount_usd !== undefined && form.amount_usd !== "" ? form.amount_usd : form.expense_amount_usd !== undefined && form.expense_amount_usd !== "" ? form.expense_amount_usd : form.currency_usd, false);
    khrVal = parseNumericInput(form.amount_khr !== undefined && form.amount_khr !== "" ? form.amount_khr : form.expense_amount_khr !== undefined && form.expense_amount_khr !== "" ? form.expense_amount_khr : form.currency_khr, true);
  } else {
    usdVal = itemsTotalUSD || parseNumericInput(form.amount_usd || form.expense_amount_usd || form.currency_usd, false);
    khrVal = itemsTotalKHR || parseNumericInput(form.amount_khr || form.expense_amount_khr || form.currency_khr, true);
  }

  const entryNo = form.entry_no ? parseNumericInput(form.entry_no, true) : undefined;
  const fiscalYear = form.fiscal_year ? parseNumericInput(form.fiscal_year, true) : new Date().getFullYear();

  const rawLabel =
    form.expense_label !== undefined && form.expense_label !== null && form.expense_label !== ""
      ? form.expense_label
      : form.is_expense_label !== undefined && form.is_expense_label !== null && form.is_expense_label !== ""
        ? form.is_expense_label
        : "";
  const normalizedLabel = normalizeKhmerText(rawLabel);
  const expenseLabel = normalizedLabel || (form.is_expense_total ? "សរុបការចំណាយ" : "");

  return {
    valid: true,
    data: {
      entry_no: entryNo && entryNo > 0 ? entryNo : undefined,
      record_id: entryNo && entryNo > 0 ? entryNo : undefined,
      fiscal_year: fiscalYear,
      entry_classification: "sponsorship",
      category: "sponsorship",
      section_group: normalizeKhmerText(form.section_group) || "ទូទៅ",
      is_expense_total: Boolean(form.is_expense_total),
      is_expense_label: expenseLabel,
      expense_label: expenseLabel,
      contributor_name: contributor,
      donor_name: contributor,
      representatives: normalizeKhmerText(form.representatives),
      record_period: normalizeKhmerText(form.record_period) || "ប្រចាំឆ្នាំ ២០២៥",
      expense_amount_usd: usdVal,
      amount_usd: usdVal,
      currency_usd: usdVal,
      expense_amount_khr: khrVal,
      amount_khr: khrVal,
      currency_khr: khrVal,
      usage_description: usage,
      allocation_purpose: usage,
      remarks: remarks,
      items: validItems,
      in_kind_items: validItems,
    },
  };
}

/**
 * Group records by section group (if present)
 */
export function groupSponsorshipsBySection(records = []) {
  return records.reduce((acc, rec) => {
    const key = rec.section_group || "បញ្ជីការឧបត្ថម្ភ";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});
}

/**
 * Calculate client-side totals across records
 */
export function calculateSponsorshipTotals(records = []) {
  let totalUSD = 0;
  let totalKHR = 0;

  records.forEach((rec) => {
    totalUSD += Number(rec.expense_amount_usd) || Number(rec.amount_usd) || Number(rec.currency_usd) || 0;
    totalKHR += Number(rec.expense_amount_khr) || Number(rec.amount_khr) || Number(rec.currency_khr) || 0;
  });

  return {
    totalUSD,
    totalKHR,
    totalRecords: records.length,
  };
}
