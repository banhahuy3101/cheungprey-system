// Utility helpers for parsing and formatting dynamic template information keys

export const DEFAULT_KEY_LABELS = {
  title: "ចំណងជើងរបាយការណ៍ (Report Title)",
  author: "អ្នករៀបចំ (Author / Created By)",
  prepared_by: "អ្នករៀបចំ (Prepared By)",
  date: "កាលបរិច្ឆេទ (Date)",
  created_at: "កាលបរិច្ឆេទបង្កើត (Created Date)",
  organization: "អង្គភាព / ស្ថាប័ន (Organization)",
  unit: "អង្គភាព (Unit / Bureau)",
  department: "នាយកដ្ឋាន / ការិយាល័យ (Department)",
  role: "តួនាទី / មុខតំណែង (Role / Position)",
  position: "មុខតំណែង (Position)",
  summary: "សេចក្តីសង្ខេប (Executive Summary)",
  description: "ការពិពណ៌នា (Description)",
  table_data: "ទិន្នន័យតារាង (Dynamic Table Data)",
};

/**
 * Normalizes a key item into a standardized { key, label } object.
 * Supports string keys e.g. "author" or object keys e.g. { key: "author", label: "អ្នករៀបចំ" }.
 */
export function parseKeyItem(item) {
  if (!item) return { key: "", label: "" };

  if (typeof item === "string") {
    const rawKey = item.replace(/^\{\{|\}\}$/g, "").trim();
    const lower = rawKey.toLowerCase();
    const label = DEFAULT_KEY_LABELS[lower] || humanizeKey(rawKey);
    return { key: rawKey, label };
  }

  const rawKey = (item.key || "").replace(/^\{\{|\}\}$/g, "").trim();
  const lower = rawKey.toLowerCase();
  const label = item.label?.trim() || DEFAULT_KEY_LABELS[lower] || humanizeKey(rawKey);
  return { key: rawKey, label };
}

function humanizeKey(str) {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
