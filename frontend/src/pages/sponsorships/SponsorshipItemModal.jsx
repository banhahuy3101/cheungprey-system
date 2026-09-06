import { useState, useEffect } from "react";
import {
  LuPackage,
  LuX,
  LuDollarSign,
  LuCheck,
  LuMapPin,
  LuFileText,
} from "react-icons/lu";
import { toKhmerDigits, numberToKhmerWords } from "../../utils/khmerNumberSpelling";
import {
  COMMON_UNITS,
  normalizeKhmerDigits,
  sanitizeNumericInput,
} from "../../utils/sponsorshipUtils";
import FormInput from "../../components/FormInput";
import FormDropdown from "../../components/FormDropdown";

const PURPOSE_OPTIONS = [
  { value: "ឧបត្ថម្ភដល់ប្រជាពលរដ្ឋទីទ័លក្រ", label: "ឧបត្ថម្ភដល់ប្រជាពលរដ្ឋទីទ័លក្រ" },
  { value: "ប្រើប្រាស់ក្នុងការងាររដ្ឋបាលស្រុក", label: "ប្រើប្រាស់ក្នុងការងាររដ្ឋបាលស្រុក" },
  { value: "កម្មវិធីមនុស្សធម៌ និងសប្បុរសធម៌", label: "កម្មវិធីមនុស្សធម៌ និងសប្បុរសធម៌" },
  { value: "ឧបត្ថម្ភតាមមូលដ្ឋានឃុំ/ភូមិ", label: "ឧបត្ថម្ភតាមមូលដ្ឋានឃុំ/ភូមិ" },
];

export default function SponsorshipItemModal({
  open,
  onClose,
  onSave,
  initialData = null,
  editingIndex = null,
  materialOptions = [],
  defaultUsageDescription = "",
}) {
  const [form, setForm] = useState({
    item_name: "",
    item_qty: "",
    item_unit: "",
    expense_amount_usd: "",
    expense_amount_khr: "",
    cash_allocation_usd: "",
    cash_allocation_khr: "",
    is_expense_label: "",
    usage_description: "",
    remarks: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initialData) {
        const usdVal = initialData.amount_usd !== undefined && initialData.amount_usd !== null && initialData.amount_usd !== ""
          ? String(initialData.amount_usd)
          : initialData.expense_amount_usd !== undefined && initialData.expense_amount_usd !== null && initialData.expense_amount_usd !== ""
            ? String(initialData.expense_amount_usd)
            : initialData.cash_allocation_usd !== undefined && initialData.cash_allocation_usd !== null && initialData.cash_allocation_usd !== ""
              ? String(initialData.cash_allocation_usd)
              : "";
        const khrVal = initialData.amount_khr !== undefined && initialData.amount_khr !== null && initialData.amount_khr !== ""
          ? String(initialData.amount_khr)
          : initialData.expense_amount_khr !== undefined && initialData.expense_amount_khr !== null && initialData.expense_amount_khr !== ""
            ? String(initialData.expense_amount_khr)
            : initialData.cash_allocation_khr !== undefined && initialData.cash_allocation_khr !== null && initialData.cash_allocation_khr !== ""
              ? String(initialData.cash_allocation_khr)
              : "";
        const expLabel = initialData.is_expense_label || initialData.expense_label || "";

        setForm({
          item_name: initialData.item_name || "",
          item_qty: initialData.item_qty !== undefined && initialData.item_qty !== null ? String(initialData.item_qty) : "",
          item_unit: initialData.item_unit || "",
          amount_usd: usdVal,
          amount_khr: khrVal,
          expense_amount_usd: usdVal,
          expense_amount_khr: khrVal,
          cash_allocation_usd: usdVal,
          cash_allocation_khr: khrVal,
          is_expense_label: expLabel,
          usage_description: initialData.usage_description || defaultUsageDescription || "",
          remarks: initialData.remarks || "",
        });
      } else {
        setForm({
          item_name: "",
          item_qty: "1",
          item_unit: "",
          amount_usd: "",
          amount_khr: "",
          expense_amount_usd: "",
          expense_amount_khr: "",
          cash_allocation_usd: "",
          cash_allocation_khr: "",
          is_expense_label: "",
          usage_description: defaultUsageDescription || "",
          remarks: "",
        });
      }
      setError("");
    }
  }, [open, initialData, defaultUsageDescription]);

  if (!open) return null;

  const handleSave = () => {
    setError("");

    const usdInput = form.amount_usd || form.expense_amount_usd || form.cash_allocation_usd;
    const khrInput = form.amount_khr || form.expense_amount_khr || form.cash_allocation_khr;

    // Validate invalid non-numeric inputs
    if (usdInput && isNaN(Number(usdInput))) {
      setError("ថវិកាជាប្រាក់ដុល្លារ ($ USD) មិនត្រឹមត្រូវ សូមបញ្ចូលជាលេខ");
      return;
    }

    if (khrInput && isNaN(Number(khrInput))) {
      setError("ថវិកាជាប្រាក់រៀល (៛ KHR) មិនត្រឹមត្រូវ សូមបញ្ចូលជាលេខ");
      return;
    }

    if (form.item_qty && (isNaN(Number(form.item_qty)) || Number(form.item_qty) <= 0)) {
      setError("បរិមាណ (Quantity) មិនត្រឹមត្រូវ សូមបញ្ចូលជាលេខធំជាង ០");
      return;
    }

    const hasMaterial = Boolean(form.item_name?.trim());
    const hasUsd = Boolean(usdInput && Number(usdInput) > 0);
    const hasKhr = Boolean(khrInput && Number(khrInput) > 0);
    const hasCash = hasUsd || hasKhr;

    if (!hasMaterial && !hasCash) {
      setError("សូមបញ្ចូលមុខសម្ភារ ឬថវិកាចំណាយ ($ USD / ៛ KHR)");
      return;
    }

    const qty = form.item_qty?.trim() ? sanitizeNumericInput(form.item_qty, true) : "1";
    const sanitizedUsd = sanitizeNumericInput(usdInput, true) || "";
    const sanitizedKhr = sanitizeNumericInput(khrInput, false) || "";

    const normalizedItem = {
      ...form,
      item_name: form.item_name?.trim() || "",
      item_qty: qty || "1",
      item_unit: form.item_unit?.trim() || "",
      amount_usd: sanitizedUsd,
      amount_khr: sanitizedKhr,
      expense_amount_usd: sanitizedUsd,
      expense_amount_khr: sanitizedKhr,
      cash_allocation_usd: sanitizedUsd,
      cash_allocation_khr: sanitizedKhr,
      is_expense_label: form.is_expense_label?.trim() || "",
      expense_label: form.is_expense_label?.trim() || "",
      usage_description: form.usage_description?.trim() || "",
      remarks: form.remarks?.trim() || "",
    };

    onSave(normalizedItem, editingIndex);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(640px, 96%)",
          background: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
          border: "1px solid #fed7aa",
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.1rem 1.4rem",
            background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
            borderBottom: "1px solid #fed7aa",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#ea580c",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LuPackage size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#9a3412" }}>
                {editingIndex !== null ? "កែប្រែមុខសម្ភារ" : "បញ្ចូលមុខសម្ភារ និងថវិកា"}
              </h3>
              <span style={{ fontSize: "0.8rem", color: "#c2410c" }}>
                បញ្ជាក់ព័ត៌មានសម្ភារ បរិមាណ ឯកតា ថវិកា និងគោលបំណងប្រើប្រាស់
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #fdba74",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <LuX size={16} color="#9a3412" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.4rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {error && (
            <div className="alert alert-danger" style={{ margin: 0, padding: "0.6rem 0.9rem", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}

          {/* 1. Item Name */}
          <div>
            <FormDropdown
              label="ឈ្មោះសម្ភារ (Material Name)"
              required
              editable
              leadIcon={<LuPackage size={16} />}
              placeholder="ឧ. អង្ករ, មី, ទឹកបរិសុទ្ធ, ត្រីខ..."
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              options={materialOptions}
            />
            {/* Quick Suggestion Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem" }}>
              {["មី", "ទឹកបរិសុទ្ធ", "អង្ករ", "ត្រីខ", "ទឹកត្រី", "ទឹកស៊ីអ៊ីវ", "ទឹកក្រូច", "ភេសជ្ជៈ"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, item_name: preset })}
                  style={{
                    background: form.item_name === preset ? "#ea580c" : "#fff7ed",
                    color: form.item_name === preset ? "#ffffff" : "#c2410c",
                    border: "1px solid #fed7aa",
                    borderRadius: "12px",
                    padding: "0.15rem 0.55rem",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Quantity & Unit Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <FormInput
              label="បរិមាណ (Quantity)"
              required
              placeholder="1"
              value={form.item_qty}
              onChange={(e) => setForm({ ...form, item_qty: sanitizeNumericInput(e.target.value, true) })}
            />

            <FormDropdown
              label="ឯកតា (Unit)"
              editable
              placeholder="ជ្រើសរើស ឬបញ្ចូលឯកតា"
              value={form.item_unit}
              onChange={(e) => setForm({ ...form, item_unit: e.target.value })}
              options={COMMON_UNITS.map((u) => ({ value: u, label: u }))}
            />
          </div>

          {/* 3. Cash Allocation USD & KHR */}
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <LuDollarSign size={15} color="#059669" />
              <span>ថវិកាចំណាយ / សាច់ប្រាក់ (Expense / Cash Allocation)</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <FormInput
                  label="ចំណាយជាប្រាក់ដុល្លារ ($ USD)"
                  placeholder="0"
                  value={form.expense_amount_usd || form.cash_allocation_usd}
                  onChange={(e) => {
                    const val = sanitizeNumericInput(e.target.value, true);
                    setForm({ ...form, expense_amount_usd: val, cash_allocation_usd: val });
                  }}
                  style={{ fontWeight: "600", color: "#059669" }}
                />
                {Number(form.expense_amount_usd || form.cash_allocation_usd) > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#059669", marginTop: "0.2rem", fontWeight: "500" }}>
                    = {toKhmerDigits(form.expense_amount_usd || form.cash_allocation_usd)} $ ({numberToKhmerWords(form.expense_amount_usd || form.cash_allocation_usd, "USD")})
                  </div>
                )}
              </div>

              <div>
                <FormInput
                  label="ចំណាយជាប្រាក់រៀល (៛ KHR)"
                  placeholder="0"
                  value={form.expense_amount_khr || form.cash_allocation_khr}
                  onChange={(e) => {
                    const val = sanitizeNumericInput(e.target.value, false);
                    setForm({ ...form, expense_amount_khr: val, cash_allocation_khr: val });
                  }}
                  style={{ fontWeight: "600", color: "#2563eb" }}
                />
                {Number(form.expense_amount_khr || form.cash_allocation_khr) > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#2563eb", marginTop: "0.2rem", fontWeight: "500" }}>
                    = {toKhmerDigits(form.expense_amount_khr || form.cash_allocation_khr)} ៛ ({numberToKhmerWords(form.expense_amount_khr || form.cash_allocation_khr, "KHR")})
                  </div>
                )}
              </div>
            </div>

            {/* Optional Expense Label on Item */}
            <div style={{ marginTop: "0.75rem" }}>
              <FormInput
                label="ស្លាកសម្គាល់ចំណាយ / ចំណាំ (Expense Label - ស្រេចចិត្ត)"
                placeholder="ឧ. ចំណាយក្នុងកម្មវិធី, សរុបការចំណាយ..."
                value={form.is_expense_label ?? form.expense_label ?? ""}
                onChange={(e) => setForm({ ...form, is_expense_label: e.target.value, expense_label: e.target.value })}
              />
            </div>
          </div>

          {/* 4. Purpose / Usage description (Textarea) */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#334155",
                marginBottom: "0.4rem",
              }}
            >
              <LuMapPin size={15} color="#2563eb" />
              <span>ទីកន្លែងទទួល និង ប្រើប្រាស់ (Location & Purpose)</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="បញ្ជាក់ទីតាំង និងគោលបំណងនៃការប្រើប្រាស់ថវិកា ឬសម្ភារ (អាចចុះបន្ទាត់បាន)..."
              value={form.usage_description}
              onChange={(e) => setForm({ ...form, usage_description: e.target.value })}
              style={{
                width: "100%",
                resize: "vertical",
                minHeight: "75px",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
              }}
            />
            {/* Quick Purpose Suggestion Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.45rem" }}>
              {PURPOSE_OPTIONS.map((opt) => {
                const isIncluded = form.usage_description?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (!form.usage_description) {
                        setForm({ ...form, usage_description: opt.value });
                      } else if (!isIncluded) {
                        setForm({ ...form, usage_description: `${form.usage_description}\n${opt.value}` });
                      }
                    }}
                    style={{
                      background: isIncluded ? "#3b82f6" : "#eff6ff",
                      color: isIncluded ? "#ffffff" : "#1e40af",
                      border: "1px solid #bfdbfe",
                      borderRadius: "12px",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Remarks */}
          <div>
            <FormInput
              label="ផ្សេងៗ (Remarks / Notes)"
              leadIcon={<LuFileText size={16} />}
              placeholder="កំណត់សម្គាល់បន្ថែម..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.9rem 1.4rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            បោះបង់
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            style={{
              background: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.55rem 1.3rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer",
            }}
          >
            <LuCheck size={16} />
            <span>{editingIndex !== null ? "រក្សាទុកការកែប្រែ" : "បន្ថែមចូលតារាង"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
