import { useState, useEffect, useCallback } from "react";
import AuthContext from "../context/AuthContext";
import { authAPI } from "../api/auth";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      localStorage.removeItem("cached_user_profile");
      return null;
    }
    try {
      const { data } = await authAPI.getProfile();
      const inner = data.data || data;
      const profile = inner.profile || inner;
      localStorage.setItem("cached_user_profile", JSON.stringify(profile));
      return profile;
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("cached_user_profile");
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadProfile().then((profile) => {
      if (!cancelled) {
        setUser(profile);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadProfile, user]);

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
    return inner;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("cached_user_profile");
    setUser(null);
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
      value={{ user, loading, login, register, logout, updateProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}