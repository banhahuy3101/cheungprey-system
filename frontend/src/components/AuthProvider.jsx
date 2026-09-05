import { useState, useEffect, useCallback, useRef } from "react";
import AuthContext from "../context/AuthContext";
import { authAPI } from "../api/auth";
import { adminAPI } from "../api/admin";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem("access_token");
    const cached = localStorage.getItem("cached_user_profile");
    return !(token && cached);
  });

  const lastCheckedRef = useRef(Date.now());

  const fetchRolePermissions = useCallback(async () => {
    try {
      const res = await adminAPI.getRolePermissions();
      const list = res.data?.data || res.data || [];
      setRolePermissions(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      localStorage.removeItem("cached_user_profile");
      setRolePermissions([]);
      setUser(null);
      return null;
    }
    try {
      const [{ data }] = await Promise.all([
        authAPI.getProfile(),
        fetchRolePermissions(),
      ]);
      const inner = data.data || data;
      const profile = inner.profile || inner;
      if (profile) {
        localStorage.setItem("cached_user_profile", JSON.stringify(profile));
        setUser(profile);
      }
      lastCheckedRef.current = Date.now();
      return profile;
    } catch (err) {
      const status = err.response?.status;
      // Only clear storage if explicitly 401/403 (unauthorized/forbidden)
      if (status === 401 || status === 403) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("cached_user_profile");
        setRolePermissions([]);
        setUser(null);
        return null;
      }
      // On network failure or backend cold start / 5xx, preserve cached session
      try {
        const cached = localStorage.getItem("cached_user_profile");
        if (cached) {
          const profile = JSON.parse(cached);
          setUser(profile);
          return profile;
        }
      } catch {
        // ignore
      }
      return null;
    }
  }, [fetchRolePermissions]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setRolePermissions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    loadProfile().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  // Silently re-check profile / refresh token when user refocuses the tab after being away
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        // Check if more than 60 seconds have elapsed since last check
        if (now - lastCheckedRef.current > 60000) {
          const token = localStorage.getItem("access_token");
          if (token) {
            loadProfile().catch(() => {});
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [loadProfile]);

  const login = async (credentials) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("cached_user_profile");

    const { data } = await authAPI.login({
      email: credentials?.email?.trim() ?? "",
      password: credentials?.password ?? "",
    });
    const inner = data.data || data;
    if (!inner?.access_token) {
      const msg = inner?.error || data?.error || "Login failed: missing access token";
      throw Object.assign(new Error(msg), { response: { data: { error: msg } } });
    }
    localStorage.setItem("access_token", inner.access_token);
    if (inner.refresh_token) {
      localStorage.setItem("refresh_token", inner.refresh_token);
    }
    const loggedUser = inner.user || null;
    if (loggedUser) {
      localStorage.setItem("cached_user_profile", JSON.stringify(loggedUser));
    }
    setUser(loggedUser);
    lastCheckedRef.current = Date.now();
    fetchRolePermissions().catch(() => {});
    return inner;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    return data;
  };

  const loginWithQR = async (qrToken) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("cached_user_profile");

    const { data } = await authAPI.qrLogin(qrToken);
    const inner = data.data || data;
    if (!inner?.access_token) {
      const msg = inner?.error || data?.error || "QR login failed";
      throw Object.assign(new Error(msg), { response: { data: { error: msg } } });
    }
    localStorage.setItem("access_token", inner.access_token);
    if (inner.refresh_token) {
      localStorage.setItem("refresh_token", inner.refresh_token);
    }
    const loggedUser = inner.user || null;
    if (loggedUser) {
      localStorage.setItem("cached_user_profile", JSON.stringify(loggedUser));
    }
    setUser(loggedUser);
    lastCheckedRef.current = Date.now();
    fetchRolePermissions().catch(() => {});
    return inner;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("cached_user_profile");
    setUser(null);
    setRolePermissions([]);
  };

  const updateProfile = async (profileData) => {
    const { data } = await authAPI.updateProfile(profileData);
    const inner = data.data || data;
    const updated = inner.profile || inner;
    setUser((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem("cached_user_profile", JSON.stringify(next));
      return next;
    });
    return inner;
  };

  const refreshProfile = useCallback(async () => {
    const profile = await loadProfile();
    return profile;
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        rolePermissions,
        loading,
        login,
        loginWithQR,
        register,
        logout,
        updateProfile,
        refreshProfile,
        fetchRolePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}