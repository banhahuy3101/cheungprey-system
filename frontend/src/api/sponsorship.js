import client from "./client";

export const sponsorshipAPI = {
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
