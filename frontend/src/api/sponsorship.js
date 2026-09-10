import client from "./client";

export const sponsorshipAPI = {
  // Level 1: Sponsorship Periods
  listPeriods: () => client.get("/sponsorship-periods"),
  getPeriodByID: (id) => client.get(`/sponsorship-periods/${id}`),
  createPeriod: (data) => client.post("/sponsorship-periods", data),
  updatePeriod: (id, data) => client.put(`/sponsorship-periods/${id}`, data),
  deletePeriod: (id) => client.delete(`/sponsorship-periods/${id}`),
  consolidatePeriod: (id) => client.post(`/sponsorship-periods/${id}/consolidate`),

  // Level 2 & 3: Sponsorship Records & Line Items
  list: (params) => client.get("/sponsorships", { params }),
  getByID: (id) => client.get(`/sponsorships/${id}`),
  create: (data) => client.post("/sponsorships", data),
  update: (id, data) => client.put(`/sponsorships/${id}`, data),
  delete: (id) => client.delete(`/sponsorships/${id}`),
  submit: (id) => client.post(`/sponsorships/${id}/submit`),
  review: (id, payload) => client.post(`/sponsorships/${id}/review`, payload),
  approve: (id, payload) => client.post(`/sponsorships/${id}/approve`, payload),
  getSummary: (params) => client.get("/sponsorships/summary", { params }),
};
