export const FEATURES = {
  dashboard: "dashboard",
  members: "members",
  voters: "voters",
  files: "files",
  records: "records",
  reports: "reports",
  performance: "performance",
  performance_admin: "performance_admin",
  settings: "settings",
  users: "users",
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
  voters: "អ្នកបោះឆ្នោត",
  files: "ឯកសារ",
  records: "កំណត់ត្រា",
  reports: "របាយការណ៍",
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

export function canAccess(user, feature) {
  if (!user) return false;
  if (user.permissions && feature in user.permissions) {
    return !!user.permissions[feature];
  }
  return false;
}

export function isAdmin(user) {
  return canAccess(user, FEATURES.users);
}

export function hasAnyFeature(user, features) {
  return features.some((f) => canAccess(user, f));
}
