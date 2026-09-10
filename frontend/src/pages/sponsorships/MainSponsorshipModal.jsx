import { useState } from "react";
import { LuX, LuSave, LuCalendar } from "react-icons/lu";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";
import { useSponsorships } from "../../context/SponsorshipContext";

export default function MainSponsorshipModal({ isOpen, onClose, onCreated }) {
  const { createPeriod } = useSponsorships();
  const currentYear = new Date().getFullYear();
  const [selectedPeriod, setSelectedPeriod] = useState("ខែមករា");
  const [year, setYear] = useState(String(currentYear));
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Years from 2015 to 2050
  const years = Array.from({ length: 2050 - 2015 + 1 }, (_, i) => String(2015 + i));

  const getComputedPeriodName = () => {
    if (selectedPeriod === "ប្រចាំឆ្នាំ") {
      return `ប្រចាំឆ្នាំ ${year}`;
    }
    return `${selectedPeriod} ឆ្នាំ${year}`;
  };

  const getPeriodType = () => {
    if (selectedPeriod === "ប្រចាំឆ្នាំ") return "year";
    if (
      selectedPeriod.startsWith("ឆមាស") ||
      selectedPeriod.startsWith("ត្រីមាស") ||
      selectedPeriod.includes("៩ខែ")
    ) {
      return "semester";
    }
    return "month";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const periodName = getComputedPeriodName();
    const periodType = getPeriodType();

    try {
      setLoading(true);
      const created = await createPeriod({
        period_name: periodName,
        fiscal_year: Number(year) || currentYear,
        period_type: periodType,
        remarks: remarks,
        status: "draft",
      });

      if (onCreated) {
        onCreated(created);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create period:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <LuCalendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                បង្កើតតារាងឧបត្ថម្ភមេ
              </h3>
              <span className="text-xs text-slate-500">
                ជ្រើសរើសកាលបរិច្ឆេទ និងឆ្នាំប្រតិបត្តិការ
              </span>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="បិទ"
          >
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* 1. Period Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              ១. កាលបរិច្ឆេទ (Period) <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <optgroup label="── ប្រចាំខែ (Month) ──">
                <option value="ខែមករា">ខែមករា (January)</option>
                <option value="ខែកុម្ភៈ">ខែកុម្ភៈ (February)</option>
                <option value="ខែមីនា">ខែមីនា (March)</option>
                <option value="ខែមេសា">ខែមេសា (April)</option>
                <option value="ខែឧសភា">ខែឧសភា (May)</option>
                <option value="ខែមិថុនា">ខែមិថុនា (June)</option>
                <option value="ខែកក្កដា">ខែកក្កដា (July)</option>
                <option value="ខែសីហា">ខែសីហា (August)</option>
                <option value="ខែកញ្ញា">ខែកញ្ញា (September)</option>
                <option value="ខែតុលា">ខែតុលា (October)</option>
                <option value="ខែវិច្ឆិកា">ខែវិច្ឆិកា (November)</option>
                <option value="ខែធ្នូ">ខែធ្នូ (December)</option>
              </optgroup>

              <optgroup label="── ឆមាស / ត្រីមាស (Semester / Quarter) ──">
                <option value="ឆមាសទី១">ឆមាសទី១ (Semester 1)</option>
                <option value="ឆមាសទី២">ឆមាសទី២ (Semester 2)</option>
                <option value="សរុប ៩ខែ">សរុប ៩ខែ (9 Months Total)</option>
                <option value="ត្រីមាសទី១">ត្រីមាសទី១ (Quarter 1)</option>
                <option value="ត្រីមាសទី២">ត្រីមាសទី២ (Quarter 2)</option>
                <option value="ត្រីមាសទី៣">ត្រីមាសទី៣ (Quarter 3)</option>
                <option value="ត្រីមាសទី៤">ត្រីមាសទី៤ (Quarter 4)</option>
              </optgroup>

              <optgroup label="── ប្រចាំឆ្នាំ (Year) ──">
                <option value="ប្រចាំឆ្នាំ">ប្រចាំឆ្នាំ (Full Year)</option>
              </optgroup>
            </select>
          </div>

          {/* 2. Year Dropdown (2015 to 2050) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              ២. ឆ្នាំប្រតិបត្តិការ (Fiscal Year: 2015 - 2050) <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} (ឆ្នាំ {toKhmerDigits(y, false)})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Remarks (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              ៣. ចំណាំបន្ថែម (Remarks)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              placeholder="ចំណាំ..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Live Computed Preview Card */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <LuCalendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-emerald-700 font-medium block">
                ឈ្មោះតារាងឧបត្ថម្ភមេដែលនឹងបង្កើត ៖
              </span>
              <strong className="text-sm font-bold text-emerald-950">
                {getComputedPeriodName()}
              </strong>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-1.5 font-semibold"
              disabled={loading}
            >
              <LuSave size={16} />
              <span>{loading ? "កំពុងបង្កើត..." : "បង្កើតតារាងមេ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
