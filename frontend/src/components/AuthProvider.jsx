import { useState, useEffect, useCallback } from "react";
import AuthContext from "../context/AuthContext";
import { authAPI } from "../api/auth";

function isPublicAuthPage() {
  const path = window.location.pathname;
  return path === "/login" || path === "/register";
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return null;
    }
    try {
      const { data } = await authAPI.getProfile();
      const inner = data.data || data;
      return inner.profile || inner;
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return null;
    }
  }, []);

  useEffect(() => {
    if (isPublicAuthPage()) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    loadProfile().then((profile) => {
      if (!cancelled) {
        setUser(profile);
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
    setUser(inner.user || null);
    return inner;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const { data } = await authAPI.updateProfile(profileData);
    const inner = data.data || data;
    setUser((prev) => ({ ...prev, ...(inner.profile || inner) }));
    return inner;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}