import client from "./client";

export const authAPI = {
  login: (credentials) => client.post("/auth/login", credentials),
  register: (data) => client.post("/auth/register", data),
  refreshToken: (refreshToken) =>
    client.post("/auth/refresh", { refresh_token: refreshToken }),
  getProfile: () => client.get("/profile"),
  updateProfile: (data) => client.put("/profile", data),
};