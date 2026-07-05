import client, { TWO_MINUTE_TIMEOUT } from "./client";

function downloadFilename(title, ext) {
  const base = (title || "").trim();
  if (!base) return "report." + ext;
  return base.slice(0, 80) + "." + ext;
}

async function saveBlobResponse(res, title, mimeType, ext) {
  const contentType = res.headers?.["content-type"] || "";
  if (!contentType.includes(mimeType)) {
    throw new Error(`ទាញយក ${ext.toUpperCase()} មិនបាន`);
  }
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadFilename(title, ext);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const reportDocumentsAPI = {
  create: (data) => client.post("/report-documents", data),
  createSimple: (data) => client.post("/report-documents/simple", data),
  getAll: () => client.get("/report-documents"),
  getById: (id) => client.get(`/report-documents/${id}`),
  update: (id, data) => client.put(`/report-documents/${id}`, data),
  updateSimple: (id, data) => client.put(`/report-documents/${id}/simple`, data),
  delete: (id) => client.delete(`/report-documents/${id}`),
  downloadPDF: async (id, title) => {
    try {
      const res = await client.get(`/report-documents/${id}/pdf`, {
        responseType: "blob",
        timeout: TWO_MINUTE_TIMEOUT,
      });
      await saveBlobResponse(res, title, "application/pdf", "pdf");
    } catch (err) {
      throw new Error(err?.message || "ទាញយក PDF មិនបាន");
    }
  },
};
