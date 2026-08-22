import client from "./client";

export const menuItemsAPI = {
  getTree: () => client.get("/menu-items"),
  getFlat: () => client.get("/menu-items/flat"),
  create: (data) => client.post("/menu-items", data),
  update: (id, data) => client.put(`/menu-items/${id}`, data),
  delete: (id) => client.delete(`/menu-items/${id}`),
};
