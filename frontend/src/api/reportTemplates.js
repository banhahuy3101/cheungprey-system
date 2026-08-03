import client from "./client";

export const reportTemplatesAPI = {
  list: (params = {}) => client.get("/report-templates", { params }),
  getById: (id) => client.get(`/report-templates/${id}`),
  download: (id) => client.get(`/report-templates/${id}/download`, { responseType: "blob" }),
  delete: (id) => client.delete(`/report-templates/${id}`),
  duplicate: (id) => client.post(`/report-templates/${id}/duplicate`),
  upload: (formData) =>
    client.post("/report-templates", formData),
  update: (id, formData) =>
    client.put(`/report-templates/${id}`, formData),
  addKey: (id, key) =>
    client.post(`/report-templates/${id}/keys`, { key }),
  fill: (id, values) =>
    client.post(`/report-templates/${id}/fill`, values),
  downloadFilled: (path) => client.get("/report-templates/filled", { params: { path }, responseType: "blob" }),
};
