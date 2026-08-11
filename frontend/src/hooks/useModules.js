import { useState, useEffect } from "react";
import { modulesAPI } from "../api/modules";

let cached = null;
let fetchPromise = null;

export function useModules() {
  const [modules, setModules] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    if (!fetchPromise) {
      fetchPromise = modulesAPI.list()
        .then((res) => {
          cached = res.data?.data || res.data || [];
          return cached;
        })
        .catch(() => {
          cached = [];
          return [];
        });
    }
    fetchPromise.then((data) => {
      setModules(data);
      setLoading(false);
    });
  }, []);

  const isEnabled = (moduleKey) => {
    if (moduleKey === "dashboard" || moduleKey === "settings") return true;
    const m = modules.find((m) => m.module_key === moduleKey);
    return m ? m.enabled : true;
  };

  return { modules, loading, isEnabled };
}
