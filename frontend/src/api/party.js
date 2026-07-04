import client from "./client";

export const partyAPI = {
  // Zones
  getZones: (params) => client.get("/party/zones", { params }),
  getZoneTree: () => client.get("/party/zones/tree"),
  getStructures: () => client.get("/party/structures"),

  // Members
  createMember: (data) => client.post("/party/members", data),
  getMembers: (params) => client.get("/party/members", { params }),
  getMemberById: (id) => client.get(`/party/members/${id}`),
  updateMember: (id, data) => client.put(`/party/members/${id}`, data),
  deleteMember: (id) => client.delete(`/party/members/${id}`),

  // Voters
  createVoter: (data) => client.post("/party/voters", data),
  getVoters: (params) => client.get("/party/voters", { params }),

  // Finances
  createFinance: (data) => client.post("/party/finances", data),
  getFinances: (params) => client.get("/party/finances", { params }),
  getFinanceById: (id) => client.get(`/party/finances/${id}`),
  updateFinance: (id, data) => client.put(`/party/finances/${id}`, data),
  deleteFinance: (id) => client.delete(`/party/finances/${id}`),
  getFinanceSummary: (params) => client.get("/party/finances/summary", { params }),
  getFinanceAnalytics: (params) => client.get("/party/finances/analytics", { params }),
  downloadFinanceReportPDF: (params) =>
    client.get("/party/finances/report/pdf", { params, responseType: "blob" }),
  getFinanceBudgets: (params) => client.get("/party/finances/budgets", { params }),
  createFinanceBudget: (data) => client.post("/party/finances/budgets", data),
  updateFinanceBudget: (id, data) => client.put(`/party/finances/budgets/${id}`, data),
  deleteFinanceBudget: (id) => client.delete(`/party/finances/budgets/${id}`),
  submitFinance: (id) => client.post(`/party/finances/${id}/submit`),
  approveFinance: (id) => client.post(`/party/finances/${id}/approve`),
  rejectFinance: (id, data) => client.post(`/party/finances/${id}/reject`, data),
  addFinanceAttachment: (id, data) => client.post(`/party/finances/${id}/attachments`, data),

  // Files (JSON + base64, same pattern as report templates)
  uploadFile: (payload) => client.post("/party/files", payload),
  getFiles: (params) => client.get("/party/files", { params }),
  getFileById: (id, config) => client.get(`/party/files/${id}`, config),
  deleteFile: (id) => client.delete(`/party/files/${id}`),
};