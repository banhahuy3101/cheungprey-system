import client from "./client";

export const adminAPI = {
  getUsers: (params) => client.get("/admin/users", { params }),
  getUserById: (id) => client.get(`/admin/users/${id}`),
  createUser: (data) => client.post("/admin/users", data),
  updateUser: (id, data) => client.put(`/admin/users/${id}`, data),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
  updateUserRole: (id, role) => client.put(`/admin/users/${id}/role`, { role }),
  updateUserRoles: (id, roles) => client.put(`/admin/users/${id}/roles`, { roles }),
  resetUserPassword: (id, password) =>
    client.put(`/admin/users/${id}/password`, password ? { password } : {}),
  getSettings: () => client.get("/admin/settings"),
  getStatistics: () => client.get("/admin/statistics"),
  getRolePermissions: () => client.get("/admin/role-permissions"),
  updateRolePermissions: (role, permissions) =>
    client.put(`/admin/role-permissions/${role}`, { permissions }),
  getFeatures: () => client.get("/permissions/features"),
  getRoles: () => client.get("/admin/roles"),
  createRole: (data) => client.post("/admin/roles", data),
  updateRole: (role, data) => client.put(`/admin/roles/${role}`, data),
  deleteRole: (role) => client.delete(`/admin/roles/${role}`),
};
