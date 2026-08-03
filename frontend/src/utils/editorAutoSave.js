const AUTOSAVE_KEY_PREFIX = 'report_draft_';

export function saveDraft(reportId, data) {
  const key = reportId ? `${AUTOSAVE_KEY_PREFIX}${reportId}` : `${AUTOSAVE_KEY_PREFIX}new`;
  localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }));
}

export function loadDraft(reportId) {
  const key = reportId ? `${AUTOSAVE_KEY_PREFIX}${reportId}` : `${AUTOSAVE_KEY_PREFIX}new`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function clearDraft(reportId) {
  const key = reportId ? `${AUTOSAVE_KEY_PREFIX}${reportId}` : `${AUTOSAVE_KEY_PREFIX}new`;
  localStorage.removeItem(key);
}
