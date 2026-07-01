import axios from "axios";

// Use relative path during dev (Vite proxy handles /api -> localhost:8080)
// In production, set VITE_API_URL to the absolute backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach access token
client.interceptors.request.use(
  (config) => {
    if (isAuthRequest(config.url)) {
      return config;
    }
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 & token refresh
let isRefreshing = false;
let failedQueue = [];

const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

function isAuthRequest(url = "") {
  return AUTH_PATHS.some((path) => url.includes(path));
}

function isPublicAuthPage() {
  const path = window.location.pathname;
  return path === "/login" || path === "/register";
}

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

function redirectToLoginIfNeeded() {
  if (!isPublicAuthPage()) {
    window.location.href = "/login";
  }
}

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest(originalRequest.url)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        clearAuthStorage();
        redirectToLoginIfNeeded();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const inner = data.data || data;
        localStorage.setItem("access_token", inner.access_token);
        if (inner.refresh_token) {
          localStorage.setItem("refresh_token", inner.refresh_token);
        }
        processQueue(null, inner.access_token);
        originalRequest.headers.Authorization = `Bearer ${inner.access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthStorage();
        redirectToLoginIfNeeded();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default client;