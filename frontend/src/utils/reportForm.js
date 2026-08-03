export const emptySimpleReportForm = () => ({
  title: "",
  description: "",
  content: "",
  category: "ផ្សេងៗ",
});

export function buildSimpleReportPayload({ title, description, content, category }) {
  return {
    title: title.trim(),
    description: description.trim(),
    content: content || "",
    category: category || "ផ្សេងៗ",
  };
}

/** Read title / description / content only (ignores legacy party fields). */
export function docToSimpleForm(doc) {
  return {
    title: doc.title || "",
    description: doc.description || "",
    content: doc.content || "",
    category: doc.category || "ផ្សេងៗ",
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
