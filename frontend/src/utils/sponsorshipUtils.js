/**
 * Sponsorships & Appendix Business Utilities & Constants
 */

export const COMMON_SECTIONS = [
  "ការឧបត្ថម្ភរបស់សម្តេចតេជោ ហ៊ុន សែន និងសម្តេចកិត្តិព្រឹទ្ធបណ្ឌិត",
  "ការឧបត្ថម្ភរបស់សម្តេចមហាបវរធិបតី ហ៊ុន ម៉ាណែត និងលោកជំទាវបណ្ឌិត",
  "ការចំណាយរបស់ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន និងលោកជំទាវបណ្ឌិត អ៊ុក ម៉ាលី",
  "ការឧបត្ថម្ភរបស់ក្រុមការងារចុះជួយមូលដ្ឋាន",
  "ការឧបត្ថម្ភរបស់សប្បុរសជននានា",
];

export const COMMON_PERIODS = [
  "សរុប ៩ខែ",
  "ខែតុលា",
  "ខែវិច្ឆិកា",
  "ខែធ្នូ",
  "ប្រចាំត្រីមាសទី១",
  "ប្រចាំត្រីមាសទី២",
  "ប្រចាំត្រីមាសទី៣",
  "ប្រចាំត្រីមាសទី៤",
  "ប្រចាំឆ្នាំ",
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
  "យូរ",
  "ឈុត",
  "ដើម",
  "សម្រាប់",
  "ឡាន",
  "កញ្ចប់",
  "ដប",
  "គូ",
  "សន្លឹក",
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
 * Validate sponsorship form inputs based on BRD Rule 1 & Rule 2
 */
export function validateSponsorshipPayload(form, items) {
  const section =
    form.section_group === "custom"
      ? (form.custom_section || "").trim()
      : (form.section_group || "").trim();

  if (!section) {
    return { valid: false, error: "សូមជ្រើសរើស ឬបញ្ចូលក្រុមឧបត្ថម្ភ (Header Section is required)" };
  }
  if (!form.contributor_name || !form.contributor_name.trim()) {
    return { valid: false, error: "សូមបញ្ចូលគោត្តនាម និងនាមអ្នកឧបត្ថម្ភ (Contributor Name is required)" };
  }
  if (!form.usage_description || !form.usage_description.trim()) {
    return { valid: false, error: "សូមបញ្ចូលព័ត៌មានទីកន្លែងទទួល និងការប្រើប្រាស់ (Usage Details is required)" };
  }

  const usdVal = parseFloat(form.amount_usd) || 0;
  const khrVal = parseInt(form.amount_khr, 10) || 0;

  const validItems = (items || []).filter(
    (it) => it.item_name && it.item_name.trim() !== "" && parseFloat(it.item_qty) > 0
  );

  // Rule 1: Must contain non-zero cash OR at least one valid material line item
  if (usdVal <= 0 && khrVal <= 0 && validItems.length === 0) {
    return {
      valid: false,
      error: "តម្រូវឱ្យមានតម្លៃសាច់ប្រាក់ (USD ឬ KHR) ឬសម្ភារយ៉ាងតិចមួយមុខដែលមានបរិមាណធំជាង ០ (Must include cash value or at least one material item)",
    };
  }

  return {
    valid: true,
    data: {
      entry_no: form.entry_no ? parseInt(form.entry_no, 10) : undefined,
      section_group: section,
      contributor_name: form.contributor_name.trim(),
      record_period: (form.record_period || "").trim(),
      target_location: (form.target_location || "").trim(),
      amount_usd: usdVal,
      amount_khr: khrVal,
      usage_description: form.usage_description.trim(),
      items: validItems.map((it) => ({
        item_name: it.item_name.trim(),
        item_qty: parseFloat(it.item_qty) || 1,
        item_unit: (it.item_unit || "គ.ក").trim(),
        cash_allocation_usd: parseFloat(it.cash_allocation_usd) || 0,
        cash_allocation_khr: parseInt(it.cash_allocation_khr, 10) || 0,
        item_notes: (it.item_notes || "").trim(),
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
        const name = (it.item_name || "").trim();
        const unit = (it.item_unit || "").trim();
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
