import client from "./client";

export const performanceAPI = {
  // Domains
  getDomains: () => client.get("/performance/domains"),
  getDomainsFull: () => client.get("/performance/domains/full"),
  createDomain: (data) => client.post("/performance/domains", data),
  updateDomain: (id, data) => client.put(`/performance/domains/${id}`, data),
  deleteDomain: (id) => client.delete(`/performance/domains/${id}`),

  // Sub-domains
  getSubDomains: (domainId) => client.get(`/performance/domains/${domainId}/sub-domains`),
  createSubDomain: (data) => client.post("/performance/sub-domains", data),
  updateSubDomain: (id, data) => client.put(`/performance/sub-domains/${id}`, data),
  deleteSubDomain: (id) => client.delete(`/performance/sub-domains/${id}`),

  // Indicators
  getIndicators: (subDomainId) => client.get(`/performance/sub-domains/${subDomainId}/indicators`),
  getAllIndicators: () => client.get("/performance/indicators"),
  createIndicator: (data) => client.post("/performance/indicators", data),
  updateIndicator: (id, data) => client.put(`/performance/indicators/${id}`, data),
  deleteIndicator: (id) => client.delete(`/performance/indicators/${id}`),

  // Periods
  getPeriods: () => client.get("/performance/periods"),
  createPeriod: (data) => client.post("/performance/periods", data),
  deletePeriod: (id) => client.delete(`/performance/periods/${id}`),

  // Data CRUD
  createData: (data) => client.post("/performance/data", data),
  bulkCreateData: (data) => client.post("/performance/data/bulk", data),
  getData: (zoneId, periodId) =>
    client.get("/performance/data", {
      params: { zone_id: zoneId, period_id: periodId },
    }),
  deleteDataById: (id) => client.delete(`/performance/data/${id}`),
  deleteDataByZoneAndPeriod: (zoneId, periodId) =>
    client.delete("/performance/data", {
      params: { zone_id: zoneId, period_id: periodId },
    }),

  // Submissions
  getSubmissions: () => client.get("/performance/data/submissions"),

  // PDF Report
  getReportUrl: (zoneId, periodId) =>
    `/api/reports/performance/${zoneId}/${periodId}`,

  downloadReport: async (zoneId, periodId) => {
    const res = await client.get(`/reports/performance/${zoneId}/${periodId}`, {
      responseType: "blob",
      timeout: 120000,
    });
    const blob = res.data;
    const header = await blob.slice(0, 5).text();
    if (!header.startsWith("%PDF")) {
      const message = await blob.text().catch(() => "");
      let detail = "Server did not return a valid PDF";
      try {
        const json = JSON.parse(message);
        detail = json.error || json.message || detail;
      } catch {
        if (message) detail = message.slice(0, 200);
      }
      throw new Error(detail);
    }
    const pdfBlob = new Blob([blob], { type: "application/pdf" });
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `performance_${zoneId}_${String(periodId).slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};