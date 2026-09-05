import { useState, useEffect, useRef } from "react";
import {
  LuPlus,
  LuTrash2,
  LuDollarSign,
  LuPackage,
  LuSave,
  LuSend,
  LuX,
  LuTag,
  LuShieldAlert,
  LuCheck,
  LuFileText,
  LuList,
} from "react-icons/lu";
import { useSponsorships } from "../../hooks/useSponsorships";
import {
  ENTRY_CLASSIFICATIONS,
  COMMON_SECTIONS,
  COMMON_PERIODS,
  COMMON_COMMUNES,
  COMMON_UNITS,
  QUICK_TAGS,
  validateSponsorshipPayload,
  normalizeKhmerDigits,
  parseNumericInput,
  checkDiscrepancy,
} from "../../utils/sponsorshipUtils";
import { toKhmerDigits, numberToKhmerWords } from "../../utils/khmerNumberSpelling";

export default function SponsorshipForm() {
  const { selectedRecord, modalOpen, closeModal, createRecord, updateRecord } = useSponsorships();
  const isEdit = !!selectedRecord?.id;

  const [form, setForm] = useState({
    entry_no: "",
    entry_classification: "donation",
    section_group: COMMON_SECTIONS[0],
    custom_section: "",
    contributor_name: "",
    record_period: COMMON_PERIODS[0],
    target_location: COMMON_COMMUNES[0],
    amount_usd: "",
    amount_khr: "",
    usage_description: "",
    remarks: "",
  });

  const [items, setItems] = useState([]);
  const [rawTextMode, setRawTextMode] = useState(false);
  const [rawTextValue, setRawTextValue] = useState("");
  const [manualAuditTotalUSD, setManualAuditTotalUSD] = useState("");
  const [manualAuditTotalKHR, setManualAuditTotalKHR] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const usageTextareaRef = useRef(null);

  useEffect(() => {
    if (selectedRecord) {
      setForm({
        entry_no: selectedRecord.entry_no ? String(selectedRecord.entry_no) : "",
        entry_classification: selectedRecord.entry_classification || "donation",
        section_group: COMMON_SECTIONS.includes(selectedRecord.section_group)
          ? selectedRecord.section_group
          : "custom",
        custom_section: !COMMON_SECTIONS.includes(selectedRecord.section_group)
          ? selectedRecord.section_group
          : "",
        contributor_name: selectedRecord.contributor_name || "",
        record_period: selectedRecord.record_period || COMMON_PERIODS[0],
        target_location: selectedRecord.target_location || COMMON_COMMUNES[0],
        amount_usd: selectedRecord.amount_usd !== undefined && selectedRecord.amount_usd !== null ? String(selectedRecord.amount_usd) : "",
        amount_khr: selectedRecord.amount_khr !== undefined && selectedRecord.amount_khr !== null ? String(selectedRecord.amount_khr) : "",
        usage_description: selectedRecord.usage_description || "",
        remarks: selectedRecord.remarks || "",
      });

      if (selectedRecord.items && selectedRecord.items.length > 0) {
        setItems(
          selectedRecord.items.map((it) => ({
            item_name: it.item_name || "",
            item_qty: it.item_qty !== undefined ? String(it.item_qty) : "1",
            item_unit: it.item_unit || "គ.ក",
            cash_allocation_usd: it.cash_allocation_usd || 0,
            cash_allocation_khr: it.cash_allocation_khr || 0,
            item_notes: it.item_notes || "",
          }))
        );
      } else {
        setItems([]);
      }
    } else {
      setForm({
        entry_no: "",
        entry_classification: "donation",
        section_group: COMMON_SECTIONS[0],
        custom_section: "",
        contributor_name: "",
        record_period: COMMON_PERIODS[0],
        target_location: COMMON_COMMUNES[0],
        amount_usd: "",
        amount_khr: "",
        usage_description: "",
        remarks: "",
      });
      setItems([]);
    }
    setRawTextMode(false);
    setRawTextValue("");
    setManualAuditTotalUSD("");
    setManualAuditTotalKHR("");
    setError("");
  }, [selectedRecord]);

  if (!modalOpen) return null;

  // Real-time numeric parsing
  const parsedUSD = parseNumericInput(form.amount_usd, false);
  const parsedKHR = parseNumericInput(form.amount_khr, true);

  // Variance / Discrepancy checks against manual paper subtotal
  const usdDiscrepancy = checkDiscrepancy(parsedUSD, manualAuditTotalUSD);
  const khrDiscrepancy = checkDiscrepancy(parsedKHR, manualAuditTotalKHR);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: "",
        item_qty: "1",
        item_unit: "គ.ក",
        cash_allocation_usd: 0,
        cash_allocation_khr: 0,
        item_notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    let normalized = value;
    if (field === "item_qty") {
      normalized = normalizeKhmerDigits(value);
    }
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: normalized };
      return next;
    });
  };

  // Keyboard shortcut: Tab on the last row's notes input automatically appends a new row
  const handleItemKeyDown = (e, index) => {
    if (e.key === "Tab" && !e.shiftKey && index === items.length - 1) {
      e.preventDefault();
      handleAddItem();
    }
  };

  // Quick tag insertion helper for Usage Description
  const insertQuickTag = (tagText) => {
    const current = form.usage_description;
    let nextText = current;
    if (!current) {
      nextText = tagText;
    } else if (tagText.startsWith("•")) {
      nextText = current + "\n" + tagText;
    } else {
      nextText = current + " " + tagText;
    }
    setForm((prev) => ({ ...prev, usage_description: nextText }));
    if (usageTextareaRef.current) {
      usageTextareaRef.current.focus();
    }
  };

  // Switch between structured Repeater and Raw Text Mode
  const toggleRawTextMode = () => {
    if (!rawTextMode) {
      // Convert structured items to raw text
      const rawLines = items
        .filter((it) => it.item_name)
        .map((it) => `${it.item_name} ${it.item_qty} ${it.item_unit}`)
        .join(", ");
      setRawTextValue(rawLines);
      setRawTextMode(true);
    } else {
      // Parse raw text back into structured items (split by comma/semicolon/newline)
      if (rawTextValue.trim()) {
        const parts = rawTextValue.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        const parsedItems = parts.map((part) => {
          const tokens = part.split(/\s+/);
          if (tokens.length >= 3) {
            const name = tokens.slice(0, tokens.length - 2).join(" ");
            const qty = parseNumericInput(tokens[tokens.length - 2]);
            const unit = tokens[tokens.length - 1];
            return {
              item_name: name,
              item_qty: String(qty || 1),
              item_unit: unit || "គ.ក",
              cash_allocation_usd: 0,
              cash_allocation_khr: 0,
              item_notes: "",
            };
          } else if (tokens.length === 2) {
            return {
              item_name: tokens[0],
              item_qty: String(parseNumericInput(tokens[1]) || 1),
              item_unit: "គ.ក",
              cash_allocation_usd: 0,
              cash_allocation_khr: 0,
              item_notes: "",
            };
          }
          return {
            item_name: part,
            item_qty: "1",
            item_unit: "មុខ",
            cash_allocation_usd: 0,
            cash_allocation_khr: 0,
            item_notes: "",
          };
        });
        setItems(parsedItems);
      }
      setRawTextMode(false);
    }
  };

  const handleSubmit = async (submitImmediately = false) => {
    setError("");

    // If still in raw text mode, parse first
    let finalItems = items;
    if (rawTextMode && rawTextValue.trim()) {
      const parts = rawTextValue.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      finalItems = parts.map((part) => ({
        item_name: part,
        item_qty: "1",
        item_unit: "មុខ",
        cash_allocation_usd: 0,
        cash_allocation_khr: 0,
        item_notes: "",
      }));
    }

    const validation = validateSponsorshipPayload(form, finalItems);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateRecord(selectedRecord.id, validation.data);
      } else {
        await createRecord(validation.data, submitImmediately);
      }
    } catch (err) {
      setError(err.response?.data?.error || "មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div
        className="modal-content"
        style={{ maxWidth: "880px", maxHeight: "92vh", overflowY: "auto", borderRadius: "14px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.85rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e3a8a", fontWeight: "700" }}>
              {isEdit ? "កែប្រែទិន្នន័យឧបត្ថម្ភ" : "បញ្ចូលកំណត់ត្រាឧបត្ថម្ភថ្មី (តារាងឧបសម្ព័ន្ធ)"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Ledger Line-Item Data Entry & Processing Engine (BRD Standard)
            </span>
          </div>
          <button type="button" className="btn-icon" onClick={closeModal} aria-label="បិទ">
            <LuX size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "8px",
              marginTop: "0.85rem",
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <LuShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.15rem", marginTop: "0.85rem" }}>
          {/* Section A: Header & Contributor Configuration */}
          <div style={{ background: "#f8fafc", padding: "1.1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", color: "#1e3a8a", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>ផ្នែកទី ១ ៖ ព័ត៌មានអ្នកឧបត្ថម្ភ និងការចាត់ថ្នាក់ប្រតិបត្តិការ</span>
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.85rem" }}>
              {/* Row Sequence / ID */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600" }}>
                  ល.រ (Row ID / Sequence)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ស្វ័យប្រវត្តិ (Auto)"
                  value={form.entry_no}
                  onChange={(e) => setForm({ ...form, entry_no: normalizeKhmerDigits(e.target.value) })}
                />
              </div>

              {/* Entry Classification */}
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  ប្រភេទប្រតិបត្តិការ (Entry Classification) <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={form.entry_classification}
                  onChange={(e) => setForm({ ...form, entry_classification: e.target.value })}
                  style={{ fontWeight: "600" }}
                >
                  {ENTRY_CLASSIFICATIONS.map((cl) => (
                    <option key={cl.value} value={cl.value}>
                      {cl.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leadership Header Section */}
              <div className="form-group" style={{ gridColumn: "span 3" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  ក្រុមឧបត្ថម្ភ (Header Section Group) <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={form.section_group}
                  onChange={(e) => setForm({ ...form, section_group: e.target.value })}
                >
                  {COMMON_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="custom">+ បញ្ចូលឈ្មោះក្រុមផ្សេងទៀត (Custom)...</option>
                </select>
              </div>

              {form.section_group === "custom" && (
                <div className="form-group" style={{ gridColumn: "span 3" }}>
                  <label className="form-label">បញ្ចូលឈ្មោះក្រុមឧបត្ថម្ភផ្ទាល់ខ្លួន</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ឧ. ការឧបត្ថម្ភរបស់..."
                    value={form.custom_section}
                    onChange={(e) => setForm({ ...form, custom_section: e.target.value })}
                  />
                </div>
              )}

              {/* Contributor / Section Name */}
              <div className="form-group" style={{ gridColumn: "span 3" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  ពេញនាម និង នាម / ស្ថាប័ន (Contributor Name & Title) <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ឧ. សម្តេចតេជោ ហ៊ុន សែន (តាមរយៈ ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន)"
                  value={form.contributor_name}
                  onChange={(e) => setForm({ ...form, contributor_name: e.target.value })}
                />
              </div>

              {/* Period & Target Location */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600" }}>
                  កាលបរិច្ឆេទ / ខែ (Period) <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={form.record_period}
                  onChange={(e) => setForm({ ...form, record_period: e.target.value })}
                >
                  {COMMON_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  ឃុំ / ទីតាំងគោលដៅ (Target Area) <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={form.target_location}
                  onChange={(e) => setForm({ ...form, target_location: e.target.value })}
                >
                  {COMMON_COMMUNES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section B: Dual Currency Cash Inputs */}
          <div style={{ background: "#ffffff", padding: "1.1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuDollarSign color="#059669" />
              <span style={{ fontWeight: "700" }}>ផ្នែកទី ២ ៖ ថវិកាសាច់ប្រាក់ (Dual-Currency Cash Amounts)</span>
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* USD Amount */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600", color: "#059669" }}>
                  ថវិកា - ដុល្លារ ($ USD)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="0.00"
                    value={form.amount_usd}
                    onChange={(e) => setForm({ ...form, amount_usd: normalizeKhmerDigits(e.target.value) })}
                    style={{ fontWeight: "700", fontSize: "1.1rem", color: "#059669" }}
                  />
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#059669", fontWeight: "bold" }}>
                    $
                  </span>
                </div>
                {parsedUSD > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#059669", marginTop: "0.35rem", lineHeight: 1.4 }}>
                    <div>= {toKhmerDigits(parsedUSD)} ដុល្លារ</div>
                    <div style={{ fontStyle: "italic", color: "#475569" }}>
                      ({numberToKhmerWords(parsedUSD, "USD")})
                    </div>
                  </div>
                )}
              </div>

              {/* KHR Amount */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600", color: "#2563eb" }}>
                  ថវិកា - រៀល (៛ KHR)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="0"
                    value={form.amount_khr}
                    onChange={(e) => setForm({ ...form, amount_khr: normalizeKhmerDigits(e.target.value) })}
                    style={{ fontWeight: "700", fontSize: "1.1rem", color: "#2563eb" }}
                  />
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#2563eb", fontWeight: "bold" }}>
                    ៛
                  </span>
                </div>
                {parsedKHR > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#2563eb", marginTop: "0.35rem", lineHeight: 1.4 }}>
                    <div>= {toKhmerDigits(parsedKHR)} រៀល</div>
                    <div style={{ fontStyle: "italic", color: "#475569" }}>
                      ({numberToKhmerWords(parsedKHR, "KHR")})
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Granular Physical Goods / Material Ledger */}
          <div style={{ background: "#ffffff", padding: "1.1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <LuPackage color="#d97706" />
                <span style={{ fontWeight: "700" }}>ផ្នែកទី ៣ ៖ សម្ភារ ឯកតា (Granular Physical Goods Ledger)</span>
              </h4>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={toggleRawTextMode}
                  style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                  title="ប្តូររវាងតារាងលម្អិត និងអត្ថបទរួម"
                >
                  {rawTextMode ? <LuList size={14} /> : <LuFileText size={14} />}
                  <span>{rawTextMode ? "ទម្រង់តារាង (Repeater)" : "ទម្រង់អត្ថបទរួម (Raw Text)"}</span>
                </button>

                {!rawTextMode && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleAddItem}
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontWeight: "600",
                    }}
                  >
                    <LuPlus size={15} />
                    <span>+ បន្ថែមសម្ភារ (Add Row)</span>
                  </button>
                )}
              </div>
            </div>

            {rawTextMode ? (
              <div>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="ឧ. អង្ករ ៥០ គ.ក, ទឹកត្រី ០១ យួរ, មី ១២ កេស..."
                  value={rawTextValue}
                  onChange={(e) => setRawTextValue(e.target.value)}
                  style={{ fontSize: "0.9rem" }}
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                  * បំបែកមុខទំនិញនីមួយៗដោយសញ្ញាក្បៀស (,) ឬចុះបន្ទាត់។
                </span>
              </div>
            ) : items.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic", padding: "0.5rem 0" }}>
                មិនទាន់មានមុខសម្ភារត្រូវបានបន្ថែមនៅឡើយទេ (ចុច &quot;+ បន្ថែមសម្ភារ&quot; ប្រសិនបើមាន)
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="form-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35%" }}>ឈ្មោះសម្ភារ (Item Name)</th>
                      <th style={{ width: "20%" }}>បរិមាណ (Qty)</th>
                      <th style={{ width: "22%" }}>ឯកតា (Unit)</th>
                      <th style={{ width: "18%" }}>ចំណាំ (Notes)</th>
                      <th style={{ width: "5%", textAlign: "center" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="ឧ. អង្ករ, មី, ទឹកត្រី, ក្តារមឈូស..."
                            value={it.item_name}
                            onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="1"
                            value={it.item_qty}
                            onChange={(e) => handleItemChange(idx, "item_qty", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            list={`units-list-${idx}`}
                            className="form-control form-control-sm"
                            placeholder="គ.ក, កេស, យួរ..."
                            value={it.item_unit}
                            onChange={(e) => handleItemChange(idx, "item_unit", e.target.value)}
                          />
                          <datalist id={`units-list-${idx}`}>
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u} />
                            ))}
                          </datalist>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="ចំណាំ... (Tab បន្ថែមជួរថ្មី)"
                            value={it.item_notes}
                            onChange={(e) => handleItemChange(idx, "item_notes", e.target.value)}
                            onKeyDown={(e) => handleItemKeyDown(e, idx)}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-icon text-danger"
                            onClick={() => handleRemoveItem(idx)}
                            title="លុបជួរដេក"
                          >
                            <LuTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section D: Purpose & Destination with Quick Helper Tags */}
          <div style={{ background: "#ffffff", padding: "1.1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <label className="form-label" style={{ fontWeight: "700", margin: 0, color: "#1e3a8a" }}>
                ទីកន្លែងទទួល និង ប្រើប្រាស់ (Purpose & Destination) <span style={{ color: "red" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                  <LuTag size={12} /> បន្ថែមស្លាក ៖
                </span>
                {QUICK_TAGS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => insertQuickTag(tag.text)}
                    style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", background: "#f1f5f9", border: "1px solid #cbd5e1" }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              ref={usageTextareaRef}
              className="form-control"
              rows={3}
              placeholder="ឧ. - ឧបត្ថម្ភដល់ប្រជាពលរដ្ឋទីទ័លក្រចំនួន ៥០គ្រួសារ នៅឃុំស្ដៅជុំ&#10;- ឧបត្ថម្ភបុណ្យសព និងចាស់ជរា..."
              value={form.usage_description}
              onChange={(e) => setForm({ ...form, usage_description: e.target.value })}
            />
          </div>

          {/* Section E: Remarks / Miscellaneous Footnotes */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "600", color: "#475569" }}>
              ផ្សេងៗ (Remarks & Unbudgeted Contingencies)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="ចំណាំបន្ថែម ឬឯកសារយោង (Optional footnotes)..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          {/* Section F: Real-time Footer Balance Card & Variance Audit */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "1rem",
              marginTop: "0.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                  តុល្យភាពសរុបនៃកំណត់ត្រានេះ (Batch Real-Time Balance) ៖
                </span>
                <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.25rem", alignItems: "center" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#059669" }}>
                    USD: {toKhmerDigits(parsedUSD)} $
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#2563eb" }}>
                    KHR: {toKhmerDigits(parsedKHR)} ៛
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#d97706" }}>
                    សម្ភារ: {toKhmerDigits(items.length)} មុខ
                  </span>
                </div>
              </div>

              {/* Audit reconciliation fields */}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  ផ្ទៀងផ្ទាត់តារាងក្រដាស (Audit Check):
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="សរុបក្រដាស ($)"
                  value={manualAuditTotalUSD}
                  onChange={(e) => setManualAuditTotalUSD(normalizeKhmerDigits(e.target.value))}
                  style={{ width: "110px", fontSize: "0.78rem" }}
                  title="បញ្ចូលតួលេខសរុបដែលបានកត់លើក្រដាសដើម្បីផ្ទៀងផ្ទាត់"
                />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="សរុបក្រដាស (៛)"
                  value={manualAuditTotalKHR}
                  onChange={(e) => setManualAuditTotalKHR(normalizeKhmerDigits(e.target.value))}
                  style={{ width: "110px", fontSize: "0.78rem" }}
                  title="បញ្ចូលតួលេខសរុបដែលបានកត់លើក្រដាសដើម្បីផ្ទៀងផ្ទាត់"
                />
              </div>
            </div>

            {/* Discrepancy Alert */}
            {(usdDiscrepancy?.hasDiscrepancy || khrDiscrepancy?.hasDiscrepancy) && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <LuShieldAlert size={16} color="#d97706" />
                <span>
                  <strong>ការដាស់តឿនគណិតវិទ្យា (Variance Flag) ៖</strong> រកឃើញភាពមិនស៊ីគ្នាផ្នែកគណិតវិទ្យារវាងផលបូកជាក់ស្តែង និងតួលេខសរុបលើតារាងក្រដាស!
                </span>
              </div>
            )}
            {manualAuditTotalUSD && !usdDiscrepancy?.hasDiscrepancy && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.78rem",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <LuCheck size={14} />
                <span>តួលេខសាច់ប្រាក់ USD ត្រូវគ្នាឥតខ្ចោះជាមួយតារាងក្រដាស (Verified)</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.85rem" }}>
          <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
            បោះបង់
          </button>
          {!isEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              style={{ background: "#2563eb", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <LuSend size={16} />
              <span>{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក និងដាក់ស្នើពិនិត្យ"}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-success"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
          >
            <LuSave size={16} />
            <span>{saving ? "កំពុងរក្សាទុក..." : isEdit ? "រក្សាទុកការកែប្រែ" : "រក្សាទុកជាសេចក្តីព្រាង"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
