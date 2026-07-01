/** Parse error message when API returns JSON inside a blob response. */
export async function readApiError(err) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return json.error || json.message || null;
    } catch {
      return null;
    }
  }
  return err?.response?.data?.error || err?.response?.data?.message || null;
}

export function isDocxTemplate(template) {
  if (!template) return false;
  if (template.format === "docx") return true;
  return String(template.file_name || "").toLowerCase().endsWith(".docx");
}
