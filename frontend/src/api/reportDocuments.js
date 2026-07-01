import client from "./client";
import { readApiError } from "../utils/reportTemplate";

export const reportDocumentsAPI = {
  create: (data) => client.post("/report-documents", data),
  getAll: () => client.get("/report-documents"),
  getById: (id) => client.get(`/report-documents/${id}`),
  update: (id, data) => client.put(`/report-documents/${id}`, data),
  delete: (id) => client.delete(`/report-documents/${id}`),
  downloadPDF: async (id, templateId) => {
    const params = templateId ? { template_id: templateId } : {};
    try {
      const res = await client.get(`/report-documents/${id}/pdf`, {
        params,
        responseType: "blob",
        timeout: 120000,
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `party_report_${String(id).slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error((await readApiError(err)) || "ទាញយក PDF មិនបាន");
    }
  },
  downloadDocx: async (id, templateId) => {
    try {
      const res = await client.get(`/report-documents/${id}/docx`, {
        params: { template_id: templateId },
        responseType: "blob",
        timeout: 120000,
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `party_report_${String(id).slice(0, 8)}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error((await readApiError(err)) || "ទាញយក Word មិនបាន");
    }
  },
};