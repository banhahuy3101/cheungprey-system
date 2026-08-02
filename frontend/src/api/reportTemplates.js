import client from "./client";

export const reportTemplatesAPI = {
  list: () => client.get("/report-templates"),
  getById: (id) => client.get(`/report-templates/${id}`),
  download: (id) => client.get(`/report-templates/${id}/download`, { responseType: "blob" }),
  delete: (id) => client.delete(`/report-templates/${id}`),
  upload: (formData) =>
    client.post("/report-templates", formData),
  update: (id, formData) =>
    client.put(`/report-templates/${id}`, formData),
  addKey: (id, key) =>
    client.post(`/report-templates/${id}/keys`, { key }),
  fill: (id, values) =>
    client.post(`/report-templates/${id}/fill`, values),
};
