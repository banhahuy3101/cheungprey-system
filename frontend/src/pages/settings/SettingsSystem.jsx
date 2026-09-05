import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCopy, LuSave, LuSettings, LuDatabase, LuPlus, LuPencil, LuCheck, LuX, LuSparkles, LuLoader } from "react-icons/lu";
import FormInput from "../../components/FormInput";
import PageHeader from "../../components/PageHeader";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../utils/permissions";
import { useToast } from "../../components/Toast";

const getJsonState = (value) => {
  const t = String(value ?? "").trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    JSON.parse(t);
    return "valid";
  } catch {
    return "invalid";
  }
};

export default function SettingsSystem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [dbSettings, setDbSettings] = useState([]);
  const [loadingDbSettings, setLoadingDbSettings] = useState(true);
  const [dbTables, setDbTables] = useState([]);
  const [loadingDbTables, setLoadingDbTables] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState({ key: "", value: "", description: "", category: "general" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ key: "", value: "", description: "", category: "general" });
  const [savingSetting, setSavingSetting] = useState(false);

  const fetchDbSettings = async () => {
    setLoadingDbSettings(true);
    try {
      const res = await adminAPI.listSystemSettings();
      const items = res.data?.data || res.data || [];
      setDbSettings(Array.isArray(items) ? items : []);
    } catch {
      // Fallback
    } finally {
      setLoadingDbSettings(false);
    }
  };

  const fetchDbTables = async () => {
    setLoadingDbTables(true);
    try {
      const res = await adminAPI.listDatabaseTables();
      const items = res.data?.data || res.data || [];
      setDbTables(Array.isArray(items) ? items : []);
    } catch {
      setDbTables([]);
    } finally {
      setLoadingDbTables(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [settingsRes, tablesRes] = await Promise.all([
          adminAPI.listSystemSettings(),
          adminAPI.listDatabaseTables(),
        ]);
        const settingsItems = settingsRes.data?.data || settingsRes.data || [];
        const tablesItems = tablesRes.data?.data || tablesRes.data || [];
        setDbSettings(Array.isArray(settingsItems) ? settingsItems : []);
        setDbTables(Array.isArray(tablesItems) ? tablesItems : []);
      } catch {
        setDbTables([]);
      } finally {
        setLoadingDbSettings(false);
        setLoadingDbTables(false);
      }
    };
    loadAll();
  }, []);

  if (!isAdmin(user)) {
    return <div className="alert alert-error">អ្នកគ្មានសិទ្ធិចូលប្រើទំព័រនេះទេ។</div>;
  }

  const copyValue = async (val) => {
    try {
      await navigator.clipboard.writeText(val);
      toast.success("បាន copy តម្លៃ");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleSaveSetting = async (key, val, desc) => {
    setSavingSetting(true);
    try {
      let parsedValue = val;
      try {
        parsedValue = JSON.parse(val);
      } catch {
        parsedValue = val;
      }
      await adminAPI.updateSystemSetting({ key, value: parsedValue, description: desc });
      toast.success(`បានរក្សាទុក Global Variable "${key}" បានសម្រេច`);
      setEditingKey(null);
      setShowAddForm(false);
      setNewForm({ key: "", value: "", description: "", category: "general" });
      fetchDbSettings();
    } catch (err) {
      toast.error(err.response?.data?.error || "រក្សាទុកមិនបានសម្រេច");
    } finally {
      setSavingSetting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        showBack={() => navigate("/settings/technical")}
        title="ការកំណត់ប្រព័ន្ធ (System Settings & Global Variables)"
        subtitle="គ្រប់គ្រងពាក្យសម្ងាត់ដើម និងប្រព័ន្ធគ្រប់គ្រងអថេរសកល (Global Variables in system_settings DB table)"
        icon={<LuSettings size={20} />}
        breadcrumbs={[
          { label: "ការកំណត់", path: "/settings" },
          { label: "បច្ចេកទេស", path: "/settings/technical" },
          { label: "System Settings" },
        ]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Global Variables (public.system_settings) Table Manager */}
        <div className="card shadow-sm" style={{ padding: "1.5rem", borderRadius: "14px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LuDatabase size={20} style={{ color: "#0284c7" }} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  តារាងអថេរសកល (Global Variables in <code style={{ color: "#0284c7" }}>public.system_settings</code>)
                </h3>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.25rem 0 0 0" }}>
                គ្រប់គ្រង កែប្រែ និងបន្ថែមអថេរសកលប្រព័ន្ធ (Global System Configuration Variables)
              </p>
            </div>
            <button
              type="button"
              className="btn-icon"
              title="បន្ថែមអថេរថ្មី (Add Variable)"
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ color: "#ffffff", background: "#0284c7", borderColor: "#0284c7" }}
            >
              <LuPlus size={18} />
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSetting(newForm.key, newForm.value, newForm.description);
              }}
              style={{
                background: "#ffffff",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ background: "#e0f2fe", padding: "0.4rem 0.8rem", borderRadius: "8px", color: "#0369a1" }}>
                    <LuPlus size={18} />
                  </span>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    បន្ថែម Global Variable ថ្មី
                  </h4>
                </div>
                <button type="button" className="btn-icon" title="បិទ (Esc)" onClick={() => setShowAddForm(false)}>
                  <LuX size={18} />
                </button>
              </div>

              <div className="sys-settings-form-grid">
                <FormInput
                  id="newKey"
                  label="Key Name"
                  required
                  mono
                  type="text"
                  placeholder="ឧ. system_currency"
                  autoFocus
                  maxLength={100}
                  helper="ត្រូវមានតែមួយក្នុងប្រព័ន្ធ"
                  onKeyDown={(e) => e.key === "Escape" && setShowAddForm(false)}
                  value={newForm.key}
                  onChange={(e) => setNewForm({ ...newForm, key: e.target.value.trim() })}
                />

                <FormInput
                  id="newValue"
                  label="Value"
                  required
                  mono
                  type="text"
                  placeholder='ឧ. KHR / {"rate": 4100}'
                  onKeyDown={(e) => e.key === "Escape" && setShowAddForm(false)}
                  value={newForm.value}
                  onChange={(e) => setNewForm({ ...newForm, value: e.target.value })}
                  status={(
                    <>
                      {getJsonState(newForm.value) === "valid" && (
                        <div className="sys-settings-status is-valid">
                          <LuCheck size={12} /> JSON ត្រឹមត្រូវ
                        </div>
                      )}
                      {getJsonState(newForm.value) === "invalid" && (
                        <div className="sys-settings-status is-invalid">
                          <LuX size={12} /> JSON មិនត្រឹមត្រូវ — នឹងត្រូវរក្សាទុកជា string
                        </div>
                      )}
                    </>
                  )}
                />

                <FormInput
                  id="newDescription"
                  label="Description"
                  type="text"
                  placeholder="ឧ. រូបិយប័ណ្ណផ្លូវការ"
                  onKeyDown={(e) => e.key === "Escape" && setShowAddForm(false)}
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                <button
                  type="button"
                  className="btn-icon"
                  title="បោះបង់"
                  onClick={() => setShowAddForm(false)}
                  disabled={savingSetting}
                >
                  <LuX size={15} />
                </button>
                <button
                  type="submit"
                  className="btn-icon btn-success"
                  title="រក្សាទុកអថេរ"
                  disabled={!newForm.key || !newForm.value || savingSetting}
                >
                  {savingSetting ? <LuLoader size={14} className="spin" /> : <LuSave size={15} />}
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="table-responsive" style={{ borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", width: "24%" }}>Key Name (អថេរ)</th>
                  <th style={{ textAlign: "left", width: "32%" }}>Value (តម្លៃ)</th>
                  <th style={{ textAlign: "left", width: "32%" }}>ពិពណ៌នា (Description)</th>
                  <th style={{ textAlign: "center", width: "12%" }}>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {loadingDbSettings ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      កំពុងផ្ទុកតារាង system_settings...
                    </td>
                  </tr>
                ) : dbSettings.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      មិនទាន់មានអថេរក្នុង public.system_settings នៅឡើយទេ។
                    </td>
                  </tr>
                ) : (
                  dbSettings.map((item) => {
                    const isEditing = editingKey === item.key;
                    const stringVal = typeof item.value === "object" ? JSON.stringify(item.value) : String(item.value ?? "");

                    if (isEditing) {
                      const jsonState = getJsonState(editForm.value);
                      const useTextarea = editForm.value.length > 48 || editForm.value.includes("\n");

                      return (
                        <tr key={item.key} style={{ background: "#f8fafc" }}>
                          <td>
                            <code style={{ fontWeight: 700, color: "#0284c7" }}>{item.key}</code>
                          </td>
                          <td>
                            <form
                              id={`edit-system-setting-${item.key}`}
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSaveSetting(item.key, editForm.value, editForm.description);
                              }}
                            />
                            <div className="sys-table-edit-cell">
                              <FormInput
                                id={`edit-value-${item.key}`}
                                form={`edit-system-setting-${item.key}`}
                                type="text"
                                textarea={useTextarea}
                                mono
                                compact
                                className={useTextarea ? "sys-table-edit-textarea" : ""}
                                placeholder={useTextarea ? 'ឧ. {"rate": 4100}' : 'ឧ. KHR / {"rate": 4100}'}
                                value={editForm.value}
                                autoFocus
                                required
                                onKeyDown={(e) => e.key === "Escape" && setEditingKey(null)}
                                onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                                rightAction={jsonState === "valid" && (
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    style={{ flexShrink: 0, width: "28px", height: "28px", color: "#1d4ed8" }}
                                    title="Format JSON (pretty print)"
                                    onClick={() => {
                                      try {
                                        setEditForm({ ...editForm, value: JSON.stringify(JSON.parse(editForm.value), null, 2) });
                                      } catch {
                                        toast.error("JSON មិនត្រឹមត្រូវ");
                                      }
                                    }}
                                  >
                                    <LuSparkles size={13} />
                                  </button>
                                )}
                                status={(
                                  <>
                                    {jsonState === "valid" && (
                                      <div className="sys-settings-status is-valid">
                                        <LuCheck size={12} /> JSON ត្រឹមត្រូវ
                                      </div>
                                    )}
                                    {jsonState === "invalid" && (
                                      <div className="sys-settings-status is-invalid">
                                        <LuX size={12} /> JSON មិនត្រឹមត្រូវ — string
                                      </div>
                                    )}
                                  </>
                                )}
                              />
                            </div>
                          </td>
                          <td>
                            <FormInput
                              id={`edit-desc-${item.key}`}
                              form={`edit-system-setting-${item.key}`}
                              textarea
                              compact
                              className="sys-table-edit-textarea"
                              placeholder="ពិពណ៌នាអថេរ..."
                              rows={2}
                              value={editForm.description}
                              onKeyDown={(e) => e.key === "Escape" && setEditingKey(null)}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "0.35rem", justifyContent: "center" }}>
                              <button
                                type="submit"
                                form={`edit-system-setting-${item.key}`}
                                className="btn-icon btn-success"
                                title="រក្សាទុក"
                                disabled={savingSetting || !editForm.value.trim()}
                              >
                                {savingSetting ? <LuLoader size={14} className="spin" /> : <LuCheck size={15} />}
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="បោះបង់"
                                disabled={savingSetting}
                                onClick={() => setEditingKey(null)}
                              >
                                <LuX size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={item.key}>
                        <td>
                          <code style={{ fontWeight: 700, color: "#0284c7" }}>{item.key}</code>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                            {getJsonState(stringVal) === "valid" && (
                              <span style={{ flexShrink: 0, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", color: "#1d4ed8", background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: "5px", padding: "0.1rem 0.4rem" }}>
                                JSON
                              </span>
                            )}
                            <code
                              title={stringVal}
                              style={{
                                fontSize: "0.82rem",
                                color: "#0f172a",
                                background: "#f1f5f9",
                                border: "1px solid #e2e8f0",
                                padding: "0.22rem 0.6rem",
                                borderRadius: "6px",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                                display: "inline-block",
                                maxWidth: "320px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                verticalAlign: "middle",
                              }}
                            >
                              {stringVal || "—"}
                            </code>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Copy តម្លៃ"
                              style={{ flexShrink: 0, width: "26px", height: "26px" }}
                              onClick={() => copyValue(stringVal)}
                            >
                              <LuCopy size={13} />
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            fontSize: "0.85rem",
                            color: item.description ? "#475569" : "#94a3b8",
                            maxWidth: "260px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.description || ""}
                        >
                          {item.description || "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn-icon"
                            title="កែប្រែ (Edit Variable)"
                            onClick={() => {
                              setEditingKey(item.key);
                              setEditForm({
                                key: item.key,
                                value: stringVal,
                                description: item.description || "",
                              });
                            }}
                          >
                            <LuPencil size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Tables Schema Overview Table */}
        <div className="card shadow-sm" style={{ padding: "1.5rem", borderRadius: "14px", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                តារាងប្រព័ន្ធ PostgreSQL (System Database Tables)
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.25rem 0 0 0" }}>
                បញ្ជីតារាងទិន្នន័យ PostgreSQL (Supabase Schemas) និងប្រភេទទិន្នន័យក្នុងប្រព័ន្ធ
              </p>
            </div>
            <span style={{ fontSize: "0.78rem", background: "#eff6ff", color: "#1e3a8a", padding: "0.25rem 0.75rem", borderRadius: "8px", fontWeight: 600, border: "1px solid #bfdbfe" }}>
              {loadingDbTables ? "..." : `${dbTables.length} Database Tables`}
            </span>
          </div>

          <div className="table-responsive" style={{ borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", width: "25%" }}>ឈ្មោះតារាង (Table Name)</th>
                  <th style={{ textAlign: "left", width: "35%" }}>ពិពណ៌នា (Description)</th>
                  <th style={{ textAlign: "center", width: "12%" }}>Primary Key</th>
                  <th style={{ textAlign: "center", width: "14%" }}>ប្រភេទទិន្នន័យ</th>
                  <th style={{ textAlign: "center", width: "14%" }}>ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody>
                {loadingDbTables ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      កំពុងផ្ទុកតារាងទិន្នន័យ...
                    </td>
                  </tr>
                ) : dbTables.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      មិនអាចទាញយកទិន្នន័យតារាងបានទេ។
                    </td>
                  </tr>
                ) : (
                  dbTables.map((tbl) => (
                    <tr key={tbl.name}>
                      <td style={{ fontWeight: 700, color: "#0284c7" }}>
                        <code style={{ fontSize: "0.85rem" }}>{tbl.name}</code>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#334155" }}>{tbl.desc || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.78rem", background: "#f1f5f9", color: "#475569", padding: "0.15rem 0.5rem", borderRadius: "6px", fontFamily: "monospace" }}>
                          {tbl.pk || "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.78rem", background: "#fef3c7", color: "#b45309", padding: "0.15rem 0.55rem", borderRadius: "6px", fontWeight: 600 }}>
                          {tbl.type || "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.75rem", background: "#d1fae5", color: "#065f46", padding: "0.15rem 0.55rem", borderRadius: "12px", fontWeight: 700 }}>
                          {tbl.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
