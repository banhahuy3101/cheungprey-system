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
  sanitizeNumericInput,
} from "../../utils/sponsorshipUtils";
import FormInput from "../../components/FormInput";
import FormDropdown from "../../components/FormDropdown";
import { useToast } from "../../components/Toast";

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
  const toast = useToast();
  const [form, setForm] = useState({
    item_name: "",
    item_qty: "",
    item_unit: "",
    expense_amount_usd: "",
    expense_amount_khr: "",
    cash_allocation_usd: "",
    cash_allocation_khr: "",
    usage_description: "",
    remarks: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initialData) {
        const usdVal =
          initialData.amount_usd !== undefined && initialData.amount_usd !== null && initialData.amount_usd !== ""
            ? String(initialData.amount_usd)
            : initialData.expense_amount_usd !== undefined && initialData.expense_amount_usd !== null && initialData.expense_amount_usd !== ""
            ? String(initialData.expense_amount_usd)
            : initialData.cash_allocation_usd !== undefined && initialData.cash_allocation_usd !== null && initialData.cash_allocation_usd !== ""
            ? String(initialData.cash_allocation_usd)
            : "";
        const khrVal =
          initialData.amount_khr !== undefined && initialData.amount_khr !== null && initialData.amount_khr !== ""
            ? String(initialData.amount_khr)
            : initialData.expense_amount_khr !== undefined && initialData.expense_amount_khr !== null && initialData.expense_amount_khr !== ""
            ? String(initialData.expense_amount_khr)
            : initialData.cash_allocation_khr !== undefined && initialData.cash_allocation_khr !== null && initialData.cash_allocation_khr !== ""
            ? String(initialData.cash_allocation_khr)
            : "";

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
      const msg = "ថវិកាជាប្រាក់ដុល្លារ ($ USD) មិនត្រឹមត្រូវ សូមបញ្ចូលជាលេខ";
      setError(msg);
      toast?.error?.(msg);
      return;
    }

    if (khrInput && isNaN(Number(khrInput))) {
      const msg = "ថវិកាជាប្រាក់រៀល (៛ KHR) មិនត្រឹមត្រូវ សូមបញ្ចូលជាលេខ";
      setError(msg);
      toast?.error?.(msg);
      return;
    }

    if (form.item_qty && (isNaN(Number(form.item_qty)) || Number(form.item_qty) <= 0)) {
      const msg = "បរិមាណ (Quantity) មិនត្រឹមត្រូវ សូមបញ្ចូលជាលេខធំជាង ០";
      setError(msg);
      toast?.error?.(msg);
      return;
    }

    const hasMaterial = Boolean(form.item_name?.trim());
    const hasUsd = Boolean(usdInput && Number(usdInput) > 0);
    const hasKhr = Boolean(khrInput && Number(khrInput) > 0);
    const hasCash = hasUsd || hasKhr;

    if (!hasMaterial && !hasCash) {
      const msg = "សូមបញ្ចូលមុខសម្ភារ ឬថវិកាចំណាយ ($ USD / ៛ KHR)";
      setError(msg);
      toast?.error?.(msg);
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
      usage_description: form.usage_description?.trim() || "",
      remarks: form.remarks?.trim() || "",
    };

    onSave(normalizedItem, editingIndex);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <LuPackage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-orange-950 leading-tight">
                {editingIndex !== null ? "កែប្រែមុខសម្ភារ" : "បញ្ចូលមុខសម្ភារ និងថវិកា"}
              </h3>
              <span className="text-xs text-orange-700">
                បញ្ជាក់ព័ត៌មានសម្ភារ បរិមាណ ឯកតា ថវិកា និងគោលបំណងប្រើប្រាស់
              </span>
            </div>
          </div>

          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white border border-orange-200 hover:bg-orange-100 text-orange-800 flex items-center justify-center transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="បិទ"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* 1. Item Name */}
          <div className="flex flex-col gap-1.5">
            <FormDropdown
              label="ឈ្មោះសម្ភារ (Material Name)"
              required
              editable
              leadIcon={<LuPackage className="w-4 h-4 text-orange-600" />}
              placeholder="ឧ. អង្ករ, មី, ទឹកបរិសុទ្ធ, ត្រីខ..."
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              options={materialOptions}
            />
            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {["មី", "ទឹកបរិសុទ្ធ", "អង្ករ", "ត្រីខ", "ទឹកត្រី", "ទឹកស៊ីអ៊ីវ", "ទឹកក្រូច", "ភេសជ្ជៈ"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, item_name: preset })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    form.item_name === preset
                      ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                      : "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Quantity & Unit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LuDollarSign className="w-4 h-4 text-emerald-600" />
              <span>ថវិកាចំណាយ / សាច់ប្រាក់ (Expense / Cash Allocation)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <FormInput
                  label="ចំណាយជាប្រាក់ដុល្លារ ($ USD)"
                  placeholder="0"
                  value={form.expense_amount_usd || form.cash_allocation_usd}
                  onChange={(e) => {
                    const val = sanitizeNumericInput(e.target.value, true);
                    setForm({ ...form, expense_amount_usd: val, cash_allocation_usd: val });
                  }}
                  className="font-bold text-emerald-600"
                />
                {Number(form.expense_amount_usd || form.cash_allocation_usd) > 0 && (
                  <div className="text-xs text-emerald-600 font-semibold mt-1">
                    = {toKhmerDigits(form.expense_amount_usd || form.cash_allocation_usd)} $ (
                    {numberToKhmerWords(form.expense_amount_usd || form.cash_allocation_usd, "USD")})
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
                  className="font-bold text-blue-600"
                />
                {Number(form.expense_amount_khr || form.cash_allocation_khr) > 0 && (
                  <div className="text-xs text-blue-600 font-semibold mt-1">
                    = {toKhmerDigits(form.expense_amount_khr || form.cash_allocation_khr)} ៛ (
                    {numberToKhmerWords(form.expense_amount_khr || form.cash_allocation_khr, "KHR")})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Purpose / Usage description (Textarea) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LuMapPin className="w-4 h-4 text-blue-600" />
              <span>ទីកន្លែងទទួល និង ប្រើប្រាស់ (Location & Purpose)</span>
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none resize-y min-h-[75px]"
              rows={3}
              placeholder="បញ្ជាក់ទីតាំង និងគោលបំណងនៃការប្រើប្រាស់ថវិកា ឬសម្ភារ (អាចចុះបន្ទាត់បាន)..."
              value={form.usage_description}
              onChange={(e) => setForm({ ...form, usage_description: e.target.value })}
            />
            {/* Quick Purpose Suggestion Badges */}
            <div className="flex flex-wrap gap-1.5 mt-1">
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
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isIncluded
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                    }`}
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
              leadIcon={<LuFileText className="w-4 h-4 text-slate-500" />}
              placeholder="កំណត់សម្គាល់បន្ថែម..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            បោះបង់
          </button>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5 font-semibold"
            onClick={handleSave}
          >
            <LuCheck size={16} />
            <span>{editingIndex !== null ? "រក្សាទុកការកែប្រែ" : "បន្ថែមចូលតារាង"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
