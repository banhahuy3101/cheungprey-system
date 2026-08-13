import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);

  const fetchRolePermissions = useCallback(async () => {
    try {
      const res = await adminAPI.getRolePermissions();
      const list = res.data?.data || res.data || [];
      setRolePermissions(list);
      return list;
    } catch {
      setRolePermissions([]);
      return [];
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      localStorage.removeItem("cached_user_profile");
      setRolePermissions([]);
      return null;
    }
    try {
      const [{ data }] = await Promise.all([
        authAPI.getProfile(),
        fetchRolePermissions(),
      ]);
      const inner = data.data || data;
      const profile = inner.profile || inner;
      localStorage.setItem("cached_user_profile", JSON.stringify(profile));
      return profile;
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("cached_user_profile");
      setRolePermissions([]);
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
    loadProfile().then((profile) => {
      if (!cancelled) {
        if (profile) {
          setUser(profile);
        }
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
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
    setUser(profile);
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