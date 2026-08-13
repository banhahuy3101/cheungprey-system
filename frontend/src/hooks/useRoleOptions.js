import { useState, useEffect } from "react";
import { adminAPI } from "../api/admin";

const DEFAULT_SUPER_ADMIN_ROLE = [
  { value: "super_admin", label: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់" },
];

export function getRoleBadgeStyle(roleKey) {
  if (!roleKey) {
    return { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
  }
  if (roleKey === "super_admin") {
    return { background: "#fce4ec", color: "#c62828", border: "1px solid #f8bbd0" };
  }
  let hash = 0;
  for (let i = 0; i < roleKey.length; i++) {
    hash = roleKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsl(${hue}, 65%, 94%)`,
    color: `hsl(${hue}, 75%, 26%)`,
    border: `1px solid hsl(${hue}, 50%, 84%)`,
  };
}

export function useRoleOptions() {
  const [roleOptions, setRoleOptions] = useState(DEFAULT_SUPER_ADMIN_ROLE);
  const [roleLabelMap, setRoleLabelMap] = useState(
    Object.fromEntries(DEFAULT_SUPER_ADMIN_ROLE.map((r) => [r.value, r.label])),
  );

  useEffect(() => {
    let cancelled = false;
    adminAPI
      .getRoles()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data ?? res.data ?? [];
        if (!Array.isArray(list) || list.length === 0) return;
        let opts = list.map((r) => ({ value: r.role, label: r.label || r.role, id: r.id }));
        if (opts.every((o) => typeof o.id === "number")) {
          opts = opts.sort((a, b) => a.id - b.id);
        }
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
