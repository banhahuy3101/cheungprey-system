import { useState, useEffect, useCallback } from "react";
import { modulesAPI } from "../api/modules";

let cached = null;
let fetchPromise = null;

export function useModules() {
  const [modules, setModules] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  const fetch = useCallback(() => {
    setLoading(true);
    fetchPromise = modulesAPI.list()
      .then((res) => {
        cached = res.data?.data || res.data || [];
        setModules(cached);
        return cached;
      })
      .catch(() => {
        cached = [];
        setModules([]);
        return [];
      })
      .finally(() => setLoading(false));
    return fetchPromise;
  }, []);

  useEffect(() => {
    if (cached) return;
    fetch();
  }, [fetch]);

  const refresh = useCallback(() => {
    cached = null;
    fetchPromise = null;
    return fetch();
  }, [fetch]);

  const isEnabled = (moduleKey) => {
    if (moduleKey === "dashboard" || moduleKey === "settings") return true;
    const m = modules.find((m) => m.module_key === moduleKey);
    return m ? m.enabled : true;
  };

  return { modules, loading, isEnabled, refresh };
}
