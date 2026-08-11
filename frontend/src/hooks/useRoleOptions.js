import { useState, useEffect } from "react";
import { adminAPI } from "../api/admin";

const FALLBACK_ROLES = [
  { value: "super_admin", label: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់" },
  { value: "admin", label: "អ្នកគ្រប់គ្រង" },
  { value: "province_chief", label: "ប្រធានខេត្ត" },
  { value: "district_chief", label: "ប្រធានស្រុក" },
  { value: "commune_chief", label: "ប្រធានឃុំ" },
  { value: "commune_clerk", label: "ស្មៀនឃុំ" },
  { value: "village_chief", label: "ប្រធានភូមិ" },
  { value: "recorder", label: "អ្នកកត់ត្រា" },
  { value: "regular_user", label: "អ្នកប្រើប្រាស់ធម្មតា" },
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
        let opts = list.map((r) => ({ value: r.role, label: r.label || r.role, id: r.id }));
        if (opts.every(o => typeof o.id === "number")) {
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
