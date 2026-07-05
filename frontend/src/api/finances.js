import client from "./client";

export const financesAPI = {
  listCoA: () => client.get("/fms/coa"),
  getCoA: (code) => client.get(`/fms/coa/${code}`),
  createCoA: (data) => client.post("/fms/coa", data),
  updateCoA: (code, data) => client.put(`/fms/coa/${code}`, data),

  listBudgets: (params) => client.get("/fms/budgets", { params }),
  createBudget: (data) => client.post("/fms/budgets", data),
  getBudget: (id) => client.get(`/fms/budgets/${id}`),
  updateBudget: (id, data) => client.put(`/fms/budgets/${id}`, data),

  createTransaction: (data) => client.post("/fms/transactions", data),
  listTransactions: (params) => client.get("/fms/transactions", { params }),
  getTransaction: (id) => client.get(`/fms/transactions/${id}`),
  approveTransaction: (id) => client.post(`/fms/transactions/${id}/approve`),
  rejectTransaction: (id, data) => client.post(`/fms/transactions/${id}/reject`, data),
  reverseTransaction: (id) => client.post(`/fms/transactions/${id}/reverse`),

  getDashboard: (params) => client.get("/fms/dashboard", { params }),
  listAuditLog: (params) => client.get("/fms/audit", { params }),
};

/** @deprecated use financesAPI */
export const fmsAPI = financesAPI;
