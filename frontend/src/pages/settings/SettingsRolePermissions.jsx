import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuPlus, LuShield, LuFileText,
  LuScrollText, LuUsers, LuFolderOpen, LuTrendingUp,
  LuUserCheck, LuLayoutDashboard, LuSettings, LuWrench, LuTarget
} from "react-icons/lu";
import { adminAPI } from "../../api/admin";
import { modulesAPI } from "../../api/modules";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../hooks/useAuth";
import { canAccess, FEATURES } from "../../utils/permissions";
import RbacFlow from "../../components/RbacFlow";

import RoleList from "../../components/rbac/RoleList";
import RoleMetrics from "../../components/rbac/RoleMetrics";
import PermissionMatrixTable from "../../components/rbac/PermissionMatrixTable";
import CreateRoleModal from "../../components/rbac/CreateRoleModal";
import RolePermissionsSkeleton from "../../components/rbac/RolePermissionsSkeleton";
import FormModal from "../../components/FormModal";

const MODULE_ICONS = {
  dashboard: LuLayoutDashboard,
  members: LuUsers,
  membership: LuUsers,
  files: LuFolderOpen,
  records: LuFileText,
  reports: LuScrollText,
  performance: LuTrendingUp,
  voters: LuUsers,
  users: LuUserCheck,
  settings: LuSettings,
  technical: LuWrench,
  performance_admin: LuTarget,
  zone_chiefs: LuUsers,
};

const HUMAN_MODULE_LABELS = {
  dashboard: "ទំព័រដើម (Dashboard)",
  members: "គ្រប់គ្រងសមាជិក (Members)",
  voters: "គ្រប់គ្រងអ្នកបោះឆ្នោត (Voters)",
  files: "គ្រប់គ្រងឯកសារ (Files)",
  records: "គ្រប់គ្រងកំណត់ត្រា (Records Log)",
  reports: "គ្រប់គ្រងរបាយការណ៍ (Reports)",
  performance: "លទ្ធផលការងារ (Performance)",
  performance_admin: "គ្រប់គ្រង Performance (Admin)",
  settings: "ការកំណត់ប្រព័ន្ធ (Settings)",
  users: "គ្រប់គ្រងអ្នកប្រើប្រាស់ (Users)",
  technical: "ជំនួយបច្ចេកទេស (Technical)",
  membership_write: "សរសេរសមាជិក",
  membership_dues: "តារាងសមាជិក",
  membership_admin: "គ្រប់គ្រងសមាជិក",
  membership_cards: "កាតសមាជិក",
  membership_delete: "លុបសមាជិក",
};

const buildModulesFromBE = (featList, rawModules = []) => {
  const GROUPS = [
    {
      key: "members",
      label: "គ្រប់គ្រងសមាជិក (Members Management)",
      Icon: LuUsers,
      items: [
        {
          key: "members",
          label: "សិទ្ធិជាមូលដ្ឋាន (Basic CRUD)",
          actions: {
            read: { key: "members_read", label: "មើលសមាជិក" },
            create: { key: "members_create", label: "បង្កើតសមាជិក" },
            update: { key: "members_update", label: "កែប្រែសមាជិក" },
            delete: { key: "members_delete", label: "លុបសមាជិក" },
          },
        },
        {
          key: "membership_sub",
          label: "សិទ្ធិសមាជិកភាព (Membership Features)",
          actions: {
            read: { key: "membership_dues", label: "តារាងភាគទាន (Dues)" },
            create: { key: "membership_cards", label: "បោះពុម្ពប័ណ្ណ (Cards)" },
            update: { key: "membership_write", label: "សរសេរសមាជិក (Write)" },
            delete: { key: "membership_delete", label: "លុបសមាជិកភាព" },
          },
        },
        {
          key: "membership_admin_row",
          label: "រដ្ឋបាលសមាជិក (Membership Admin)",
          actions: {
            update: { key: "membership_admin", label: "គ្រប់គ្រងសមាជិក" },
          },
        },
      ],
    },
    {
      key: "voters",
      label: "គ្រប់គ្រងអ្នកបោះឆ្នោត (Voters Management)",
      Icon: LuUsers,
      items: [
        {
          key: "voters",
          label: "សិទ្ធិអ្នកបោះឆ្នោត",
          actions: {
            read: { key: "voters_read", label: "មើលអ្នកបោះឆ្នោត" },
            create: { key: "voters_create", label: "បង្កើតអ្នកបោះឆ្នោត" },
            update: { key: "voters_update", label: "កែប្រែអ្នកបោះឆ្នោត" },
            delete: { key: "voters_delete", label: "លុបអ្នកបោះឆ្នោត" },
          },
        },
      ],
    },
    {
      key: "files",
      label: "គ្រប់គ្រងឯកសារ (Files & Documents)",
      Icon: LuFolderOpen,
      items: [
        {
          key: "files",
          label: "សិទ្ធិឯកសារ",
          actions: {
            read: { key: "files_read", label: "មើលឯកសារ" },
            create: { key: "files_create", label: "បង្កើតឯកសារ" },
            update: { key: "files_update", label: "កែប្រែឯកសារ" },
            delete: { key: "files_delete", label: "លុបឯកសារ" },
          },
        },
      ],
    },
    {
      key: "records",
      label: "គ្រប់គ្រងកំណត់ត្រា (Records Log)",
      Icon: LuFileText,
      items: [
        {
          key: "records",
          label: "សិទ្ធិកំណត់ត្រា",
          actions: {
            read: { key: "records_read", label: "មើលកំណត់ត្រា" },
            create: { key: "records_create", label: "បង្កើតកំណត់ត្រា" },
            update: { key: "records_update", label: "កែប្រែកំណត់ត្រា" },
            delete: { key: "records_delete", label: "លុបកំណត់ត្រា" },
          },
        },
      ],
    },
    {
      key: "reports",
      label: "គ្រប់គ្រងរបាយការណ៍ (Reports Management)",
      Icon: LuScrollText,
      items: [
        {
          key: "reports",
          label: "សិទ្ធិរបាយការណ៍",
          actions: {
            read: { key: "reports_read", label: "មើលរបាយការណ៍" },
            create: { key: "reports_create", label: "បង្កើតរបាយការណ៍" },
            update: { key: "reports_update", label: "កែប្រែរបាយការណ៍" },
            delete: { key: "reports_delete", label: "លុបរបាយការណ៍" },
          },
        },
      ],
    },
    {
      key: "performance",
      label: "លទ្ធផលការងារ (Performance Management)",
      Icon: LuTrendingUp,
      items: [
        {
          key: "performance",
          label: "សិទ្ធិ Performance",
          actions: {
            read: { key: "performance_read", label: "មើល Performance" },
            create: { key: "performance_create", label: "បង្កើត Performance" },
            update: { key: "performance_update", label: "កែប្រែ Performance" },
            delete: { key: "performance_delete", label: "លុប Performance" },
          },
        },
        {
          key: "performance_admin_row",
          label: "គ្រប់គ្រង Performance (Admin)",
          actions: {
            update: { key: "performance_admin", label: "គ្រប់គ្រង Performance" },
          },
        },
      ],
    },
    {
      key: "users",
      label: "គ្រប់គ្រងអ្នកប្រើប្រាស់ (Users Management)",
      Icon: LuUserCheck,
      items: [
        {
          key: "users",
          label: "សិទ្ធិអ្នកប្រើប្រាស់",
          actions: {
            read: { key: "users_read", label: "មើលអ្នកប្រើប្រាស់" },
            create: { key: "users_create", label: "បង្កើតអ្នកប្រើប្រាស់" },
            update: { key: "users_update", label: "កែប្រែអ្នកប្រើប្រាស់" },
            delete: { key: "users_delete", label: "លុបអ្នកប្រើប្រាស់" },
          },
        },
      ],
    },
    {
      key: "system",
      label: "ម៉ូឌុលប្រព័ន្ធ (System Modules)",
      Icon: LuSettings,
      items: [
        { key: "dashboard", label: "ទំព័រដើម (Dashboard)", actions: { read: { key: "dashboard", label: "ទំព័រដើម" } } },
        { key: "settings", label: "ការកំណត់ប្រព័ន្ធ (Settings)", actions: { read: { key: "settings", label: "ការកំណត់" } } },
        { key: "technical", label: "ជំនួយបច្គេកទេស (Technical)", actions: { read: { key: "technical", label: "Technical" } } },
      ],
    },
  ];

  return GROUPS;
};

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
      const [roleRes, permRes, featRes, moduleRes] = await Promise.all([
        adminAPI.getRoles(),
        adminAPI.getRolePermissions(),
        adminAPI.getFeatures(),
        modulesAPI.list(),
      ]);

      const dbRoles = roleRes.data?.data ?? roleRes.data ?? [];
      const permRows = permRes.data?.data ?? permRes.data ?? [];
      const featList = featRes.data?.data ?? featRes.data ?? [];
      const rawModules = moduleRes.data?.data ?? moduleRes.data ?? [];

      const modulesList = buildModulesFromBE(featList, rawModules);
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
      g.label.toLowerCase().includes(s) ||
      g.items.some(
        (it) =>
          it.label.toLowerCase().includes(s) ||
          Object.values(it.actions || {}).some(
            (act) => act.label.toLowerCase().includes(s) || act.key.toLowerCase().includes(s)
          )
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

      <div className="rbac-topbar">
        <div className="rbac-title-row">
          <button className="btn-icon" onClick={() => navigate("/settings")} title="ត្រឡប់">
            <LuArrowLeft />
          </button>
          <div className="rbac-title-icon"><LuShield size={22} /></div>
          <div>
            <h2 className="rbac-title">កំណត់សិទ្ធិតួនាទី (Roles & Permissions)</h2>
            <span className="rbac-subtitle">
              កំណត់សិទ្ធិលម្អិតតាមសកម្មភាព ៖ មើល (Read), បង្កើត (Create), កែប្រែ (Update), លុប (Delete)
            </span>
          </div>
        </div>
        {canCreateRole && (
          <button
            className="btn btn-primary"
            onClick={() => { setShowCreateModal(true); setCreateError(""); }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "10px", padding: "0.6rem 1.2rem", fontWeight: "600" }}
          >
            <LuPlus size={18} /> បង្កើតតួនាទីថ្មី (Add Role)
          </button>
        )}
      </div>

      <RbacFlow navigate={navigate} active="roles" />

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
