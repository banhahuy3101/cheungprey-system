import { useState, useEffect } from "react";
import { LuPlus, LuTrash2, LuDollarSign, LuPackage, LuSave, LuSend, LuX } from "react-icons/lu";
import { useSponsorships } from "../../hooks/useSponsorships";
import {
  COMMON_SECTIONS,
  COMMON_PERIODS,
  COMMON_COMMUNES,
  COMMON_UNITS,
  validateSponsorshipPayload,
} from "../../utils/sponsorshipUtils";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";

export default function SponsorshipForm() {
  const { selectedRecord, modalOpen, closeModal, createRecord, updateRecord } = useSponsorships();
  const isEdit = !!selectedRecord?.id;

  const [form, setForm] = useState({
    entry_no: "",
    section_group: COMMON_SECTIONS[0],
    custom_section: "",
    contributor_name: "",
    record_period: COMMON_PERIODS[0],
    target_location: COMMON_COMMUNES[0],
    amount_usd: "",
    amount_khr: "",
    usage_description: "",
  });

  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedRecord) {
      setForm({
        entry_no: selectedRecord.entry_no || "",
        section_group: COMMON_SECTIONS.includes(selectedRecord.section_group)
          ? selectedRecord.section_group
          : "custom",
        custom_section: !COMMON_SECTIONS.includes(selectedRecord.section_group)
          ? selectedRecord.section_group
          : "",
        contributor_name: selectedRecord.contributor_name || "",
        record_period: selectedRecord.record_period || COMMON_PERIODS[0],
        target_location: selectedRecord.target_location || COMMON_COMMUNES[0],
        amount_usd: selectedRecord.amount_usd !== undefined ? selectedRecord.amount_usd : "",
        amount_khr: selectedRecord.amount_khr !== undefined ? selectedRecord.amount_khr : "",
        usage_description: selectedRecord.usage_description || "",
      });

      if (selectedRecord.items && selectedRecord.items.length > 0) {
        setItems(
          selectedRecord.items.map((it) => ({
            item_name: it.item_name || "",
            item_qty: it.item_qty || 1,
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
        section_group: COMMON_SECTIONS[0],
        custom_section: "",
        contributor_name: "",
        record_period: COMMON_PERIODS[0],
        target_location: COMMON_COMMUNES[0],
        amount_usd: "",
        amount_khr: "",
        usage_description: "",
      });
      setItems([]);
    }
    setError("");
  }, [selectedRecord]);

  if (!modalOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: "",
        item_qty: 1,
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
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (submitImmediately = false) => {
    setError("");

    const validation = validateSponsorshipPayload(form, items);
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
        style={{ maxWidth: "850px", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#1e3a8a" }}>
              {isEdit ? "កែប្រែទិន្នន័យឧបត្ថម្ភ" : "បញ្ចូលកំណត់ត្រាឧបត្ថម្ភថ្មី (តារាងឧបសម្ព័ន្ធ)"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              District Sponsorship & Donation Management System
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
              marginBottom: "1rem",
              fontSize: "0.88rem",
            }}
          >
            {error}
          </div>
        )}

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Section A: Header & Contributor Configuration */}
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#334155" }}>
              ផ្នែកទី ១៖ ព័ត៌មានអ្នកឧបត្ថម្ភ និងកាលបរិច្ឆេទ
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  ក្រុមឧបត្ថម្ភ (Leadership Header Section) <span style={{ color: "red" }}>*</span>
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
                <div className="form-group" style={{ gridColumn: "span 2" }}>
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

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: "600" }}>
                  គោត្តនាម និងនាម / ស្ថាប័នឧបត្ថម្ភ (Contributor & Channel Details) <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ឧ. សម្តេចតេជោ ហ៊ុន សែន (តាមរយៈ ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន)"
                  value={form.contributor_name}
                  onChange={(e) => setForm({ ...form, contributor_name: e.target.value })}
                />
              </div>

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

              <div className="form-group">
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
          <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LuDollarSign color="#059669" />
              <span>ផ្នែកទី ២៖ តម្លៃសាច់ប្រាក់ឧបត្ថម្ភ (Direct Cash Contribution)</span>
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600", color: "#059669" }}>
                  រូបិយប័ណ្ណដុល្លារ (USD $)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  placeholder="0.00"
                  value={form.amount_usd}
                  onChange={(e) => setForm({ ...form, amount_usd: e.target.value })}
                  style={{ fontWeight: "600", fontSize: "1.05rem" }}
                />
                {form.amount_usd > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "#059669", marginTop: "0.2rem", display: "block" }}>
                    = {toKhmerDigits(form.amount_usd)} ដុល្លារ
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600", color: "#2563eb" }}>
                  រូបិយប័ណ្ណរៀល (KHR ៛)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={form.amount_khr}
                  onChange={(e) => setForm({ ...form, amount_khr: e.target.value })}
                  style={{ fontWeight: "600", fontSize: "1.05rem" }}
                />
                {form.amount_khr > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "#2563eb", marginTop: "0.2rem", display: "block" }}>
                    = {toKhmerDigits(form.amount_khr)} រៀល
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Itemized In-Kind & Material Donations */}
          <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <LuPackage color="#d97706" />
                <span>ផ្នែកទី ៣៖ សម្ភារ និងគ្រឿងឧបភោគបរិភោគ (In-Kind & Materials)</span>
              </h4>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleAddItem}
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <LuPlus size={15} />
                <span>+ បន្ថែមសម្ភារ</span>
              </button>
            </div>

            {items.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic", padding: "0.5rem 0" }}>
                មិនទាន់មានមុខសម្ភារត្រូវបានបន្ថែមនៅឡើយទេ (ចុច &quot;+ បន្ថែមសម្ភារ&quot; ប្រសិនបើមាន)
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="form-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35%" }}>ឈ្មោះសម្ភារ (Material Name)</th>
                      <th style={{ width: "20%" }}>បរិមាណ (Qty)</th>
                      <th style={{ width: "25%" }}>ឯកតា (Unit)</th>
                      <th style={{ width: "15%" }}>ចំណាំ (Notes)</th>
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
                            placeholder="ឧ. អង្ករ, មី, ក្តារមឈូស..."
                            value={it.item_name}
                            onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
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
                            placeholder="គ.ក, កេស, យូរ..."
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
                            placeholder="ចំណាំ..."
                            value={it.item_notes}
                            onChange={(e) => handleItemChange(idx, "item_notes", e.target.value)}
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

          {/* Section D: Usage Details */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "600" }}>
              ទីកន្លែងទទួល និងការប្រើប្រាស់ (Usage Details & Distribution Notes) <span style={{ color: "red" }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="ឧ. - ឧបត្ថម្ភដល់ប្រជាពលរដ្ឋទីទ័លក្រចំនួន ៥០គ្រួសារ នៅឃុំស្ដៅជុំ&#10;- ឧបត្ថម្ភបុណ្យសព និងចាស់ជរា..."
              value={form.usage_description}
              onChange={(e) => setForm({ ...form, usage_description: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
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
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <LuSave size={16} />
            <span>{saving ? "កំពុងរក្សាទុក..." : isEdit ? "រក្សាទុកការកែប្រែ" : "រក្សាទុកជាសេចក្តីព្រាង"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
