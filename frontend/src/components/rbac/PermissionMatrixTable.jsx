import React from "react";
import { LuSearch, LuUndo2, LuSave } from "react-icons/lu";

export default function PermissionMatrixTable({
  selectedRole,
  roleLabel,
  isSuperAdmin,
  canUpdatePermissions,
  filteredModules,
  currentPerms,
  togglePermission,
  setModuleCrudAll,
  setAllPermissions,
  isDirty,
  handleUndo,
  handleSave,
  saving,
  search,
  setSearch,
}) {
  // Flattened clean matrix rows definition with module-level Access keys
  const ROWS = [
    {
      group: "សមាជិក (Members)",
      items: [
        {
          key: "members",
          label: "គ្រប់គ្រងសមាជិក (Members)",
          accessKey: "members",
          actions: { read: "members_read", create: "members_create", update: "members_update", delete: "members_delete" },
        },
        {
          key: "membership_sub",
          label: "សមាជិកភាព (Dues, Cards, Write)",
          actions: { read: "membership_dues", create: "membership_cards", update: "membership_write", delete: "membership_delete" },
        },
      ],
    },
    {
      group: "អ្នកបោះឆ្នោត (Voters)",
      items: [
        {
          key: "voters",
          label: "គ្រប់គ្រងអ្នកបោះឆ្នោត (Voters)",
          accessKey: "voters",
          actions: { read: "voters_read", create: "voters_create", update: "voters_update", delete: "voters_delete" },
        },
      ],
    },
    {
      group: "ឯកសារ (Files)",
      items: [
        {
          key: "files",
          label: "គ្រប់គ្រងឯកសារ (Files)",
          accessKey: "files",
          actions: { read: "files_read", create: "files_create", update: "files_update", delete: "files_delete" },
        },
      ],
    },
    {
      group: "កំណត់ត្រា (Records Log)",
      items: [
        {
          key: "records",
          label: "គ្រប់គ្រងកំណត់ត្រា (Records Log)",
          accessKey: "records",
          actions: { read: "records_read", create: "records_create", update: "records_update", delete: "records_delete" },
        },
      ],
    },
    {
      group: "របាយការណ៍ (Reports)",
      items: [
        {
          key: "reports",
          label: "គ្រប់គ្រងរបាយការណ៍ (Reports)",
          accessKey: "reports",
          actions: { read: "reports_read", create: "reports_create", update: "reports_update", delete: "reports_delete" },
        },
      ],
    },
    {
      group: "លទ្ធផលការងារ (Performance)",
      items: [
        {
          key: "performance",
          label: "លទ្ធផលការងារ (Performance)",
          accessKey: "performance",
          actions: { read: "performance_read", create: "performance_create", update: "performance_update", delete: "performance_delete" },
        },
      ],
    },
    {
      group: "ប្រព័ន្ធ និងការកំណត់ (System & Settings)",
      items: [
        { key: "dashboard", label: "ទំព័រដើម (Dashboard)", accessKey: "dashboard", actions: {} },
        { key: "settings", label: "ការកំណត់ប្រព័ន្ធ (Settings)", accessKey: "settings", actions: {} },
        {
          key: "users",
          label: "គ្រប់គ្រងអ្នកប្រើប្រាស់ (Users)",
          accessKey: "users",
          actions: { read: "users_read", create: "users_create", update: "users_update", delete: "users_delete" },
        },
        { key: "membership_admin", label: "រដ្ឋបាលសមាជិក (Membership Admin)", accessKey: "membership_admin", actions: { update: "membership_admin" } },
        { key: "performance_admin", label: "គ្រប់គ្រង Performance (Admin)", accessKey: "performance_admin", actions: { update: "performance_admin" } },
        { key: "technical", label: "ជំនួយបច្ចេកទេស (Technical)", accessKey: "technical", actions: {} },
      ],
    },
  ];

  // Filter rows by search term
  const displayRows = ROWS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        it.label.toLowerCase().includes(s) ||
        (it.accessKey && it.accessKey.toLowerCase().includes(s)) ||
        Object.values(it.actions || {}).some((k) => k.toLowerCase().includes(s))
      );
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="rbac-panel">
      {selectedRole ? (
        <div>
          {/* Top Bar Header & Bulk Actions */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #e2e8f0",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>{roleLabel || selectedRole}</span>
                <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#475569", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: "600" }}>
                  {selectedRole}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem" }}>
                {isSuperAdmin
                  ? "តួនាទី Super Admin មានសិទ្ធិ 100% លើគ្រប់ម៉ូឌុលទាំងអស់ក្នុងប្រព័ន្ធ (Read-Only Matrix)"
                  : "កំណត់សិទ្ធិ ចូលប្រើ (Access), មើល (Read), បង្កើត (Create), កែប្រែ (Update), លុប (Delete)"}
              </div>
            </div>

            <div className="rbac-bulk-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-primary rbac-bulk-button"
                onClick={() => setAllPermissions(true)}
                disabled={isSuperAdmin || !canUpdatePermissions}
              >
                អនុញ្ញាតទាំងអស់
              </button>
              <button
                type="button"
                className="btn btn-secondary rbac-bulk-button"
                onClick={() => setAllPermissions(false)}
                disabled={isSuperAdmin || !canUpdatePermissions}
              >
                បិទទាំងអស់
              </button>
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="rbac-permission-toolbar">
            <div className="rbac-search">
              <LuSearch size={16} />
              <input
                type="text"
                placeholder="ស្វែងរកម៉ូឌុល ឬសិទ្ធិ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className={`rbac-pill ${isDirty ? "warn" : "blue"}`}>
              {isDirty ? "Unsaved changes" : "Saved"}
            </span>
          </div>

          {/* Ultra Clean 6-Column Matrix Table with Access Right */}
          <div style={{ padding: "1rem", overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: "700", color: "#334155" }}>
                    ម៉ូឌុលប្រព័ន្ធ (Module Name)
                  </th>
                  <th style={{ textAlign: "center", width: "95px", padding: "0.85rem 0.4rem", fontSize: "0.82rem", fontWeight: "700", color: "#2563eb" }}>
                    ចូលប្រើ (Access)
                  </th>
                  <th style={{ textAlign: "center", width: "95px", padding: "0.85rem 0.4rem", fontSize: "0.82rem", fontWeight: "700", color: "#1e293b" }}>
                    មើល (Read)
                  </th>
                  <th style={{ textAlign: "center", width: "95px", padding: "0.85rem 0.4rem", fontSize: "0.82rem", fontWeight: "700", color: "#1e293b" }}>
                    បង្កើត (Create)
                  </th>
                  <th style={{ textAlign: "center", width: "95px", padding: "0.85rem 0.4rem", fontSize: "0.82rem", fontWeight: "700", color: "#1e293b" }}>
                    កែប្រែ (Update)
                  </th>
                  <th style={{ textAlign: "center", width: "95px", padding: "0.85rem 0.4rem", fontSize: "0.82rem", fontWeight: "700", color: "#1e293b" }}>
                    លុប (Delete)
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((g) => (
                  <React.Fragment key={g.group}>
                    {/* Module Group Header Row */}
                    <tr style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                      <td colSpan={6} style={{ padding: "0.45rem 1rem", fontWeight: "700", fontSize: "0.8rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {g.group}
                      </td>
                    </tr>

                    {/* Module Sub-Rows */}
                    {g.items.map((row) => {
                      const accessKey = row.accessKey;
                      const readKey = row.actions?.read;
                      const createKey = row.actions?.create;
                      const updateKey = row.actions?.update;
                      const deleteKey = row.actions?.delete;

                      const isAccessOn = accessKey ? !!currentPerms[accessKey] : false;
                      const isReadOn = readKey ? !!currentPerms[readKey] : false;
                      const isCreateOn = createKey ? !!currentPerms[createKey] : false;
                      const isUpdateOn = updateKey ? !!currentPerms[updateKey] : false;
                      const isDeleteOn = deleteKey ? !!currentPerms[deleteKey] : false;

                      return (
                        <tr key={row.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.75rem 1rem 0.75rem 1.5rem" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "#0f172a" }}>
                              {row.label}
                            </span>
                          </td>

                          {/* ACCESS Right Cell */}
                          <td style={{ textAlign: "center", padding: "0.75rem 0.4rem" }}>
                            {accessKey ? (
                              <input
                                type="checkbox"
                                checked={isAccessOn}
                                disabled={isSuperAdmin || !canUpdatePermissions}
                                onChange={() => togglePermission(accessKey)}
                                style={{ width: "18px", height: "18px", accentColor: "#2563eb", cursor: isSuperAdmin || !canUpdatePermissions ? "default" : "pointer" }}
                                title={`Module Access Right (${accessKey})`}
                              />
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>—</span>
                            )}
                          </td>

                          {/* READ Cell */}
                          <td style={{ textAlign: "center", padding: "0.75rem 0.4rem" }}>
                            {readKey ? (
                              <input
                                type="checkbox"
                                checked={isReadOn}
                                disabled={isSuperAdmin || !canUpdatePermissions}
                                onChange={() => togglePermission(readKey)}
                                style={{ width: "18px", height: "18px", accentColor: "#2563eb", cursor: isSuperAdmin || !canUpdatePermissions ? "default" : "pointer" }}
                                title={`Read Permission (${readKey})`}
                              />
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>—</span>
                            )}
                          </td>

                          {/* CREATE Cell */}
                          <td style={{ textAlign: "center", padding: "0.75rem 0.4rem" }}>
                            {createKey ? (
                              <input
                                type="checkbox"
                                checked={isCreateOn}
                                disabled={isSuperAdmin || !canUpdatePermissions}
                                onChange={() => togglePermission(createKey)}
                                style={{ width: "18px", height: "18px", accentColor: "#2563eb", cursor: isSuperAdmin || !canUpdatePermissions ? "default" : "pointer" }}
                                title={`Create Permission (${createKey})`}
                              />
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>—</span>
                            )}
                          </td>

                          {/* UPDATE Cell */}
                          <td style={{ textAlign: "center", padding: "0.75rem 0.4rem" }}>
                            {updateKey ? (
                              <input
                                type="checkbox"
                                checked={isUpdateOn}
                                disabled={isSuperAdmin || !canUpdatePermissions}
                                onChange={() => togglePermission(updateKey)}
                                style={{ width: "18px", height: "18px", accentColor: "#2563eb", cursor: isSuperAdmin || !canUpdatePermissions ? "default" : "pointer" }}
                                title={`Update Permission (${updateKey})`}
                              />
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>—</span>
                            )}
                          </td>

                          {/* DELETE Cell */}
                          <td style={{ textAlign: "center", padding: "0.75rem 0.4rem" }}>
                            {deleteKey ? (
                              <input
                                type="checkbox"
                                checked={isDeleteOn}
                                disabled={isSuperAdmin || !canUpdatePermissions}
                                onChange={() => togglePermission(deleteKey)}
                                style={{ width: "18px", height: "18px", accentColor: "#2563eb", cursor: isSuperAdmin || !canUpdatePermissions ? "default" : "pointer" }}
                                title={`Delete Permission (${deleteKey})`}
                              />
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Sticky Action Footer */}
          <div className="rbac-sticky-actions">
            {isDirty && !isSuperAdmin && canUpdatePermissions && (
              <button type="button" className="btn btn-secondary rbac-cancel-button" onClick={handleUndo}>
                <LuUndo2 size={16} /> បោះបង់ការកែប្រែ
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary rbac-save-button"
              onClick={handleSave}
              disabled={saving || !isDirty || isSuperAdmin || !canUpdatePermissions}
            >
              <LuSave size={17} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកសិទ្ធិ"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
          សូមជ្រើសរើសតួនាទីនៅខាងឆ្វេងដើម្បីកំណត់សិទ្ធិ CRUD
        </div>
      )}
    </div>
  );
}
