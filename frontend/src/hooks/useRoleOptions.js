import { useState, useEffect } from "react";
import { adminAPI } from "../api/admin";

const FALLBACK_ROLES = [
  { value: "recorder", label: "Recorder" },
  { value: "village_chief", label: "Village Chief" },
  { value: "commune_clerk", label: "Commune Clerk" },
  { value: "commune_chief", label: "Commune Chief" },
  { value: "district_chief", label: "District Chief" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
  { value: "regular_user", label: "Regular User" },
];

export function useRoleOptions() {
  const [roleOptions, setRoleOptions] = useState(FALLBACK_ROLES);
  const [roleLabelMap, setRoleLabelMap] = useState(
    Object.fromEntries(FALLBACK_ROLES.map((r) => [r.value, r.label])),
  );

  useEffect(() => {
    let cancelled = false;
    adminAPI
      .getRoles()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data ?? res.data ?? [];
        if (!Array.isArray(list) || list.length === 0) return;
        const opts = list.map((r) => ({ value: r.role, label: r.label || r.role }));
        setRoleOptions(opts);
        setRoleLabelMap(Object.fromEntries(opts.map((o) => [o.value, o.label])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { roleOptions, roleLabelMap };
}
