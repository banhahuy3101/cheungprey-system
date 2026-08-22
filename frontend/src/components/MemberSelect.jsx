import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { LuSearch, LuUserPlus, LuX, LuCheck } from "react-icons/lu";
import { membershipAPI } from "../api/membership";
import { adminAPI } from "../api/admin";

export default function MemberSelect({ onSelect, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [existingKeys, setExistingKeys] = useState(new Set());
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  const normPhone = (p) => (p || "").replace(/[\s\-+]/g, "");
  const normName = (n) => (n || "").trim().toLowerCase().replace(/\s+/g, " ");

  const buildExistingKeys = useCallback((users) => {
    const keys = new Set();
    users.forEach((u) => {
      if (u.email) keys.add(`email:${u.email.toLowerCase()}`);
      if (u.phone_number) keys.add(`phone:${normPhone(u.phone_number)}`);
      const fn = normName(u.full_name || u.name || "");
      if (fn) keys.add(`name:${fn}`);
      if (u.zone_code) keys.add(`zone:${u.zone_code}`);
      if (u.date_of_birth) keys.add(`dob:${u.date_of_birth.slice(0, 10)}`);
    });
    return keys;
  }, []);

  const fetchExistingEmails = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers({ limit: 1000 });
      const inner = res.data?.data || res.data;
      const list = Array.isArray(inner) ? inner : inner?.users || [];
      setExistingKeys(buildExistingKeys(list));
    } catch {
      setExistingKeys(new Set());
    }
  }, [buildExistingKeys]);

  const memberHasExistingUser = useCallback((m) => {
    if (m.email && existingKeys.has(`email:${m.email.toLowerCase()}`)) return true;
    if (m.phone_number && existingKeys.has(`phone:${normPhone(m.phone_number)}`)) return true;
    const fn = normName(`${m.last_name_kh || ""} ${m.first_name_kh || ""}`.trim());
    if (fn && existingKeys.has(`name:${fn}`)) return true;
    const en = normName(`${m.last_name_en || ""} ${m.first_name_en || ""}`.trim());
    if (en && existingKeys.has(`name:${en}`)) return true;
    if (m.date_of_birth && existingKeys.has(`dob:${m.date_of_birth.slice(0, 10)}`)) return true;
    return false;
  }, [existingKeys]);

  const fetchMembers = useCallback(async (query) => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (query) params.search = query;
      const res = await membershipAPI.search(params);
      const data = res.data?.data || res.data;
      const list = Array.isArray(data) ? data : data?.members || [];
      setMembers(list.filter((m) => !memberHasExistingUser(m)));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [memberHasExistingUser]);

  useEffect(() => {
    fetchExistingEmails();
  }, [fetchExistingEmails]);

  useEffect(() => {
    if (open) {
      fetchMembers("");
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, fetchMembers]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMembers(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, fetchMembers]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleSelect = (m) => {
    setSelectedId(m.id);
    setOpen(false);
    setSearch("");
    onSelect?.(m);
  };

  const panel = open ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        zIndex: 10000,
        background: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 20px 40px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
        width: "380px",
        maxHeight: "420px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ position: "relative" }}>
          <LuSearch size={15} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកសមាជិក — ឈ្មោះ, លេខប័ណ្ណ, អត្តសញ្ញាណ..."
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem 0.55rem 2rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "0.85rem",
              outline: "none",
              background: "#f8fafc",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}
            >
              <LuX size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>កំពុងផ្ទុក...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>មិនមានសមាជិក</div>
        ) : (
          members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m)}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                border: "none",
                borderBottom: "1px solid #f8fafc",
                background: selectedId === m.id ? "#eff6ff" : "#ffffff",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { if (selectedId !== m.id) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { if (selectedId !== m.id) e.currentTarget.style.background = "#ffffff"; }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#dbeafe",
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  flexShrink: 0,
                }}
              >
                {(m.last_name_kh || m.first_name_kh || m.email || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.last_name_kh} {m.first_name_kh}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.email || m.phone_number || m.membership_card_no || "-"}
                </div>
              </div>
              {selectedId === m.id && <LuCheck size={16} style={{ color: "#2563eb", flexShrink: 0 }} />}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  useEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    let top = rect.bottom + 6;
    let left = rect.right - 380;
    if (left < 8) left = 8;
    if (top + 420 > window.innerHeight) top = Math.max(8, rect.top - 420 - 6);
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-secondary"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          borderRadius: "8px",
          padding: "0.5rem 0.9rem",
          fontWeight: 600,
          fontSize: "0.83rem",
          whiteSpace: "nowrap",
        }}
      >
        <LuUserPlus size={16} /> ជ្រើសរើសសមាជិក
      </button>
      {panel}
    </>
  );
}
