import client from "./client";

export const partyAPI = {
  // Zones
  getZones: (params) => client.get("/party/zones", { params }),
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
  getFinanceSummary: () => client.get("/party/finances/summary"),

  // Files (JSON + base64, same pattern as report templates)
  uploadFile: (payload) => client.post("/party/files", payload),
  getFiles: (params) => client.get("/party/files", { params }),
  getFileById: (id) => client.get(`/party/files/${id}`),
  deleteFile: (id) => client.delete(`/party/files/${id}`),
};