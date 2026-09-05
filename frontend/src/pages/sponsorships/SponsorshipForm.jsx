import { useState, useEffect } from "react";
import { LuPlus, LuTrash2, LuDollarSign, LuPackage, LuSave, LuSend, LuX } from "react-icons/lu";
import { sponsorshipAPI } from "../../api/sponsorship";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import { useToast } from "../../components/Toast";

const COMMON_SECTIONS = [
  "ការឧបត្ថម្ភរបស់សម្តេចតេជោ ហ៊ុន សែន និងសម្តេចកិត្តិព្រឹទ្ធបណ្ឌិត",
  "ការឧបត្ថម្ភរបស់សម្តេចមហាបវរធិបតី ហ៊ុន ម៉ាណែត និងលោកជំទាវបណ្ឌិត",
  "ការចំណាយរបស់ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន និងលោកជំទាវបណ្ឌិត អ៊ុក ម៉ាលី",
  "ការឧបត្ថម្ភរបស់ក្រុមការងារចុះជួយមូលដ្ឋាន",
  "ការឧបត្ថម្ភរបស់សប្បុរសជននានា",
];

const COMMON_PERIODS = [
  "សរុប ៩ខែ",
  "ខែតុលា",
  "ខែវិច្ឆិកា",
  "ខែធ្នូ",
  "ប្រចាំត្រីមាសទី១",
  "ប្រចាំត្រីមាសទី២",
  "ប្រចាំត្រីមាសទី៣",
  "ប្រចាំត្រីមាសទី៤",
  "ប្រចាំឆ្នាំ",
];

const COMMON_COMMUNES = [
  "ទូទាំងស្រុក (District-wide)",
  "ឃុំស្ដៅជុំ",
  "ឃុំសូភាស",
  "ឃុំព្រៃចារ",
  "ឃុំខ្នុរដំបង",
  "ឃុំគោកត្របែក",
  "ឃុំផ្តៅជុំ",
  "ឃុំត្រពាំងគរ",
  "ឃុំសូទិប",
  "ឃុំតាំងក្រសាំង",
  "ឃុំសំបូរ",
];

const COMMON_UNITS = [
  "គ.ក (kg)",
  "កេស (carton)",
  "យូរ (pack)",
  "ឈុត (set)",
  "ដើម (pole/unit)",
  "សម្រាប់ (set/coffin)",
  "ឡាន (truck)",
  "កញ្ចប់ (package)",
  "ដប (bottle)",
  "គូ (pair)",
  "សន្លឹក (sheet)",
];

export default function SponsorshipForm({ initialData = null, onClose, onSuccess }) {
  const { showToast } = useToast();
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    entry_no: initialData?.entry_no || "",
    section_group: initialData?.section_group || COMMON_SECTIONS[0],
    custom_section: "",
    contributor_name: initialData?.contributor_name || "",
    record_period: initialData?.record_period || COMMON_PERIODS[0],
    target_location: initialData?.target_location || COMMON_COMMUNES[0],
    amount_usd: initialData?.amount_usd !== undefined ? initialData.amount_usd : "",
    amount_khr: initialData?.amount_khr !== undefined ? initialData.amount_khr : "",
    usage_description: initialData?.usage_description || "",
  });

  const [items, setItems] = useState(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((it) => ({
        item_name: it.item_name || "",
        item_qty: it.item_qty || 1,
        item_unit: it.item_unit || "គ.ក",
        cash_allocation_usd: it.cash_allocation_usd || 0,
        cash_allocation_khr: it.cash_allocation_khr || 0,
        item_notes: it.item_notes || "",
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    // Section group determination
    const finalSection =
      form.section_group === "custom"
        ? form.custom_section.trim()
        : form.section_group.trim();

    if (!finalSection) {
      setError("សូមជ្រើសរើស ឬបញ្ចូលក្រុមឧបត្ថម្ភ (Header Section is required)");
      return;
    }
    if (!form.contributor_name.trim()) {
      setError("សូមបញ្ចូលគោត្តនាម និងនាមអ្នកឧបត្ថម្ភ (Contributor Name is required)");
      return;
    }
    if (!form.usage_description.trim()) {
      setError("សូមបញ្ចូលព័ត៌មានទីកន្លែងទទួល និងការប្រើប្រាស់ (Usage Details is required)");
      return;
    }

    const usdVal = parseFloat(form.amount_usd) || 0;
    const khrVal = parseInt(form.amount_khr, 10) || 0;

    // Validate item list
    const validItems = items.filter(
      (it) => it.item_name.trim() !== "" && parseFloat(it.item_qty) > 0
    );

    // Rule 1: Must have non-zero cash OR at least one valid material item
    if (usdVal <= 0 && khrVal <= 0 && validItems.length === 0) {
      setError(
        "តម្រូវឱ្យមានតម្លៃសាច់ប្រាក់ (USD ឬ KHR) ឬសម្ភារយ៉ាងតិចមួយមុខដែលមានបរិមាណធំជាង ០"
      );
      return;
    }

    const payload = {
      entry_no: form.entry_no ? parseInt(form.entry_no, 10) : undefined,
      section_group: finalSection,
      contributor_name: form.contributor_name.trim(),
      record_period: form.record_period.trim(),
      target_location: form.target_location.trim(),
      amount_usd: usdVal,
      amount_khr: khrVal,
      usage_description: form.usage_description.trim(),
      items: validItems.map((it) => ({
        item_name: it.item_name.trim(),
        item_qty: parseFloat(it.item_qty) || 1,
        item_unit: it.item_unit.trim(),
        cash_allocation_usd: parseFloat(it.cash_allocation_usd) || 0,
        cash_allocation_khr: parseInt(it.cash_allocation_khr, 10) || 0,
        item_notes: (it.item_notes || "").trim(),
      })),
      submit_immediately: submitImmediately,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await sponsorshipAPI.update(initialData.id, payload);
        showToast("កែប្រែទិន្នន័យបានជោគជ័យ", "success");
      } else {
        await sponsorshipAPI.create(payload);
        showToast(
          submitImmediately
            ? "បង្កើត និងដាក់ស្នើបានជោគជ័យ"
            : "រក្សាទុកជាសេចក្តីព្រាងបានជោគជ័យ",
          "success"
        );
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || "មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
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
          <button type="button" className="btn-icon" onClick={onClose} aria-label="បិទ">
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
            <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>ផ្នែកទី ១៖ ព័ត៌មានអ្នកឧបត្ថម្ភ និងកាលបរិច្ឆេទ</span>
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
                              <option key={u} value={u.split(" ")[0]} />
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
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
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
