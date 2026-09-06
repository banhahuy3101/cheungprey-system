import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuSave,
  LuPlus,
  LuPackage,
  LuTrash2,
  LuUser,
  LuPencil,
  LuDollarSign,
} from "react-icons/lu";
import { SponsorshipProvider, useSponsorships } from "../../context/SponsorshipContext";
import { sponsorshipAPI } from "../../api/sponsorship";
import { toKhmerDigits, numberToKhmerWords } from "../../utils/khmerNumberSpelling";
import {
  COMMON_MATERIALS,
  COMMON_SECTION_GROUPS,
  sanitizeNumericInput,
  validateSponsorshipPayload,
} from "../../utils/sponsorshipUtils";
import PageHeader from "../../components/PageHeader";
import FormSelect from "../../components/FormSelect";
import FormInput from "../../components/FormInput";
import FormDropdown from "../../components/FormDropdown";
import SponsorshipItemModal from "./SponsorshipItemModal";
import "../../style/sponsorships.css";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function SponsorshipFormContent() {
  const navigate = useNavigate();
  const { periodId, id } = useParams(); // URL: /sponsorships/items/:periodId/create or /sponsorships/items/:periodId/edit/:id
  const isEdit = Boolean(id);

  const { records, createRecord, updateRecord } = useSponsorships();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isExpenseTotal, setIsExpenseTotal] = useState(false);

  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [periodRecord, setPeriodRecord] = useState(null);

  const loadedRecordIdRef = useRef(null);
  const initializedCreateRef = useRef(false);

  const decodedPeriodId = periodId ? decodeURIComponent(periodId) : null;
  const periodIdIsUuid = Boolean(decodedPeriodId && UUID_RE.test(decodedPeriodId));

  // Directly call API by ID on mount / ID change:
  // - edit mode: the record being edited (GET /sponsorships/:id)
  // - create mode: the main sponsorship period record (GET /sponsorships/:periodId)
  useEffect(() => {
    let cancelled = false;

    if (id && UUID_RE.test(id)) {
      sponsorshipAPI
        .getByID(id)
        .then((res) => {
          if (!cancelled) setFetchedRecord(res.data?.data || null);
        })
        .catch((err) => {
          console.warn("Failed to fetch record by ID:", err);
          if (!cancelled) setFetchedRecord(null);
        });
    }

    if (!id && periodIdIsUuid) {
      sponsorshipAPI
        .getByID(decodedPeriodId)
        .then((res) => {
          if (!cancelled) setPeriodRecord(res.data?.data || null);
        })
        .catch((err) => {
          console.warn("Failed to fetch period record by ID:", err);
          if (!cancelled) setPeriodRecord(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id, decodedPeriodId, periodIdIsUuid]);

  // Record being edited (from direct API fetch by ID or Context cache as fallback)
  const editRecord = useMemo(() => {
    if (fetchedRecord && String(fetchedRecord.id) === String(id)) return fetchedRecord;
    if (!id || !records) return null;
    return records.find((r) => String(r.id) === String(id)) || null;
  }, [id, records, fetchedRecord]);

  // Determine current active period from active record or periodId param
  const activePeriod = useMemo(() => {
    if (editRecord?.record_period) {
      return {
        id: periodId || editRecord.id,
        name: editRecord.record_period,
        year: String(editRecord.fiscal_year || new Date().getFullYear()),
      };
    }
    if (!periodId) return null;
    const decoded = decodeURIComponent(periodId);

    // Period resolved by ID from the API (GET /sponsorships/:periodId)
    if (periodRecord && String(periodRecord.id) === String(decoded)) {
      return {
        id: periodRecord.id,
        name: periodRecord.record_period || (periodRecord.fiscal_year ? `ប្រចាំឆ្នាំ ${periodRecord.fiscal_year}` : "ការឧបត្ថម្ភទូទៅ"),
        year: String(periodRecord.fiscal_year || new Date().getFullYear()),
      };
    }

    // Fallback: match against list records
    const byRecord = (records || []).find((r) => String(r.id) === String(periodId) || String(r.id) === decoded);
    if (byRecord) {
      return {
        id: byRecord.id,
        name: byRecord.record_period || (byRecord.fiscal_year ? `ប្រចាំឆ្នាំ ${byRecord.fiscal_year}` : "ការឧបត្ថម្ភទូទៅ"),
        year: String(byRecord.fiscal_year || new Date().getFullYear()),
      };
    }
    return {
      id: periodId,
      name: decoded.includes("-") ? `ប្រចាំឆ្នាំ ${new Date().getFullYear()}` : decoded,
      year: String(new Date().getFullYear()),
    };
  }, [periodId, records, editRecord, periodRecord]);

  const [form, setForm] = useState({
    record_period: activePeriod?.name || "",
    fiscal_year: activePeriod?.year || String(new Date().getFullYear()),
    entry_no: "",
    section_group: "ទូទៅ",
    contributor_name: "",
    representatives: "",
    expense_label: "",
    is_expense_label: "",
    amount_usd: "",
    amount_khr: "",
    expense_amount_usd: "",
    expense_amount_khr: "",
    usage_description: "",
    remarks: "",
  });

  const [items, setItems] = useState([]);

  // Modal State for Adding / Editing a Single Material Line Item
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null); // null = Add, number = Edit index

  // Compute map of already taken row numbers for this period to prevent duplication
  const takenRowNos = useMemo(() => {
    const pName = form.record_period;
    const map = new Map();
    if (!pName || !records) return map;

    records.forEach((r) => {
      // Exclude the currently edited record so its own row number is never blocked
      if (isEdit && id && String(r.id) === String(id)) return;

      const matchPeriod =
        r.record_period === pName ||
        (!r.record_period && pName.includes(String(r.fiscal_year)));
      if (matchPeriod && (r.entry_no || r.record_id)) {
        const no = Number(r.entry_no || r.record_id);
        const name = r.contributor_name || r.donor_name || "កំណត់ត្រា";
        map.set(no, name);
      }
    });
    return map;
  }, [form.record_period, records, isEdit, id]);

  // Compute next available sequence number
  const suggestedNextNo = useMemo(() => {
    let max = 0;
    takenRowNos.forEach((_, no) => {
      if (no > max) max = no;
    });
    return max + 1;
  }, [takenRowNos]);

  // Generate row number options
  const rowOptions = useMemo(() => {
    let max = 50;
    if (takenRowNos && typeof takenRowNos.forEach === "function") {
      takenRowNos.forEach((_, k) => {
        if (typeof k === "number" && k >= max) max = k + 10;
      });
    }
    if (form.entry_no && !isNaN(Number(form.entry_no)) && Number(form.entry_no) >= max) {
      max = Number(form.entry_no) + 5;
    }
    const safeLength = Math.min(Math.max(Number(max) || 50, 1), 500);
    return Array.from({ length: safeLength }, (_, i) => i + 1);
  }, [takenRowNos, form.entry_no]);

  // Preset common materials with all unique material names existing in DB
  const materialOptions = useMemo(() => {
    const set = new Set(COMMON_MATERIALS);
    (records || []).forEach((r) => {
      const recItems = r?.items || r.in_kind_items || [];
      recItems.forEach((it) => {
        if (it?.item_name && String(it.item_name).trim()) {
          set.add(String(it.item_name).trim());
        }
      });
    });
    return Array.from(set).map((m) => ({ value: m, label: m }));
  }, [records]);

  // Section Group dropdown / autocomplete options
  const sectionGroupOptions = useMemo(() => {
    const set = new Set(COMMON_SECTION_GROUPS);
    (records || []).forEach((r) => {
      if (r?.section_group && String(r.section_group).trim()) {
        set.add(String(r.section_group).trim());
      }
    });
    return Array.from(set).map((g) => ({ value: g, label: g }));
  }, [records]);

  // Autocomplete options for contributor / donor names
  const contributorOptions = useMemo(() => {
    const set = new Set();
    (records || []).forEach((r) => {
      const name = r?.contributor_name || r?.donor_name;
      if (name && String(name).trim()) set.add(String(name).trim());
    });
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [records]);

  // Format helper
  const formatFieldValue = (val) => {
    if (val === undefined || val === null || Number(val) === 0 || val === "") return "";
    return String(val);
  };

  // Populate form on load / change
  useEffect(() => {
    if (isEdit) {
      if (editRecord && loadedRecordIdRef.current !== editRecord.id) {
        loadedRecordIdRef.current = editRecord.id;

        const recUsd = editRecord.amount_usd ?? editRecord.expense_amount_usd ?? editRecord.currency_usd;
        const recKhr = editRecord.amount_khr ?? editRecord.expense_amount_khr ?? editRecord.currency_khr;
        const hasDirectCash = Boolean(
          editRecord.is_expense_total ||
          ((Number(recUsd) > 0 || Number(recKhr) > 0) &&
            (!editRecord.items || editRecord.items.length === 0) &&
            (!editRecord.in_kind_items || editRecord.in_kind_items.length === 0))
        );
        setIsExpenseTotal(hasDirectCash);

        const expLabel = editRecord.expense_label ?? editRecord.is_expense_label ?? "";

        setForm({
          record_period: editRecord.record_period || activePeriod?.name || "",
          entry_no: editRecord.entry_no ? String(editRecord.entry_no) : editRecord.record_id ? String(editRecord.record_id) : "",
          fiscal_year: editRecord.fiscal_year ? String(editRecord.fiscal_year) : activePeriod?.year || String(new Date().getFullYear()),
          section_group: editRecord.section_group || "ទូទៅ",
          contributor_name: editRecord.contributor_name || editRecord.donor_name || "",
          representatives: editRecord.representatives || "",
          expense_label: expLabel,
          is_expense_label: expLabel,
          amount_usd: formatFieldValue(recUsd),
          amount_khr: formatFieldValue(recKhr),
          expense_amount_usd: formatFieldValue(recUsd),
          expense_amount_khr: formatFieldValue(recKhr),
          usage_description: editRecord.usage_description || editRecord.allocation_purpose || "",
          remarks: editRecord.remarks || "",
        });

        const recordItems = editRecord.items || editRecord.in_kind_items || [];
        if (Array.isArray(recordItems) && recordItems.length > 0) {
          setItems(
            recordItems.map((it) => {
              const itUsd = it?.amount_usd ?? it?.expense_amount_usd ?? it?.cash_allocation_usd;
              const itKhr = it?.amount_khr ?? it?.expense_amount_khr ?? it?.cash_allocation_khr;
              const itLabel = it?.is_expense_label || it?.expense_label || "";
              return {
                item_name: it?.item_name || "",
                item_qty: it?.item_qty !== undefined && it?.item_qty !== null && Number(it?.item_qty) !== 0 ? String(it.item_qty) : "",
                item_unit: it?.item_unit || "",
                amount_usd: formatFieldValue(itUsd),
                amount_khr: formatFieldValue(itKhr),
                expense_amount_usd: formatFieldValue(itUsd),
                expense_amount_khr: formatFieldValue(itKhr),
                cash_allocation_usd: formatFieldValue(itUsd),
                cash_allocation_khr: formatFieldValue(itKhr),
                is_expense_label: itLabel,
                expense_label: itLabel,
                usage_description: it?.usage_description || it?.item_notes || editRecord.usage_description || "",
                remarks: it?.remarks || editRecord.remarks || "",
              };
            })
          );
        } else {
          setItems([]);
        }
      }
    } else {
      setIsExpenseTotal(false);
      setForm((prev) => {
        const pName = activePeriod?.name || prev.record_period || "";
        const pYear = activePeriod?.year || prev.fiscal_year || String(new Date().getFullYear());
        return {
          ...prev,
          record_period: pName,
          entry_no: prev.entry_no || String(suggestedNextNo),
          fiscal_year: pYear,
          expense_label: prev.expense_label || "",
          is_expense_label: prev.is_expense_label || "",
        };
      });
    }
  }, [isEdit, editRecord, activePeriod, suggestedNextNo]);

  // Sync active period name when periodRecord arrives asynchronously
  useEffect(() => {
    if (!isEdit && activePeriod?.name) {
      setForm((prev) => ({
        ...prev,
        record_period: activePeriod.name,
        fiscal_year: activePeriod.year || prev.fiscal_year || String(new Date().getFullYear()),
      }));
    }
  }, [activePeriod, isEdit]);

  // Modal Open Handlers
  const handleOpenAddItemModal = () => {
    setEditingItemIndex(null);
    setItemModalOpen(true);
  };

  const handleOpenEditItemModal = (index) => {
    setEditingItemIndex(index);
    setItemModalOpen(true);
  };

  const handleCloseItemModal = () => {
    setItemModalOpen(false);
  };

  const handleSaveItemFromModal = (savedItem, index) => {
    if (index !== null && index >= 0) {
      setItems((prev) => {
        const next = [...prev];
        next[index] = savedItem;
        return next;
      });
    } else {
      setItems((prev) => [...prev, savedItem]);
    }
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Totals calculation for display
  const summaryTotals = useMemo(() => {
    let usd = 0;
    let khr = 0;

    items.forEach((it) => {
      usd += Number(it.amount_usd || it.expense_amount_usd || it.cash_allocation_usd) || 0;
      khr += Number(it.amount_khr || it.expense_amount_khr || it.cash_allocation_khr) || 0;
    });

    if (items.length === 0 || isExpenseTotal) {
      usd += Number(form.amount_usd) || 0;
      khr += Number(form.amount_khr) || 0;
    }

    return { usd, khr, itemsCount: items.length };
  }, [items, form.amount_usd, form.amount_khr, isExpenseTotal]);

  const handleSubmit = async () => {
    setError("");

    const isKeepingCurrentNo =
      isEdit &&
      editRecord &&
      Number(form.entry_no) === Number(editRecord.entry_no || editRecord.record_id);

    if (form.entry_no && !isKeepingCurrentNo && takenRowNos.has(Number(form.entry_no))) {
      const donor = takenRowNos.get(Number(form.entry_no));
      setError(`ល.រ ${toKhmerDigits(form.entry_no)} ត្រូវបានជ្រើសរើសរួចហើយ (${donor}) សូមជ្រើសរើសលេខរៀងផ្សេង`);
      return;
    }

    const finalPeriod =
      form.record_period?.trim() ||
      activePeriod?.name ||
      periodRecord?.record_period ||
      (periodRecord?.fiscal_year ? `ប្រចាំឆ្នាំ ${periodRecord.fiscal_year}` : "") ||
      "";
    const finalYear =
      form.fiscal_year ||
      activePeriod?.year ||
      (periodRecord?.fiscal_year ? String(periodRecord.fiscal_year) : String(new Date().getFullYear()));

    const submissionData = {
      ...validation.data,
      record_period: finalPeriod,
      fiscal_year: Number(finalYear) || new Date().getFullYear(),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateRecord(id, submissionData);
      } else {
        await createRecord(submissionData, false);
      }
      navigate(periodId ? `/sponsorships/items/${periodId}` : "/sponsorships");
    } catch (err) {
      console.error("Save sponsorship error:", err);
      setError(err?.response?.data?.error || err?.message || "មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ");
    } finally {
      setSaving(false);
    }
  };

  const backUrl = periodId ? `/sponsorships/items/${periodId}` : "/sponsorships";

  return (
    <div className="sponsorship-page-container">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title={isEdit ? "កែប្រែទិន្នន័យឧបត្ថម្ភ" : "បញ្ចូលអ្នកឧបត្ថម្ភ និងសម្ភារ/ថវិកា"}
        subtitle={activePeriod ? `ក្រោមតារាងមេ ៖ ${activePeriod.name}` : "ទម្រង់បញ្ចូលទិន្នន័យអ្នកឧបត្ថម្ភ"}
        showBack={() => navigate(backUrl)}
        backText="ត្រឡប់ទៅតារាង"
        breadcrumbs={[
          { label: "ផ្ទាំងគ្រប់គ្រង", path: "/dashboard" },
          { label: "ការឧបត្ថម្ភ", path: "/sponsorships" },
          ...(activePeriod ? [{ label: activePeriod.name, path: `/sponsorships/items/${periodId}` }] : []),
          { label: isEdit ? "កែប្រែ" : "បញ្ចូលថ្មី" },
        ]}
        actions={
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
        }
      />

      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "3rem" }}>
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "1.25rem", borderRadius: "8px", fontWeight: "600" }}>
            {error}
          </div>
        )}

        <div className="card" style={{ padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {/* Section 1: Contributor Info */}
          <div className="sponsorship-form-section" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", background: "#f8fafc", marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "700", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <LuUser size={18} color="#2563eb" />
              <span>ព័ត៌មានអ្នកឧបត្ថម្ភ (Contributor Profile)</span>
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Section Group */}
              <div style={{ gridColumn: "1 / -1" }}>
                <FormDropdown
                  label="ក្រុមឧបត្ថម្ភ (Section Group)"
                  editable
                  placeholder="ឧ. ទូទៅ, ថ្នាក់ដឹកនាំ, ក្រុមការងារ, សប្បុរសជន..."
                  value={form.section_group}
                  onChange={(e) => setForm({ ...form, section_group: e.target.value })}
                  options={sectionGroupOptions}
                />
              </div>

              {/* Contributor Name */}
              <div style={{ gridColumn: "1 / -1" }}>
                <FormDropdown
                  label="គោត្តនាម និង នាមអ្នកឧបត្ថម្ភ (Honorific & Full Name)"
                  required
                  editable
                  leadIcon={<LuUser size={16} />}
                  placeholder="ឧ. ឯកឧត្តម... / លោកជំទាវ... / លោក..."
                  value={form.contributor_name}
                  onChange={(e) => setForm({ ...form, contributor_name: e.target.value })}
                  options={contributorOptions}
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

              {/* Direct Cash / Expense Section (Shows inputs only when ticked) */}
              <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem", paddingTop: "0.85rem", borderTop: "1px dashed #cbd5e1" }}>
                {/* Tick box for សរុបការចំណាយ */}
                <div style={{ marginBottom: isExpenseTotal ? "0.85rem" : "0.25rem" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", fontWeight: "700", fontSize: "0.95rem", color: isExpenseTotal ? "#b91c1c" : "#1e3a8a", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={isExpenseTotal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsExpenseTotal(checked);
                        if (!checked) {
                          setForm((prev) => ({
                            ...prev,
                            amount_usd: "",
                            amount_khr: "",
                          }));
                        }
                      }}
                      style={{ width: "19px", height: "19px", cursor: "pointer", accentColor: "#dc2626" }}
                    />
                    <span>ជាកំណត់ត្រា ៖ សរុបការចំណាយ (Mark as Total Expense / Pure Cash Allocation)</span>
                  </label>
                </div>

                {isExpenseTotal && (
                  /* Dedicated Expense Panel (Visible ONLY when isExpenseTotal is ticked) */
                  <div style={{ background: "#fef2f2", padding: "1.1rem", borderRadius: "10px", border: "1.5px solid #fecaca", boxShadow: "0 1px 3px rgba(185, 28, 28, 0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.85rem", color: "#991b1b", fontWeight: "700", fontSize: "0.92rem" }}>
                      <LuDollarSign size={18} color="#dc2626" />
                      <span>ព័ត៌មាន និងចំនួនទឹកប្រាក់សរុបការចំណាយ (Total Expense Details & Amounts)</span>
                    </div>

                    {/* 1. Expense Display Label */}
                    <div style={{ marginBottom: "0.9rem" }}>
                      <FormInput
                        label="ស្លាកសម្គាល់ការចំណាយសម្រាប់បង្ហាញក្នុងតារាងឧបសម្ព័ន្ធ (Expense Display Label)"
                        placeholder="ឧ. សរុបការចំណាយ, ចំណាយក្នុងកម្មវិធី..."
                        value={form.expense_label ?? form.is_expense_label ?? ""}
                        onChange={(e) => setForm({ ...form, expense_label: e.target.value, is_expense_label: e.target.value })}
                      />
                    </div>

                    {/* 2. Expense Dollar and Riel Amount Inputs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <FormInput
                          label="ចំនួនថវិកាចំណាយ - ដុល្លារ ($ USD)"
                          placeholder="0"
                          value={form.amount_usd}
                          onChange={(e) => setForm({ ...form, amount_usd: sanitizeNumericInput(e.target.value, true) })}
                          style={{ fontWeight: "700", color: "#059669", background: "#ffffff" }}
                        />
                        {Number(form.amount_usd) > 0 && (
                          <div style={{ fontSize: "0.78rem", color: "#047857", marginTop: "0.25rem", fontWeight: "600" }}>
                            = {toKhmerDigits(form.amount_usd)} $ ({numberToKhmerWords(form.amount_usd, "USD")})
                          </div>
                        )}
                      </div>

                      <div>
                        <FormInput
                          label="ចំនួនថវិកាចំណាយ - រៀល (៛ KHR)"
                          placeholder="0"
                          value={form.amount_khr}
                          onChange={(e) => setForm({ ...form, amount_khr: sanitizeNumericInput(e.target.value, false) })}
                          style={{ fontWeight: "700", color: "#2563eb", background: "#ffffff" }}
                        />
                        {Number(form.amount_khr) > 0 && (
                          <div style={{ fontSize: "0.78rem", color: "#1d4ed8", marginTop: "0.25rem", fontWeight: "600" }}>
                            = {toKhmerDigits(form.amount_khr)} ៛ ({numberToKhmerWords(form.amount_khr, "KHR")})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Physical Goods & Material Allocations Table */}
          <div className="sponsorship-form-section" style={{ border: "1px solid #fed7aa", borderRadius: "10px", padding: "1.25rem", background: "#ffffff", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#ffedd5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c2410c",
                  }}
                >
                  <LuPackage size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "#9a3412" }}>
                    សម្ភារ / ឯកតា (Materials & Goods Line Items)
                  </h4>
                  <span style={{ fontSize: "0.8rem", color: "#ea580c" }}>
                    {items.length > 0 ? `មាន ${toKhmerDigits(items.length)} មុខសម្ភារ` : "ចុចប៊ូតុងខាងស្តាំដើម្បីបញ្ចូលមុខសម្ភារ"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm"
                onClick={handleOpenAddItemModal}
                style={{
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.45rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  boxShadow: "0 2px 4px rgba(234, 88, 12, 0.25)",
                  cursor: "pointer",
                }}
              >
                <LuPlus size={18} />
                <span>+ បន្ថែមសម្ភារ</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div
                className="sponsorship-empty-goods"
                onClick={handleOpenAddItemModal}
                style={{
                  cursor: "pointer",
                  padding: "2.5rem",
                  textAlign: "center",
                  background: "#fff7ed",
                  borderRadius: "8px",
                  border: "1px dashed #fdba74",
                  transition: "all 0.2s ease",
                }}
              >
                <LuPackage size={40} color="#ea580c" style={{ opacity: 0.8 }} />
                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#9a3412", marginTop: "0.5rem" }}>
                  មិនទាន់មានមុខសម្ភារនៅឡើយទេ
                </div>
                <div style={{ fontSize: "0.85rem", color: "#c2410c", marginTop: "0.25rem" }}>
                  ចុចទីនេះ ឬចុចប៊ូតុង <strong>&quot;+ បន្ថែមសម្ភារ&quot;</strong> ដើម្បីបើកផ្ទាំងបញ្ចូលមុខសម្ភារ
                </div>
              </div>
            ) : (
              <div className="table-responsive" style={{ border: "1px solid #fed7aa", borderRadius: "8px", overflow: "hidden" }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: "#fff7ed", color: "#9a3412", fontSize: "0.82rem" }}>
                      <th style={{ width: "5%", textAlign: "center" }}>ល.រ</th>
                      <th style={{ width: "22%" }}>ឈ្មោះសម្ភារ</th>
                      <th style={{ width: "13%", textAlign: "center" }}>បរិមាណ / ឯកតា</th>
                      <th style={{ width: "12%", textAlign: "right" }}>ថវិកា ($ USD)</th>
                      <th style={{ width: "13%", textAlign: "right" }}>ថវិកា (៛ KHR)</th>
                      <th style={{ width: "20%" }}>ទីកន្លែងទទួល និង ប្រើប្រាស់</th>
                      <th style={{ width: "8%", textAlign: "center" }}>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const usd = Number(it.amount_usd || it.expense_amount_usd || it.cash_allocation_usd) || 0;
                      const khr = Number(it.amount_khr || it.expense_amount_khr || it.cash_allocation_khr) || 0;
                      const expenseLabel = it.is_expense_label || it.expense_label;

                      return (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fffbf5" }}>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "#9a3412" }}>
                            {toKhmerDigits(idx + 1)}
                          </td>
                          <td>
                            <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.92rem" }}>
                              {it.item_name || <span style={{ color: "#94a3b8" }}>-</span>}
                            </div>
                            {expenseLabel && (
                              <div style={{ marginTop: "0.15rem" }}>
                                <span style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#b91c1c", padding: "0.1rem 0.45rem", borderRadius: "4px", fontWeight: "600" }}>
                                  {expenseLabel}
                                </span>
                              </div>
                            )}
                            {it.remarks && (
                              <div style={{ fontSize: "0.78rem", color: "#64748b", fontStyle: "italic", marginTop: "0.15rem" }}>
                                ផ្សេងៗ ៖ {it.remarks}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "0.2rem 0.6rem",
                                borderRadius: "6px",
                                fontWeight: "700",
                                fontSize: "0.85rem",
                              }}
                            >
                              {toKhmerDigits(it.item_qty)} {it.item_unit}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "600", color: "#059669" }}>
                            {usd > 0 ? `${toKhmerDigits(usd)} $` : "-"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "600", color: "#2563eb" }}>
                            {khr > 0 ? `${toKhmerDigits(khr)} ៛` : "-"}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "#334155", whiteSpace: "pre-line" }}>
                            {it.usage_description || "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                              <button
                                type="button"
                                className="btn-icon text-primary"
                                onClick={() => handleOpenEditItemModal(idx)}
                                title="កែប្រែមុខសម្ភារនេះ"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  background: "#eff6ff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <LuPencil size={14} color="#2563eb" />
                              </button>
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr style={{ background: "#ffedd5", fontWeight: "700" }}>
                        <td colSpan={3} style={{ textAlign: "center", color: "#9a3412", padding: "0.6rem" }}>
                          សរុបរួមមុខសម្ភារ ({toKhmerDigits(items.length)} មុខ)
                        </td>
                        <td style={{ textAlign: "right", color: "#059669", padding: "0.6rem" }}>
                          {summaryTotals.usd > 0 ? `${toKhmerDigits(summaryTotals.usd)} $` : "0 $"}
                        </td>
                        <td style={{ textAlign: "right", color: "#2563eb", padding: "0.6rem" }}>
                          {summaryTotals.khr > 0 ? `${toKhmerDigits(summaryTotals.khr)} ៛` : "0 ៛"}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            {error && (
              <div
                style={{
                  marginRight: "auto",
                  color: "#b91c1c",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  textAlign: "left",
                }}
              >
                {error}
              </div>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => navigate(backUrl)} disabled={saving}>
              បោះបង់
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600", padding: "0.6rem 1.5rem" }}
            >
              <LuSave size={16} />
              <span>{saving ? "កំពុងរក្សាទុក..." : isEdit ? "រក្សាទុកការកែប្រែ" : "រក្សាទុក"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Material Item Modal Component */}
      <SponsorshipItemModal
        open={itemModalOpen}
        onClose={handleCloseItemModal}
        onSave={handleSaveItemFromModal}
        initialData={editingItemIndex !== null ? items[editingItemIndex] : null}
        editingIndex={editingItemIndex}
        materialOptions={materialOptions}
        defaultUsageDescription={form.usage_description}
      />
    </div>
  );
}

export default function SponsorshipFormPage() {
  return (
    <SponsorshipProvider>
      <SponsorshipFormContent />
    </SponsorshipProvider>
  );
}
