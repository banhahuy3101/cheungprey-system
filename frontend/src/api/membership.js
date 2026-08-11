import client from "./client";

export const membershipAPI = {
  search: (params) => client.get("/membership", { params }),
  getStats: () => client.get("/membership/stats"),
  export: (params) => client.get("/membership/export", { params }),

  getProfile: (id) => client.get(`/membership/${id}/profile`),
  getDemographics: (id) => client.get(`/membership/${id}/demographics`),
  updateDemographics: (id, data) => client.put(`/membership/${id}/demographics`, data),
  getStatusHistory: (id) => client.get(`/membership/${id}/history`),
  changeStatus: (id, data) => client.post(`/membership/${id}/status`, data),
  bulkStatusChange: (data) => client.post("/membership/status/bulk", data),

  getDues: (id) => client.get(`/membership/${id}/dues`),
  recordDue: (id, data) => client.post(`/membership/${id}/dues`, data),

  getActivity: (id) => client.get(`/membership/${id}/activity`),
  recordActivity: (id, data) => client.post(`/membership/${id}/activity`, data),
  checkIn: (id) => client.post(`/membership/${id}/check-in`),

  getPositions: (id) => client.get(`/membership/${id}/positions`),
  assignPosition: (id, data) => client.post(`/membership/${id}/positions`, data),

  getCards: (id) => client.get(`/membership/${id}/cards`),
  issueCard: (id, data) => client.post(`/membership/${id}/cards`, data),
  updateCard: (id, data) => client.put(`/membership/cards/${id}`, data),

  bulkImport: (data) => client.post("/membership/import", data),
};
