export const FEATURES = {
  dashboard: "dashboard",
  members: "members",
  voters: "voters",
  finances: "finances",
  files: "files",
  records: "records",
  reports: "reports",
  report_templates: "report_templates",
  performance: "performance",
  performance_admin: "performance_admin",
  settings: "settings",
  users: "users",
  technical: "technical",
};

export const FEATURE_LABELS = {
  dashboard: "ទំព័រដើម",
  members: "សមាជិក",
  voters: "អ្នកបោះឆ្នោត",
  finances: "ហិរញ្ញវត្ថុ",
  files: "ឯកសារ",
  records: "កំណត់ត្រា",
  reports: "របាយការណ៍",
  report_templates: "គំរូរបាយការណ៍",
  performance: "លទ្ធផលការងារ",
  performance_admin: "គ្រប់គ្រង Performance",
  settings: "ការកំណត់",
  users: "គ្រប់គ្រងអ្នកប្រើ",
  technical: "Technical",
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
