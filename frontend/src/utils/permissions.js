export const FEATURES = {
  dashboard: "dashboard",
  members: "members",
  members_create: "members_create",
  members_read: "members_read",
  members_update: "members_update",
  members_delete: "members_delete",

  voters: "voters",
  voters_create: "voters_create",
  voters_read: "voters_read",
  voters_update: "voters_update",
  voters_delete: "voters_delete",
  finances: "finances",
  finances_create: "finances_create",
  finances_read: "finances_read",
  finances_update: "finances_update",
  finances_delete: "finances_delete",

  files: "files",
  files_create: "files_create",
  files_read: "files_read",
  files_update: "files_update",
  files_delete: "files_delete",

  reports: "reports",
  reports_create: "reports_create",
  reports_read: "reports_read",
  reports_update: "reports_update",
  reports_delete: "reports_delete",

  performance: "performance",
  performance_create: "performance_create",
  performance_read: "performance_read",
  performance_update: "performance_update",
  performance_delete: "performance_delete",
  performance_admin: "performance_admin",
  settings: "settings",
  users: "users",
  users_create: "users_create",
  users_read: "users_read",
  users_update: "users_update",
  users_delete: "users_delete",
  technical: "technical",

  membership_write: "membership_write",
  membership_dues: "membership_dues",
  membership_admin: "membership_admin",
  membership_cards: "membership_cards",
  membership_delete: "membership_delete",
};

export const FEATURE_LABELS = {
  dashboard: "ទំព័រដើម",
  members: "សមាជិក",
  members_create: "បង្កើតសមាជិក (Create)",
  members_read: "មើលសមាជិក (Read)",
  members_update: "កែប្រែសមាជិក (Update)",
  members_delete: "លុបសមាជិក (Delete)",

  voters: "អ្នកបោះឆ្នោត",
  finances: "ហិរញ្ញវត្ថុ",

  files: "ឯកសារ",
  files_create: "បង្កើតឯកសារ (Create)",
  files_read: "មើលឯកសារ (Read)",
  files_update: "កែប្រែឯកសារ (Update)",
  files_delete: "លុបឯកសារ (Delete)",

  reports: "របាយការណ៍",
  reports_create: "បង្កើតរបាយការណ៍ (Create)",
  reports_read: "មើលរបាយការណ៍ (Read)",
  reports_update: "កែប្រែរបាយការណ៍ (Update)",
  reports_delete: "លុបរបាយការណ៍ (Delete)",

  performance: "លទ្ធផលការងារ",
  performance_admin: "គ្រប់គ្រង Performance",
  settings: "ការកំណត់",
  users: "គ្រប់គ្រងអ្នកប្រើ",
  technical: "Technical",

  membership_write: "សរសេរសមាជិក",
  membership_dues: "តារាងសមាជិក",
  membership_admin: "គ្រប់គ្រងសមាជិក",
  membership_cards: "កាតសមាជិក",
  membership_delete: "លុបសមាជិក",
};

export function canAccess(user, feature, action) {
  if (!user) return false;

  const perms = user.permissions || {};

  if (action) {
    const specificKey = `${feature}_${action}`;
    if (specificKey in perms) {
      return !!perms[specificKey];
    }
  }

  if (feature in perms && perms[feature]) {
    return true;
  }

  // Check if any granular sub-permission (e.g. feature_read, feature_create, feature_update, feature_delete) is enabled
  const prefix = `${feature}_`;
  for (const k in perms) {
    if ((k.startsWith(prefix) || k === feature) && perms[k]) {
      return true;
    }
  }

  return false;
}

export function isAdmin(user) {
  return canAccess(user, FEATURES.users);
}

export function hasAnyFeature(user, features) {
  return features.some((f) => canAccess(user, f));
}

export function getModuleForFeature(feature) {
  if (!feature) return null;
  if (
    feature.startsWith("members") ||
    feature === "membership_write" ||
    feature === "membership_dues" ||
    feature === "membership_admin" ||
    feature === "membership_cards" ||
    feature === "membership_delete"
  ) {
    return "membership";
  }
  if (feature.startsWith("voters")) {
    return "voters";
  }
  if (feature.startsWith("files")) {
    return "files";
  }
  if (feature.startsWith("reports")) {
    return "reports";
  }
  if (feature.startsWith("performance") || feature === "performance_admin") {
    return "performance";
  }
  if (feature === "finances") {
    return "finances";
  }
  return null;
}
