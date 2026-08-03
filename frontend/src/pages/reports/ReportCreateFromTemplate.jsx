import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuFileText, LuPlus, LuTrash2, LuEye, LuDownload, LuSave } from "react-icons/lu";
import { reportTemplatesAPI } from "../../api/reportTemplates";
import { reportDocumentsAPI } from "../../api/reportDocuments";
import ReportHero from "../../components/reports/ReportHero";

export default function ReportCreateFromTemplate() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState("");

  const [arrayRows, setArrayRows] = useState([]);
  const [arrayKeys, setArrayKeys] = useState("");

  // Preview states
  const [filledHtml, setFilledHtml] = useState("");
  const [filledPath, setFilledPath] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await reportTemplatesAPI.list();
        setTemplates(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch {
        setMessage("ផ្ទុកគំរូមិនបាន");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupedTemplates = useMemo(() => {
    const groups = {};
    templates.forEach(t => {
      const cat = t.category || "ផ្សេងៗ";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [templates]);

  const handleSelect = (tmpl) => {
    setSelected(tmpl);
    const init = {};
    (tmpl.keys || []).forEach(k => { init[k] = ""; });
    setFormValues(init);
    setArrayRows([]);
    setArrayKeys("");
    setMessage("");
    setFilledHtml("");
    setFilledPath("");
  };

  const handleChange = (k, v) => {
    setFormValues(prev => ({ ...prev, [k]: v }));
  };

  const handleArrayKeyChange = (rowIdx, k, v) => {
    setArrayRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [k]: v };
      return next;
    });
  };

  const addArrayRow = () => {
    const keys = arrayKeys.split(",").map(s => s.trim()).filter(Boolean);
    if (keys.length === 0) return;
    const row = {};
    keys.forEach(k => { row[k] = ""; });
    setArrayRows(prev => [...prev, row]);
  };

  const removeArrayRow = (idx) => {
    setArrayRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePreview = async () => {
    if (!selected) return;

    const payload = { ...formValues };
    if (arrayRows.length > 0) {
      payload.items = [...arrayRows];
    }

    // Remove empty values
    for (const k of Object.keys(payload)) {
      if (payload[k] === "") {
        delete payload[k];
      }
    }

    setPreviewing(true);
    setMessage("");
    try {
      const fillRes = await reportTemplatesAPI.fill(selected.id, payload);
      const resPayload = fillRes.data?.data ?? fillRes.data;
      setFilledHtml(resPayload.content || "");
      setFilledPath(resPayload.storage_path || "");
      setMessage("បានបង្កើតទិដ្ឋភាពមើលជាមុនដោយជោគជ័យ");
    } catch (err) {
      console.error("Preview error:", err);
      setMessage(err?.response?.data?.error || err?.message || "មិនអាចមើលជាមុនបានទេ");
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    if (!selected || !filledHtml) return;

    setCreating(true);
    setMessage("");
    try {
      const title = selected.name + " - " + new Date().toLocaleDateString("km-KH");
      const res = await reportDocumentsAPI.createSimple({
        title,
        description: selected.description || "",
        content: filledHtml,
        category: selected.category || "ផ្សេងៗ"
      });
      const doc = res.data?.data ?? res.data;
      navigate(`/reports/${doc.id}`);
    } catch (err) {
      console.error("Report creation error:", err);
      setMessage(err?.response?.data?.error || err?.message || "បង្កើតរបាយការណ៍មិនបាន");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadFilled = async () => {
    if (!filledPath) return;
    try {
      const res = await reportTemplatesAPI.downloadFilled(filledPath);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = filledPath.split('/').pop() || `${selected.name}_filled.docx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download error:", err);
      setMessage("មិនអាចទាញយកឯកសារបំពេញបានទេ");
    }
  };

  return (
    <div className="page report-page report-view-page" lang="km">
      <div className="report-form-topbar">
        <button
          type="button"
          className="btn-icon report-back-btn"
          onClick={() => navigate("/reports")}
          title="ត្រឡប់"
        >
          <LuArrowLeft size={20} />
        </button>
        <ReportHero
          variant="list"
          title="បង្កើតរបាយការណ៍ពីគំរូ"
          subtitle="ជ្រើសរើសគំរូ បំពេញតម្លៃ មើលជាមុន និងទាញយក"
        />
      </div>
      
      {message && (
        <div className={`alert ${message.includes("មិនបាន") || message.includes("មិនអាច") ? "alert-error" : "alert-success"}`} style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="loading">កំពុងផ្ទុក...</div>
      ) : !selected ? (
        <div style={{ padding: "0.5rem" }}>
          <h3 style={{ marginBottom: "1.5rem" }}>ជ្រើសរើសគំរូតាមប្រភេទ</h3>
          {templates.length === 0 ? (
            <div className="report-empty">
              <LuFileText className="report-empty-icon" />
              <p>មិនទាន់មានគំរូទេ</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {Object.entries(groupedTemplates).map(([cat, tmpls]) => (
                <div key={cat}>
                  <h4 style={{
                    marginBottom: "1rem",
                    borderBottom: "2px solid var(--border)",
                    paddingBottom: "0.5rem",
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span style={{
                      display: "inline-block",
                      width: "8px",
                      height: "16px",
                      background: "var(--primary)",
                      borderRadius: "4px"
                    }} />
                    {cat}
                  </h4>
                  <div className="template-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                    {tmpls.map(t => (
                      <div key={t.id} className="card template-card" style={{ cursor: "pointer", transition: "transform var(--transition)" }} onClick={() => handleSelect(t)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                          <LuFileText style={{ color: "var(--primary)" }} />
                          <span style={{ fontWeight: 600 }}>{t.name}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{t.format.toUpperCase()} · {(t.keys || []).length} keys</div>
                        {t.description && <div style={{ fontSize: "0.85rem", marginTop: "0.4rem", color: "#475569" }}>{t.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>{selected.name}</h3>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  ប្រភេទ៖ <strong>{selected.category || "ផ្សេងៗ"}</strong> · {selected.format.toUpperCase()} · {(selected.keys || []).length} keys
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>ជ្រើសរើសគំរូផ្សេង</button>
            </div>
            
            {(selected.keys || []).length > 0 && (
              <div style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {(selected.keys || []).map(k => (
                  <code key={k} style={{ background: "#e0e7ff", color: "#4338ca", padding: "0.15rem 0.55rem", borderRadius: 4, fontSize: "0.8rem" }}>
                    {`{{${k}}}`}
                  </code>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {(selected.keys || []).map(k => (
                <div key={k} className="form-group">
                  <label>{k}</label>
                  <input type="text" value={formValues[k] || ""} onChange={e => handleChange(k, e.target.value)} placeholder={`បញ្ចូល ${k}`} />
                </div>
              ))}
            </div>

            <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px solid var(--border)" }} />

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>Table rows (loop data)</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
                <input
                  type="text"
                  value={arrayKeys}
                  onChange={e => setArrayKeys(e.target.value)}
                  placeholder="Column keys, e.g. activity, target, actual"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-sm btn-secondary" onClick={addArrayRow} disabled={!arrayKeys.trim()}>
                  <LuPlus /> Add row
                </button>
              </div>
              {arrayRows.length > 0 && (
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        {arrayKeys.split(",").map(s => s.trim()).filter(Boolean).map(k => (
                          <th key={k}>{k}</th>
                        ))}
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrayRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                          {arrayKeys.split(",").map(s => s.trim()).filter(Boolean).map(k => (
                            <td key={k}>
                              <input
                                type="text"
                                value={row[k] || ""}
                                onChange={e => handleArrayKeyChange(idx, k, e.target.value)}
                                style={{ width: "100%", minWidth: "100px" }}
                              />
                            </td>
                          ))}
                          <td>
                            <button type="button" className="btn-icon btn-danger" onClick={() => removeArrayRow(idx)} title="លុប">
                              <LuTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" onClick={handlePreview} disabled={previewing}>
                <LuEye /> {previewing ? "កំពុងបំពេញ..." : "បំពេញ និងមើលជាមុន"}
              </button>
            </div>
          </div>

          {filledHtml && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
                <h3 style={{ margin: 0 }}>ទិដ្ឋភាពមើលជាមុននៃរបាយការណ៍</h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-outline btn-sm" onClick={handleDownloadFilled}>
                    <LuDownload /> ទាញយកឯកសារ DOCX
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating}>
                    <LuSave /> {creating ? "កំពុងបង្កើត..." : "រក្សាទុកជារបាយការណ៍"}
                  </button>
                </div>
              </div>
              <iframe
                title="Filled Template Preview"
                srcDoc={filledHtml}
                sandbox="allow-same-origin"
                style={{
                  width: "100%",
                  height: "600px",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff"
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
