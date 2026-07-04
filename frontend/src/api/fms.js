import client from "./client";

export const fmsAPI = {
  // Chart of Accounts
  listCoA: () => client.get("/fms/coa"),
  getCoA: (code) => client.get(`/fms/coa/${code}`),
  createCoA: (data) => client.post("/fms/coa", data),
  updateCoA: (code, data) => client.put(`/fms/coa/${code}`, data),

  // Budgets
  listBudgets: (params) => client.get("/fms/budgets", { params }),
  createBudget: (data) => client.post("/fms/budgets", data),
  getBudget: (id) => client.get(`/fms/budgets/${id}`),
  updateBudget: (id, data) => client.put(`/fms/budgets/${id}`, data),

  // Transactions
  createTransaction: (data) => client.post("/fms/transactions", data),
  listTransactions: (params) => client.get("/fms/transactions", { params }),
  getTransaction: (id) => client.get(`/fms/transactions/${id}`),
  approveTransaction: (id) => client.post(`/fms/transactions/${id}/approve`),
  rejectTransaction: (id, data) => client.post(`/fms/transactions/${id}/reject`, data),
  reverseTransaction: (id) => client.post(`/fms/transactions/${id}/reverse`),

  // Dashboard
  getDashboard: (params) => client.get("/fms/dashboard", { params }),

  // Audit Log
  listAuditLog: (params) => client.get("/fms/audit", { params }),
};
