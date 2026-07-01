import client from "./client";

export const reportTemplatesAPI = {
  getKeys: () => client.get("/report-templates/keys"),
  getAll: () => client.get("/report-templates"),
  getById: (id) => client.get(`/report-templates/${id}`),
  upload: (payload) =>
    client.post("/report-templates/upload", payload, { timeout: 60000 }),
  delete: (id) => client.delete(`/report-templates/${id}`),
};
