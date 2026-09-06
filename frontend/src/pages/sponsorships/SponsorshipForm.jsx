import { useState, useEffect, useMemo } from "react";
import {
  LuPlus,
  LuTrash2,
  LuDollarSign,
  LuPackage,
  LuSave,
  LuX,
  LuShieldAlert,
  LuUser,
  LuCalendar,
  LuMapPin,
  LuFileText,
} from "react-icons/lu";
import { useSponsorships } from "../../hooks/useSponsorships";
import {
  COMMON_UNITS,
  COMMON_MATERIALS,
  validateSponsorshipPayload,
  normalizeKhmerDigits,
} from "../../utils/sponsorshipUtils";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import FormSelect from "../../components/FormSelect";
import FormInput from "../../components/FormInput";
import FormDropdown from "../../components/FormDropdown";

const PURPOSE_OPTIONS = [
  { value: "ឧបត្ថម្ភដល់ប្រជាពលរដ្ឋទីទ័លក្រ", label: "ឧបត្ថម្ភដល់ប្រជាពលរដ្ឋទីទ័លក្រ" },
  { value: "ប្រើប្រាស់ក្នុងការងាររដ្ឋបាលស្រុក", label: "ប្រើប្រាស់ក្នុងការងាររដ្ឋបាលស្រុក" },
  { value: "កម្មវិធីមនុស្សធម៌ និងសប្បុរសធម៌", label: "កម្មវិធីមនុស្សធម៌ និងសប្បុរសធម៌" },
  { value: "ឧបត្ថម្ភតាមមូលដ្ឋានឃុំ/ភូមិ", label: "ឧបត្ថម្ភតាមមូលដ្ឋានឃុំ/ភូមិ" },
];

export default function SponsorshipForm({ currentPeriod, availablePeriods = [] }) {
  const { selectedRecord, modalOpen, closeModal, createRecord, updateRecord, records } = useSponsorships();
  const isEdit = Boolean(selectedRecord?.id || selectedRecord?.ID);

  const [form, setForm] = useState({
    record_period: currentPeriod?.name || "",
    fiscal_year: currentPeriod?.year || String(new Date().getFullYear()),
    entry_no: "",
    contributor_name: "",
    representatives: "",
    amount_usd: "",
    amount_khr: "",
    usage_description: "",
    remarks: "",
  });

  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Compute map of already taken row numbers for this period to prevent duplication
  const takenRowNos = useMemo(() => {
    const activePeriod = form.record_period;
    const map = new Map();
    if (!activePeriod || !records) return map;

    records.forEach((r) => {
      if (r.record_period === activePeriod && (r.entry_no || r.record_id)) {
        const no = Number(r.entry_no || r.record_id);
        const name = r.contributor_name || r.donor_name || "គ្មានឈ្មោះ";
        map.set(no, name);
      }
    });
    return map;
  }, [form.record_period, records]);

  // Suggested next row number
  const suggestedNextNo = useMemo(() => {
    const activePeriod = form.record_period;
    if (!activePeriod || !records) return 1;

    let maxNo = 0;
    records.forEach((r) => {
      if (r.record_period === activePeriod) {
        const no = Number(r.entry_no || r.record_id || 0);
        if (no > maxNo) maxNo = no;
      }
    });
    return maxNo + 1;
  }, [form.record_period, records]);

  // Generate row number options (1..50+ or higher if needed)
  const rowOptions = useMemo(() => {
    let max = 50;
    takenRowNos.forEach((_, k) => {
      if (k >= max) max = k + 10;
    });
    if (form.entry_no && Number(form.entry_no) >= max) {
      max = Number(form.entry_no) + 5;
    }
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [takenRowNos, form.entry_no]);

  // Merge preset common materials with all unique material names existing in DB
  const materialOptions = useMemo(() => {
    const set = new Set(COMMON_MATERIALS);
    (records || []).forEach((r) => {
      const recItems = r.items || r.in_kind_items || [];
      recItems.forEach((it) => {
        if (it.item_name && it.item_name.trim()) {
          set.add(it.item_name.trim());
        }
      });
    });
    return Array.from(set).map((m) => ({ value: m, label: m }));
  }, [records]);

  // Extract all unique contributor / donor names for autocomplete
  const contributorOptions = useMemo(() => {
    const set = new Set();
    (records || []).forEach((r) => {
      const name = r.contributor_name || r.donor_name;
      if (name && name.trim()) set.add(name.trim());
    });
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [records]);

  // Extract all unique representatives / liaison conveyors for autocomplete
  const representativeOptions = useMemo(() => {
    const set = new Set();
    (records || []).forEach((r) => {
      if (r.representatives && r.representatives.trim()) set.add(r.representatives.trim());
    });
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [records]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && modalOpen) closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    const formatFieldValue = (val) => {
      if (val === undefined || val === null || Number(val) === 0 || val === "") return "";
      return String(val);
    };

    if (selectedRecord) {
      setForm({
        record_period: selectedRecord.record_period || currentPeriod?.name || "",
        entry_no: selectedRecord.entry_no ? String(selectedRecord.entry_no) : selectedRecord.record_id ? String(selectedRecord.record_id) : "",
        fiscal_year: selectedRecord.fiscal_year ? String(selectedRecord.fiscal_year) : currentPeriod?.year || String(new Date().getFullYear()),
        contributor_name: selectedRecord.contributor_name || selectedRecord.donor_name || "",
        representatives: selectedRecord.representatives || "",
        amount_usd: formatFieldValue(selectedRecord.amount_usd ?? selectedRecord.currency_usd),
        amount_khr: formatFieldValue(selectedRecord.amount_khr ?? selectedRecord.currency_khr),
        usage_description: selectedRecord.usage_description || selectedRecord.allocation_purpose || "",
        remarks: selectedRecord.remarks || "",
      });

      const recordItems = selectedRecord.items || selectedRecord.in_kind_items || [];
      if (recordItems && recordItems.length > 0) {
        setItems(
          recordItems.map((it) => ({
            item_name: it.item_name || "",
            item_qty: it.item_qty !== undefined && it.item_qty !== null && Number(it.item_qty) !== 0 ? String(it.item_qty) : "",
            item_unit: it.item_unit || "",
            cash_allocation_usd: formatFieldValue(it.cash_allocation_usd),
            cash_allocation_khr: formatFieldValue(it.cash_allocation_khr),
            usage_description: it.usage_description || it.item_notes || selectedRecord.usage_description || "",
            remarks: it.remarks || selectedRecord.remarks || "",
          }))
        );
      } else {
        setItems([]);
      }
    } else {
      setForm({
        record_period: currentPeriod?.name || "",
        entry_no: String(suggestedNextNo),
        fiscal_year: currentPeriod?.year || String(new Date().getFullYear()),
        contributor_name: "",
        representatives: "",
        amount_usd: "",
        amount_khr: "",
        usage_description: "",
        remarks: "",
      });
      setItems([]);
    }
    setError("");
  }, [selectedRecord, modalOpen, currentPeriod, suggestedNextNo]);

  if (!modalOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: "",
        item_qty: "",
        item_unit: "",
        cash_allocation_usd: "",
        cash_allocation_khr: "",
        usage_description: "",
        remarks: "",
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    let normalized = value;
    if (field === "item_qty" || field === "cash_allocation_usd" || field === "cash_allocation_khr") {
      normalized = normalizeKhmerDigits(value);
    }
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: normalized };
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");

    const isKeepingCurrentNo =
      isEdit &&
      selectedRecord &&
      Number(form.entry_no) === Number(selectedRecord.entry_no || selectedRecord.record_id);

    if (form.entry_no && !isKeepingCurrentNo && takenRowNos.has(Number(form.entry_no))) {
      const donor = takenRowNos.get(Number(form.entry_no));
      setError(`ល.រ ${toKhmerDigits(form.entry_no)} ត្រូវបានជ្រើសរើសរួចហើយ (${donor}) សូមជ្រើសរើសលេខរៀងផ្សេង`);
      return;
    }

    const validation = validateSponsorshipPayload(form, items);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const recordId = selectedRecord?.id || selectedRecord?.ID;
        await updateRecord(recordId, validation.data);
      } else {
        await createRecord(validation.data, false);
      }
      closeModal();
    } catch (err) {
      console.error("Save sponsorship error:", err);
      setError(err?.response?.data?.error || err?.message || "មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sponsorship-modal-backdrop" onClick={closeModal}>
      <div className="sponsorship-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "860px" }}>
        {/* Simple Modal Header */}
        <div className="sponsorship-modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#1e3a8a" }}>
              {isEdit ? "កែប្រែទិន្នន័យឧបត្ថម្ភ" : "បញ្ចូលអ្នកឧបត្ថម្ភ និងសម្ភារ/ថវិកា"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {form.record_period ? `ក្រោមតារាងមេ ៖ ${form.record_period}` : "ទម្រង់បញ្ចូលទិន្នន័យអ្នកឧបត្ថម្ភ"}
            </span>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={closeModal}
            aria-label="បិទ"
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            <LuX size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="sponsorship-modal-body" style={{ gap: "1rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "8px",
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

          {/* Main Sponsorship Selection */}
          {availablePeriods.length > 0 && (
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <FormSelect
                label="តារាងឧបត្ថម្ភមេ (Main Sponsorship Period)"
                icon={<LuCalendar size={15} color="#1e3a8a" />}
                value={form.record_period}
                onChange={(e) => {
                  const newPeriod = e.target.value;
                  const selectedP = availablePeriods.find((p) => p.name === newPeriod);
                  setForm((prev) => ({
                    ...prev,
                    record_period: newPeriod,
                    fiscal_year: selectedP?.year || prev.fiscal_year,
                  }));
                }}
                options={availablePeriods.map((p) => ({
                  value: p.name,
                  label: `${p.name} (${p.year})`,
                }))}
              />
            </div>
          )}

          {/* Section 1: Sponsor Info (Master) */}
          <div className="sponsorship-form-section tinted">
            <h4 className="sponsorship-form-section-title">
              <LuUser size={17} />
              <span>ព័ត៌មានអ្នកឧបត្ថម្ភ (Sponsor)</span>
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              {/* Contributor / Full Name */}
              <div style={{ gridColumn: "1 / -1" }}>
                <FormInput
                  label="គោត្តនាម និង នាម (Honorific & Full Name)"
                  required
                  leadIcon={<LuUser size={16} />}
                  placeholder="ឧ. ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន ឬ លោកជំទាវ..."
                  value={form.contributor_name}
                  onChange={(e) => setForm({ ...form, contributor_name: e.target.value })}
                  style={{ fontWeight: "600" }}
                />
              </div>

              {/* Representative / Via */}
              <div style={{ gridColumn: "1 / -1" }}>
                <FormInput
                  label="តាមរយៈ (Representative / Via - ស្រេចចិត្ត)"
                  placeholder="ឧ. តាមរយៈ ឯកឧត្តម..."
                  value={form.representatives}
                  onChange={(e) => setForm({ ...form, representatives: e.target.value })}
                />
              </div>

              {/* Row Sequence Dropdown */}
              <FormSelect
                label="ល.រ (Row No.)"
                required
                value={form.entry_no}
                placeholder="-- ជ្រើសរើស ល.រ --"
                onChange={(e) => setForm({ ...form, entry_no: e.target.value })}
                options={rowOptions.map((num) => {
                  const isTaken = takenRowNos.has(num);
                  const donor = takenRowNos.get(num);
                  return {
                    value: num,
                    label: `ល.រ ${toKhmerDigits(num)}${isTaken ? ` (បានជ្រើសរើសរួច៖ ${donor})` : ""}`,
                    disabled: isTaken,
                  };
                })}
              />

              {/* Fiscal Year */}
              <FormSelect
                label="ឆ្នាំប្រតិបត្តិការ (Fiscal Year)"
                value={form.fiscal_year}
                onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
                options={Array.from({ length: 2050 - 2015 + 1 }, (_, i) => String(2015 + i)).map((y) => ({
                  value: y,
                  label: `${y} (ឆ្នាំ ${toKhmerDigits(y)})`,
                }))}
              />
            </div>
          </div>

          {/* Section 2: Physical Goods / Materials & Line Item Allocations */}
          <div className="sponsorship-form-section" style={{ background: "#ffffff", border: "1px solid #fed7aa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#ffedd5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c2410c",
                  }}
                >
                  <LuPackage size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "#9a3412" }}>
                    សម្ភារ / ឯកតា (Materials & Goods)
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "#ea580c" }}>
                    {items.length > 0 ? `មាន ${toKhmerDigits(items.length)} មុខសម្ភារ` : "ស្រេចចិត្ត (Optional)"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm"
                onClick={handleAddItem}
                style={{
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.35rem 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  boxShadow: "0 1px 2px rgba(234, 88, 12, 0.2)",
                  cursor: "pointer",
                }}
              >
                <LuPlus size={16} />
                <span>+ បន្ថែមសម្ភារ</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="sponsorship-empty-goods" onClick={handleAddItem} style={{ cursor: "pointer" }}>
                <LuPackage size={30} color="#ea580c" style={{ opacity: 0.8 }} />
                <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#9a3412" }}>
                  មិនទាន់មានមុខសម្ភារនៅឡើយទេ
                </div>
                <div style={{ fontSize: "0.8rem", color: "#c2410c" }}>
                  ចុចទីនេះ ឬចុចប៊ូតុង <strong>&quot;+ បន្ថែមសម្ភារ&quot;</strong> ប្រសិនបើមានការឧបត្ថម្ភជាសម្ភារ
                </div>
              </div>
            ) : (
              <div className="sponsorship-goods-container">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(110px, 1fr) 60px 75px 80px 80px minmax(130px, 1.2fr) minmax(100px, 1fr) 28px",
                    gap: "0.4rem",
                    padding: "0 0.5rem",
                    fontSize: "0.76rem",
                    fontWeight: "700",
                    color: "#9a3412",
                  }}
                >
                  <span style={{ textAlign: "center" }}>ល.រ</span>
                  <span>ឈ្មោះសម្ភារ (Item Name)</span>
                  <span style={{ textAlign: "center" }}>បរិមាណ</span>
                  <span>ឯកតា</span>
                  <span style={{ textAlign: "right" }}>ថវិកា ($)</span>
                  <span style={{ textAlign: "right" }}>ថវិកា (៛)</span>
                  <span>ទីកន្លែងទទួល និង ប្រើប្រាស់</span>
                  <span>ផ្សេងៗ (Remarks)</span>
                  <span></span>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="sponsorship-good-row">
                    <div className="sponsorship-good-index">
                      {toKhmerDigits(idx + 1)}
                    </div>

                    <div>
                      <FormDropdown
                        compact
                        editable
                        placeholder="ឧ. អង្ករ, មី, ទឹកត្រី..."
                        value={it.item_name}
                        onChange={(e) => handleItemChange(idx, "item_name", e.target.value)}
                        options={materialOptions}
                        style={{ fontWeight: "600" }}
                      />
                    </div>

                    <div>
                      <FormInput
                        compact
                        placeholder="1"
                        value={it.item_qty}
                        onChange={(e) => handleItemChange(idx, "item_qty", e.target.value)}
                        style={{ textAlign: "center", fontWeight: "700" }}
                      />
                    </div>

                    <div>
                      <FormDropdown
                        compact
                        editable
                        placeholder="គ.ក, កេស..."
                        value={it.item_unit}
                        onChange={(e) => handleItemChange(idx, "item_unit", e.target.value)}
                        options={COMMON_UNITS.map((u) => ({ value: u, label: u }))}
                      />
                    </div>

                    <div>
                      <FormInput
                        compact
                        placeholder="0 $"
                        value={it.cash_allocation_usd}
                        onChange={(e) => handleItemChange(idx, "cash_allocation_usd", e.target.value)}
                        style={{ textAlign: "right", fontWeight: "700", color: "#059669" }}
                      />
                    </div>

                    <div>
                      <FormInput
                        compact
                        placeholder="0 ៛"
                        value={it.cash_allocation_khr}
                        onChange={(e) => handleItemChange(idx, "cash_allocation_khr", e.target.value)}
                        style={{ textAlign: "right", fontWeight: "700", color: "#2563eb" }}
                      />
                    </div>

                    <div>
                      <FormDropdown
                        compact
                        editable
                        placeholder="ទីកន្លែងទទួល / គោលបំណង..."
                        value={it.usage_description}
                        onChange={(e) => handleItemChange(idx, "usage_description", e.target.value)}
                        options={PURPOSE_OPTIONS}
                      />
                    </div>

                    <div>
                      <FormInput
                        compact
                        placeholder="ផ្សេងៗ..."
                        value={it.remarks}
                        onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                      />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn-icon text-danger"
                        onClick={() => handleRemoveItem(idx)}
                        title="លុបមុខសម្ភារនេះ"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: "#fee2e2",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LuTrash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sponsorship-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
            បោះបង់
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
          >
            <LuSave size={16} />
            <span>{saving ? "កំពុងរក្សាទុក..." : isEdit ? "រក្សាទុកការកែប្រែ" : "រក្សាទុក"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
