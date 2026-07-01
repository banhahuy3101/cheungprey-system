import client from "./client";

export const recordsAPI = {
  create: (data) => client.post("/records", data),
  getAll: (params) => client.get("/records", { params }),
  getById: (id) => client.get(`/records/${id}`),
  update: (id, data) => client.put(`/records/${id}`, data),
  delete: (id) => client.delete(`/records/${id}`),
};