import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuPlus, LuShield } from "react-icons/lu";
import { adminAPI } from "../../api/admin";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";
import PageHeader from "../../components/PageHeader";

import RoleList from "../../components/rbac/RoleList";
import RoleMetrics from "../../components/rbac/RoleMetrics";
import PermissionMatrixTable from "../../components/rbac/PermissionMatrixTable";
import CreateRoleModal from "../../components/rbac/CreateRoleModal";
import RolePermissionsSkeleton from "../../components/rbac/RolePermissionsSkeleton";
import FormModal from "../../components/FormModal";

export default function SettingsRolePermissions() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refreshProfile } = useAuth();

  const [roles, setRoles] = useState([]);
  const [originalPerms, setOriginalPerms] = useState({});
  const [draftPerms, setDraftPerms] = useState({});
  const [features, setFeatures] = useState([]);
  const [apiModules, setApiModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [search, setSearch] = useState("");

  const isSystemUser = user?.roles?.includes("super_admin") || user?.role === "super_admin" || roles.some((r) => r.is_system && (user?.roles?.includes(r.role) || user?.role === r.role));
  const canCreateRole = canAccess(user, FEATURES.users, "create") && isSystemUser;
  const canUpdatePermissions = canAccess(user, FEATURES.users, "update");
  const canDeleteRole = canAccess(user, FEATURES.users, "delete") && isSystemUser;

  // Create role modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({ role: "", label: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit role modal state
  const [editTargetRole, setEditTargetRole] = useState(null);
  const [editRoleLabel, setEditRoleLabel] = useState("");
  const [editingRoleSaving, setEditingRoleSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleRes, permRes, featRes, permModulesRes] = await Promise.all([
        adminAPI.getRoles(),
        adminAPI.getRolePermissions(),
        adminAPI.getFeatures(),
        adminAPI.getPermissionModules(),
      ]);

      const dbRoles = roleRes.data?.data ?? roleRes.data ?? [];
      const permRows = permRes.data?.data ?? permRes.data ?? [];
      const featList = featRes.data?.data ?? featRes.data ?? [];
      const rawPermData = permModulesRes.data?.data ?? permModulesRes.data ?? {};
      const modulesList = rawPermData.modules ?? (Array.isArray(rawPermData) ? rawPermData : []);
      setApiModules(modulesList);

      const rolesMap = new Map();
      dbRoles.forEach((r) => {
        rolesMap.set(r.role, {
          role: r.role,
          label: r.label || r.role,
          is_system: !!r.is_system,
        });
      });

      permRows.forEach((row) => {
        if (!rolesMap.has(row.role)) {
          rolesMap.set(row.role, {
            role: row.role,
            label: row.role,
            is_system: false,
          });
        }
      });

      const mergedRoles = Array.from(rolesMap.values());
      const permsObj = {};
      permRows.forEach((row) => {
        permsObj[row.role] = { ...(row.permissions || {}) };
      });

      const extractedFeatures = featList.map((f) => f.key || f);

      setRoles(mergedRoles);
      setOriginalPerms(permsObj);
      setDraftPerms(JSON.parse(JSON.stringify(permsObj)));
      setFeatures(extractedFeatures);

      if (mergedRoles.length > 0 && !selectedRole) {
        setSelectedRole(mergedRoles[0].role);
      }
    } catch {
      toast.error("ផ្ទុកទិន្នន័យតួនាទី និងសិទ្ធិមិនបានសម្រេច");
    } finally {
      setLoading(false);
    }
  }, [selectedRole, toast]);

  useEffect(() => {
    load();
  }, []);

  const currentPerms = draftPerms[selectedRole] || {};
  const originalForRole = originalPerms[selectedRole] || {};
  const isDirty = JSON.stringify(currentPerms) !== JSON.stringify(originalForRole);
  const isSuperAdmin = selectedRole === "super_admin";

  const togglePermission = (fKey) => {
    if (isSuperAdmin || !canUpdatePermissions) return;
    setDraftPerms((prev) => {
      const p = { ...(prev[selectedRole] || {}) };
      const nextVal = !p[fKey];
      p[fKey] = nextVal;

      // If Access checkbox (base feature key) is unticked, untick all CRUD actions in the same row
      if (!nextVal) {
        p[`${fKey}_read`] = false;
        p[`${fKey}_create`] = false;
        p[`${fKey}_update`] = false;
        p[`${fKey}_delete`] = false;
      }

      const parts = fKey.split("_");
      const last = parts[parts.length - 1];
      if (["create", "read", "update", "delete"].includes(last)) {
        const modKey = parts.slice(0, -1).join("_");
        const hasAnyCrud = ["read", "create", "update", "delete"].some((act) => p[`${modKey}_${act}`]);
        p[modKey] = hasAnyCrud;
      }
      return { ...prev, [selectedRole]: p };
    });
  };

  const setModuleCrudAll = (modKey, value) => {
    if (isSuperAdmin || !canUpdatePermissions) return;
    setDraftPerms((prev) => {
      const p = { ...(prev[selectedRole] || {}) };
      p[modKey] = value;
      p[`${modKey}_read`] = value;
      p[`${modKey}_create`] = value;
      p[`${modKey}_update`] = value;
      p[`${modKey}_delete`] = value;
      return { ...prev, [selectedRole]: p };
    });
  };

  const setAllPermissions = (value) => {
    if (isSuperAdmin || !canUpdatePermissions) return;
    setDraftPerms((prev) => {
      const p = { ...(prev[selectedRole] || {}) };
      features.forEach((fKey) => {
        p[fKey] = value;
      });
      return { ...prev, [selectedRole]: p };
    });
  };

  const handleUndo = () => {
    setDraftPerms((prev) => ({
      ...prev,
      [selectedRole]: JSON.parse(JSON.stringify(originalForRole)),
    }));
  };

  const handleSave = async () => {
    if (!selectedRole || isSuperAdmin || !canUpdatePermissions) return;
    setSaving(true);
    try {
      await adminAPI.updateRolePermissions(selectedRole, currentPerms);
      if (user?.roles?.includes(selectedRole) || user?.role === selectedRole) {
        await refreshProfile();
      }
      const roleObj = roles.find((r) => r.role === selectedRole);
      toast.success(`បានរក្សាទុកសិទ្ធិ CRUD សម្រាប់ «${roleObj?.label || selectedRole}» ដោយជោគជ័យ!`);
      setOriginalPerms((prev) => ({
        ...prev,
        [selectedRole]: JSON.parse(JSON.stringify(currentPerms)),
      }));
    } catch {
      toast.error("រក្សាទុកសិទ្ធិមិនបានសម្រេច");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.role.trim() || !newRole.label.trim()) {
      setCreateError("សូមបញ្ចូលព័ត៌មានឱ្យបានគ្រប់គ្រាន់!");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      await adminAPI.createRole({
        role: newRole.role.trim().toLowerCase(),
        label: newRole.label.trim(),
      });
      toast.success("បង្កើតតួនាទីថ្មីដោយជោគជ័យ!");
      setShowCreateModal(false);
      setNewRole({ role: "", label: "" });
      load();
    } catch (err) {
      setCreateError(err.response?.data?.error || err.response?.data?.message || err.message || "បង្កើតមិនបានសម្រេច");
    } finally {
      setCreating(false);
    }
  };

  const handleEditRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editTargetRole?.role) return;
    if (!editRoleLabel.trim()) {
      setEditError("សូមបញ្ចូលឈ្មោះតួនាទី!");
      return;
    }
    setEditingRoleSaving(true);
    setEditError("");
    try {
      await adminAPI.updateRole(editTargetRole.role, { label: editRoleLabel.trim() });
      toast.success("ធ្វើបច្ចុប្បន្នភាពឈ្មោះតួនាទីដោយជោគជ័យ!");
      setEditTargetRole(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || err.response?.data?.message || err.message || "កែប្រែមិនបានសម្រេច");
    } finally {
      setEditingRoleSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteRole(deleteTarget.role);
      toast.success(`បានលុបតួនាទី «${deleteTarget.label}» រួចរាល់!`);
      setDeleteTarget(null);
      if (selectedRole === deleteTarget.role) {
        setSelectedRole("super_admin");
      }
      load();
    } catch {
      toast.error("លុបតួនាទីមិនបានសម្រេច!");
    }
  };

  const filteredModules = apiModules.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (g.label || "").toLowerCase().includes(s) ||
      (g.items || []).some(
        (it) =>
          (it.label || "").toLowerCase().includes(s) ||
          (it.accessKey && it.accessKey.toLowerCase().includes(s)) ||
          Object.values(it.actions || {}).some((act) => {
            const k = typeof act === "object" && act !== null ? act.key : act;
            const l = typeof act === "object" && act !== null ? act.label : "";
            return (k && k.toLowerCase().includes(s)) || (l && l.toLowerCase().includes(s));
          })
      )
    );
  });

  const selectedRoleObj = roles.find((r) => r.role === selectedRole);

  if (loading) {
    return <RolePermissionsSkeleton />;
  }

  return (
    <div className="page rbac-shell">
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)",
            animation: "pulse 1.2s infinite ease-in-out",
            zIndex: 99,
            borderRadius: "4px",
          }}
        />
      )}

      <PageHeader
        showBack={() => navigate("/settings")}
        title="កំណត់សិទ្ធិតួនាទី (Roles & Permissions)"
        subtitle="កំណត់សិទ្ធិលម្អិតតាមសកម្មភាព ៖ មើល (Read), បង្កើត (Create), កែប្រែ (Update), លុប (Delete)"
        icon={<LuShield size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "សិទ្ធិតួនាទី" },
        ]}
        actions={
          canCreateRole && (
            <button
              className="btn btn-primary"
              onClick={() => { setShowCreateModal(true); setCreateError(""); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                borderRadius: "8px",
                padding: "0.55rem 1.1rem",
                fontWeight: "600",
              }}
            >
              <LuPlus size={18} /> បង្កើតតួនាទីថ្មី (Add Role)
            </button>
          )
        }
      />

      <RoleMetrics roles={roles} />

      <div className="rbac-layout">
        <RoleList
          roles={roles}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          canDeleteRole={canDeleteRole}
          setDeleteTarget={setDeleteTarget}
          onEditRole={canUpdatePermissions ? (r) => {
            setEditTargetRole(r);
            setEditRoleLabel(r.label || r.role);
            setEditError("");
          } : undefined}
        />

        <PermissionMatrixTable
          selectedRole={selectedRole}
          roleLabel={selectedRoleObj?.label}
          isSuperAdmin={isSuperAdmin}
          canUpdatePermissions={canUpdatePermissions}
          filteredModules={filteredModules}
          currentPerms={currentPerms}
          togglePermission={togglePermission}
          setModuleCrudAll={setModuleCrudAll}
          setAllPermissions={setAllPermissions}
          isDirty={isDirty}
          handleUndo={handleUndo}
          handleSave={handleSave}
          saving={saving}
          search={search}
          setSearch={setSearch}
        />
      </div>

      <CreateRoleModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newRole={newRole}
        setNewRole={setNewRole}
        creating={creating}
        createError={createError}
        onSubmit={handleCreateRole}
      />

      <FormModal
        open={!!editTargetRole}
        onClose={() => setEditTargetRole(null)}
        title={`✏️ កែប្រែព័ត៌មានតួនាទី — ${editTargetRole?.role}`}
        onSubmit={handleEditRoleSubmit}
        saving={editingRoleSaving}
        error={editError}
        submitText="រក្សាទុកកែប្រែ"
        cancelText="បោះបង់"
        maxWidth="540px"
      >
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
            ឈ្មោះបង្ហាញតួនាទី (Role Display Name)
          </label>
          <input
            className="modern-form-input"
            value={editRoleLabel}
            onChange={(e) => setEditRoleLabel(e.target.value)}
            placeholder="បញ្ចូលឈ្មោះតួនាទី..."
            style={{ width: "100%" }}
            required
          />
        </div>
      </FormModal>

      {deleteTarget && (
        <ConfirmDialog
          title="លុបតួនាទី (Delete Custom Role)"
          message={`តើអ្នកពិតជាចង់លុបតួនាទី «${deleteTarget.label} (${deleteTarget.role})» នេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ!`}
          confirmText="លុបតួនាទី"
          danger
          onConfirm={handleDeleteRole}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
