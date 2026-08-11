export const emptySimpleReportForm = () => ({
  title: "",
  description: "",
  content: "",
  category: "ផ្សេងៗ",
  require_signature: true,
});

export function buildSimpleReportPayload({ title, description, content, category, require_signature }) {
  return {
    title: title.trim(),
    description: description.trim(),
    content: content || "",
    category: category || "ផ្សេងៗ",
    require_signature: require_signature !== false,
  };
}

/** Read title / description / content only (ignores legacy party fields). */
export function docToSimpleForm(doc) {
  return {
    title: doc.title || "",
    description: doc.description || "",
    content: doc.content || "",
    category: doc.category || "ផ្សេងៗ",
    require_signature: doc.require_signature !== false,
  };
}

export function reportSummaryLabel(doc) {
  const title = doc.title?.trim();
  const desc = doc.description?.trim();
  if (title && desc) return `${title} — ${desc}`;
  if (title) return title;
  if (desc) return desc;
  return "—";
}

export function sanitizeDownloadFilename(title, ext = "pdf") {
  const base = (title || "").trim();
  if (!base) return `report.${ext}`;
  return `${base.slice(0, 80)}.${ext}`;
}

export function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function isEmptyContent(html) {
  return stripHtml(html) === "";
}

export const REPORT_CATEGORIES = [
  "សន្តិសុខ",
  "សេដ្ឋកិច្ច",
  "សង្គមកិច្ច",
  "ហិរញ្ញវត្ថុ",
  "រដ្ឋបាល",
  "ផ្សេងៗ",
];
