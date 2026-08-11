import client from "./client";

export const modulesAPI = {
  list: () => client.get("/modules"),
  update: (key, data) => client.put(`/modules/${key}`, data),
  listSteps: (key) => client.get(`/modules/${key}/steps`),
  createStep: (key, data) => client.post(`/modules/${key}/steps`, data),
  updateStep: (key, stepId, data) => client.put(`/modules/${key}/steps/${stepId}`, data),
  deleteStep: (key, stepId) => client.delete(`/modules/${key}/steps/${stepId}`),
  reorderSteps: (key, stepIds) => client.put(`/modules/${key}/steps/reorder`, { step_ids: stepIds }),
};

export const approvalsAPI = {
  queue: (module) => client.get("/approvals/queue", { params: { module } }),
  history: (module, itemId) => client.get(`/approvals/${module}/${itemId}`),
  approve: (id, data) => client.post(`/approvals/${id}/approve`, data || {}),
  reject: (id, data) => client.post(`/approvals/${id}/reject`, data),
};
