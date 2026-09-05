/**
 * Sponsorships & Appendix Business Utilities & Constants
 */

export const ENTRY_CLASSIFICATIONS = [
  { value: "donation", label: "ថវិកាឧបត្ថម្ភ (Donation / Budget Support)", badgeClass: "badge-donation" },
  { value: "grassroots_operations", label: "ការងារមូលដ្ឋាន និងប្រតិបត្តិការ (Grassroots Operations)", badgeClass: "badge-subtotal" },
  { value: "social_humanitarian", label: "កិច្ចគាំពារសង្គម និងមនុស្សធម៌ (Social & Humanitarian)", badgeClass: "badge-donation" },
  { value: "education_support", label: "វិស័យអប់រំ និងការបណ្តុះបណ្តាល (Education Support)", badgeClass: "badge-subtotal" },
  { value: "public_infrastructure", label: "ហេដ្ឋារចនាសម្ព័ន្ធរូបវន្ត (Public Infrastructure)", badgeClass: "badge-subtotal" },
  { value: "expense", label: "ការចំណាយ (Direct Expense)", badgeClass: "badge-expense" },
  { value: "subtotal", label: "សរុប (Subtotal Entry)", badgeClass: "badge-subtotal" },
];

export const BRD_CATEGORIES = [
  "ការងារមូលដ្ឋាន និងប្រតិបត្តិការ (Grassroots Operations)",
  "កិច្ចគាំពារសង្គម និងមនុស្សធម៌ (Social & Humanitarian Assistance)",
  "វិស័យអប់រំ និងការបណ្តុះបណ្តាល (Education Support)",
  "ហេដ្ឋារចនាសម្ព័ន្ធរូបវន្ត (Public Infrastructure)",
  "ថវិកាឧបត្ថម្ភទូទៅ (General Donation)",
  "ការចំណាយផ្ទាល់ (Direct Expense)",
  "ផ្សេងៗ (Other)",
];

export const CLASSIFICATION_MAP = {
  donation: { label: "ថវិកាឧបត្ថម្ភ", color: "#059669", bg: "#ecfdf5" },
  grassroots_operations: { label: "ការងារមូលដ្ឋាន", color: "#2563eb", bg: "#eff6ff" },
  social_humanitarian: { label: "សង្គមកិច្ច/មនុស្សធម៌", color: "#0d9488", bg: "#f0fdfa" },
  education_support: { label: "វិស័យអប់រំ", color: "#7c3aed", bg: "#f5f3ff" },
  public_infrastructure: { label: "ហេដ្ឋារចនាសម្ព័ន្ធ", color: "#d97706", bg: "#fffbeb" },
  expense: { label: "ការចំណាយ", color: "#dc2626", bg: "#fef2f2" },
  subtotal: { label: "សរុប", color: "#4f46e5", bg: "#eef2ff" },
};

export const COMMON_SECTIONS = [
  "ការឧបត្ថម្ភរបស់សម្តេចតេជោ ហ៊ុន សែន និងសម្តេចកិត្តិព្រឹទ្ធបណ្ឌិត",
  "ការឧបត្ថម្ភរបស់សម្តេចមហាបវរធិបតី ហ៊ុន ម៉ាណែត និងលោកជំទាវបណ្ឌិត",
  "ការចំណាយរបស់ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន និងលោកជំទាវបណ្ឌិត អ៊ុក ម៉ាលី",
  "ការឧបត្ថម្ភរបស់ក្រុមការងារចុះជួយមូលដ្ឋាន",
  "ការឧបត្ថម្ភរបស់សប្បុរសជននានា",
];

export const COMMON_PERIODS = [
  "សរុប ៩ខែ",
  "ខែតុលា ឆ្នាំ២០២៥",
  "ខែវិច្ឆិកា ឆ្នាំ២០២៥",
  "ខែធ្នូ ឆ្នាំ២០២៥",
  "ប្រចាំត្រីមាសទី១",
  "ប្រចាំត្រីមាសទី២",
  "ប្រចាំត្រីមាសទី៣",
  "ប្រចាំត្រីមាសទី៤",
  "ប្រចាំឆ្នាំ ២០២៥",
];

export const COMMON_COMMUNES = [
  "ទូទាំងស្រុក (District-wide)",
  "ឃុំស្ដៅជុំ",
  "ឃុំសូភាស",
  "ឃុំព្រៃចារ",
  "ឃុំខ្នុរដំបង",
  "ឃុំគោកត្របែក",
  "ឃុំផ្តៅជុំ",
  "ឃុំត្រពាំងគរ",
  "ឃុំសូទិប",
  "ឃុំតាំងក្រសាំង",
  "ឃុំសំបូរ",
];

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

export const QUICK_TAGS = [
  { label: "• បញ្ជីចំណុច", text: "• " },
  { label: "ទូទាំងស្រុក", text: "ទូទាំងស្រុកជើងព្រៃ" },
  { label: "ទីទ័លក្រ", text: "ប្រជាពលរដ្ឋទីទ័លក្រ" },
  { label: "ចាស់ជរា", text: "លោកយាយ លោកតា ចាស់ជរា" },
  { label: "បុណ្យសព", text: "ឧបត្ថម្ភបុណ្យសព" },
  { label: "រយៈពេល ៩ខែ", text: "ក្នុងរយៈពេល ០៩ ខែ" },
];

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
 * Checks for mathematical discrepancy between computed subtotal vs manual input
 */
export function checkDiscrepancy(computed, manual) {
  if (manual === "" || manual === null || manual === undefined) return null;
  const manNum = parseNumericInput(manual);
  if (manNum === 0 && computed === 0) return null;
  const diff = Math.abs(computed - manNum);
  if (diff > 0.009) {
    return {
      hasDiscrepancy: true,
      variance: manNum - computed,
      message: "Mathematical discrepancy detected between item breakdown and ledger summary (រកឃើញភាពមិនស៊ីគ្នាផ្នែកគណិតវិទ្យារវាងផលបូកជាក់ស្តែង និងតួលេខសរុបលើតារាង)",
    };
  }
  return { hasDiscrepancy: false, variance: 0 };
}

/**
 * Validate sponsorship form inputs based on BRD rules
 */
export function validateSponsorshipPayload(form, items) {
  const section = normalizeKhmerText(form.section_group || form.custom_section);

  if (!section) {
    return { valid: false, error: "សូមបញ្ចូលក្រុមឧបត្ថម្ភ (Header Section is required)" };
  }
  const contributor = normalizeKhmerText(form.contributor_name);
  if (!contributor) {
    return { valid: false, error: "សូមបញ្ចូលគោត្តនាម និងនាមអ្នកឧបត្ថម្ភ (Contributor Name is required)" };
  }
  const usage = normalizeKhmerText(form.usage_description);
  if (!usage) {
    return { valid: false, error: "សូមបញ្ចូលព័ត៌មានទីកន្លែងទទួល និងការប្រើប្រាស់ (Usage Details is required)" };
  }

  const usdVal = parseNumericInput(form.amount_usd, false);
  const khrVal = parseNumericInput(form.amount_khr, true);

  const validItems = (items || []).filter(
    (it) => normalizeKhmerText(it.item_name) !== "" && parseNumericInput(it.item_qty) > 0
  );

  // BR-RULE-01: Must contain non-zero cash OR at least one valid material line item
  if (usdVal <= 0 && khrVal <= 0 && validItems.length === 0) {
    return {
      valid: false,
      error: "តម្រូវឱ្យមានតម្លៃសាច់ប្រាក់ (USD ឬ KHR) ឬសម្ភារយ៉ាងតិចមួយមុខដែលមានបរិមាណធំជាង ០ (Must include cash value or at least one material item)",
    };
  }

  const entryNo = form.entry_no ? parseNumericInput(form.entry_no, true) : undefined;
  const fiscalYear = form.fiscal_year ? parseNumericInput(form.fiscal_year, true) : new Date().getFullYear();

  return {
    valid: true,
    data: {
      entry_no: entryNo && entryNo > 0 ? entryNo : undefined,
      record_id: entryNo && entryNo > 0 ? entryNo : undefined,
      fiscal_year: fiscalYear,
      entry_classification: form.entry_classification || form.category || "donation",
      category: form.category || form.entry_classification || "donation",
      section_group: section,
      contributor_name: contributor,
      donor_name: contributor,
      representatives: normalizeKhmerText(form.representatives),
      record_period: normalizeKhmerText(form.record_period),
      target_location: normalizeKhmerText(form.target_location),
      amount_usd: usdVal,
      currency_usd: usdVal,
      amount_khr: khrVal,
      currency_khr: khrVal,
      usage_description: usage,
      allocation_purpose: usage,
      remarks: normalizeKhmerText(form.remarks),
      items: validItems.map((it) => ({
        item_name: normalizeKhmerText(it.item_name),
        item_qty: parseNumericInput(it.item_qty, false) || 1,
        item_unit: normalizeKhmerText(it.item_unit) || "គ.ក",
        cash_allocation_usd: parseNumericInput(it.cash_allocation_usd, false),
        cash_allocation_khr: parseNumericInput(it.cash_allocation_khr, true),
        item_notes: normalizeKhmerText(it.item_notes),
      })),
      in_kind_items: validItems.map((it) => ({
        item_name: normalizeKhmerText(it.item_name),
        item_qty: parseNumericInput(it.item_qty, false) || 1,
        item_unit: normalizeKhmerText(it.item_unit) || "គ.ក",
        cash_allocation_usd: parseNumericInput(it.cash_allocation_usd, false),
        cash_allocation_khr: parseNumericInput(it.cash_allocation_khr, true),
        item_notes: normalizeKhmerText(it.item_notes),
      })),
    },
  };
}

/**
 * Group records by section group
 */
export function groupSponsorshipsBySection(records = []) {
  return records.reduce((acc, rec) => {
    const key = rec.section_group || "ការឧបត្ថម្ភទូទៅ";
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
  const inventoryMap = {};

  records.forEach((rec) => {
    totalUSD += Number(rec.amount_usd) || 0;
    totalKHR += Number(rec.amount_khr) || 0;

    if (rec.items && Array.isArray(rec.items)) {
      rec.items.forEach((it) => {
        const name = normalizeKhmerText(it.item_name);
        const unit = normalizeKhmerText(it.item_unit);
        if (!name) return;
        const key = `${name}|${unit}`;
        if (!inventoryMap[key]) {
          inventoryMap[key] = {
            item_name: name,
            item_unit: unit,
            total_qty: 0,
          };
        }
        inventoryMap[key].total_qty += Number(it.item_qty) || 0;
      });
    }
  });

  return {
    totalUSD,
    totalKHR,
    totalRecords: records.length,
    inventoryRollup: Object.values(inventoryMap),
  };
}

