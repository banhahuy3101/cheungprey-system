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

    const validation = validateSponsorshipPayload(f  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {isEdit ? "កែប្រែទិន្នន័យឧបត្ថម្ភ" : "បញ្ចូលអ្នកឧបត្ថម្ភ និងសម្ភារ/ថវិកា"}
            </h3>
            <span className="text-xs text-slate-500">
              {form.record_period ? `ក្រោមតារាងមេ ៖ ${form.record_period}` : "ទម្រង់បញ្ចូលទិន្នន័យអ្នកឧបត្ថម្ភ"}
            </span>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            onClick={closeModal}
            aria-label="បិទ"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <LuShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Sponsorship Selection */}
          {availablePeriods.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <FormSelect
                label="តារាងឧបត្ថម្ភមេ (Main Sponsorship Period)"
                icon={<LuCalendar className="w-4 h-4 text-blue-600" />}
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
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col gap-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <LuUser className="w-4 h-4 text-blue-600" />
              <span>ព័ត៌មានអ្នកឧបត្ថម្ភ (Sponsor)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Contributor / Full Name */}
              <div className="sm:col-span-2">
                <FormInput
                  label="គោត្តនាម និង នាម (Honorific & Full Name)"
                  required
                  leadIcon={<LuUser className="w-4 h-4 text-blue-600" />}
                  placeholder="ឧ. ឯកឧត្តមបណ្ឌិត ម៉ា ឈឿន ឬ លោកជំទាវ..."
                  value={form.contributor_name}
                  onChange={(e) => setForm({ ...form, contributor_name: e.target.value })}
                  style={{ fontWeight: "600" }}
                />
              </div>

              {/* Representative / Via */}
              <div className="sm:col-span-2">
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
                  label: `${y} (ឆ្នាំ ${toKhmerDigits(y, false)})`,
                }))}
              />
            </div>
          </div>

          {/* Section 2: Physical Goods / Materials & Line Item Allocations */}
          <div className="p-4 bg-white border border-orange-200 rounded-xl flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <LuPackage className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-orange-950">
                    សម្ភារ / ឯកតា (Materials & Goods)
                  </h4>
                  <span className="text-xs text-orange-700">
                    {items.length > 0 ? `មាន ${toKhmerDigits(items.length)} មុខសម្ភារ` : "ស្រេចចិត្ត (Optional)"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
                onClick={handleAddItem}
              >
                <LuPlus className="w-3.5 h-3.5" />
                <span>បន្ថែមសម្ភារ</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div
                className="p-6 text-center bg-orange-50/60 rounded-xl border border-dashed border-orange-300 hover:bg-orange-50 cursor-pointer transition-colors"
                onClick={handleAddItem}
              >
                <LuPackage className="w-8 h-8 text-orange-400 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-orange-900">
                  មិនទាន់មានមុខសម្ភារនៅឡើយទេ
                </div>
                <div className="text-xs text-orange-700 mt-0.5">
                  ចុចទីនេះ ឬចុចប៊ូតុង <strong>&quot;បន្ថែមសម្ភារ&quot;</strong> ប្រសិនបើមានការឧបត្ថម្ភជាសម្ភារ
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-xs font-bold text-orange-950">
                  <span className="col-span-1 text-center">ល.រ</span>
                  <span className="col-span-3">ឈ្មោះសម្ភារ</span>
                  <span className="col-span-1 text-center">បរិមាណ</span>
                  <span className="col-span-2">ឯកតា</span>
                  <span className="col-span-2 text-right">ថវិកា ($)</span>
                  <span className="col-span-2 text-right">ថវិកា (៛)</span>
                  <span className="col-span-1"></span>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:grid sm:grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 font-bold text-orange-900 text-center">
                      {toKhmerDigits(idx + 1)}
                    </div>

                    <div className="col-span-3 w-full">
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

                    <div className="col-span-1 w-full">
                      <FormInput
                        compact
                        placeholder="1"
                        value={it.item_qty}
                        onChange={(e) => handleItemChange(idx, "item_qty", e.target.value)}
                        style={{ textAlign: "center", fontWeight: "700" }}
                      />
                    </div>

                    <div className="col-span-2 w-full">
                      <FormDropdown
                        compact
                        editable
                        placeholder="គ.ក, កេស..."
                        value={it.item_unit}
                        onChange={(e) => handleItemChange(idx, "item_unit", e.target.value)}
                        options={COMMON_UNITS.map((u) => ({ value: u, label: u }))}
                      />
                    </div>

                    <div className="col-span-2 w-full">
                      <FormInput
                        compact
                        placeholder="0 $"
                        value={it.cash_allocation_usd}
                        onChange={(e) => handleItemChange(idx, "cash_allocation_usd", e.target.value)}
                        style={{ textAlign: "right", fontWeight: "700", color: "#059669" }}
                      />
                    </div>

                    <div className="col-span-2 w-full">
                      <FormInput
                        compact
                        placeholder="0 ៛"
                        value={it.cash_allocation_khr}
                        onChange={(e) => handleItemChange(idx, "cash_allocation_khr", e.target.value)}
                        style={{ textAlign: "right", fontWeight: "700", color: "#2563eb" }}
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md bg-red-50 text-red-600 hover:bg-red-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                        onClick={() => handleRemoveItem(idx)}
                        title="លុបមុខសម្ភារនេះ"
                      >
                        <LuTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            onClick={closeModal}
            disabled={saving}
          >
            បោះបង់
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            onClick={handleSubmit}
            disabled={saving}
          >
            <LuSave className="w-4 h-4" />
            <span>{saving ? "កំពុងរក្សាទុក..." : isEdit ? "រក្សាទុកការកែប្រែ" : "រក្សាទុក"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}e.target.value)}
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
