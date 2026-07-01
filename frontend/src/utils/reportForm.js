export const KHMER_MONTHS = [
  { value: 1, label: "មករា" },
  { value: 2, label: "កុម្ភៈ" },
  { value: 3, label: "មីនា" },
  { value: 4, label: "មេសា" },
  { value: 5, label: "ឧសភា" },
  { value: 6, label: "មិថុនា" },
  { value: 7, label: "កក្កដា" },
  { value: 8, label: "សីហា" },
  { value: 9, label: "កញ្ញា" },
  { value: 10, label: "តុលា" },
  { value: 11, label: "វិច្ឆិកា" },
  { value: 12, label: "ធ្នូ" },
];

export const emptyReportForm = () => ({
  party_name: "គណបក្សប្រជាជនកម្ពុជា",
  province_name: "",
  district_name: "",
  document_reference_number: "",
  generation_date_khmer: "",
  report_month: new Date().getMonth() + 1,
  report_year: new Date().getFullYear(),
  political_situation_summary: "",
  total_crimes_count: 0,
  homicide_cases: 0,
  suicide_cases: 0,
  misdemeanor_cases: 0,
  human_fatalities: 0,
  property_damage_desc: "(គ្មាន)",
  status: "draft",
});

export function docToForm(doc) {
  return {
    party_name: doc.party_name || "គណបក្សប្រជាជនកម្ពុជា",
    province_name: doc.province_name || "",
    district_name: doc.district_name || "",
    document_reference_number: doc.document_reference_number || "",
    generation_date_khmer: doc.generation_date_khmer || "",
    report_month: doc.report_month || 1,
    report_year: doc.report_year || new Date().getFullYear(),
    political_situation_summary: doc.political_situation_summary || "",
    total_crimes_count: doc.total_crimes_count ?? 0,
    homicide_cases: doc.homicide_cases ?? 0,
    suicide_cases: doc.suicide_cases ?? 0,
    misdemeanor_cases: doc.misdemeanor_cases ?? 0,
    human_fatalities: doc.human_fatalities ?? 0,
    property_damage_desc: doc.property_damage_desc || "(គ្មាន)",
    status: doc.status || "draft",
  };
}

export function monthLabel(month) {
  return KHMER_MONTHS.find((m) => m.value === month)?.label || "—";
}

export function reportSummaryLabel(doc) {
  const month = monthLabel(doc.report_month);
  const parts = [doc.district_name, doc.province_name].filter(Boolean).join(", ");
  if (month && doc.report_year) {
    return `${parts} — ${month} ${doc.report_year}`;
  }
  return parts || "—";
}
