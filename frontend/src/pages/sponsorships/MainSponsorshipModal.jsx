import { useState } from "react";
import { LuX, LuSave, LuCalendar } from "react-icons/lu";
import { toKhmerDigits } from "../../utils/khmerNumberSpelling";

export default function MainSponsorshipModal({ isOpen, onClose, onCreated }) {
  const currentYear = new Date().getFullYear();
  const [selectedPeriod, setSelectedPeriod] = useState("ខែមករា");
  const [year, setYear] = useState(String(currentYear));

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
    if (selectedPeriod.startsWith("ឆមាស") || selectedPeriod.startsWith("ត្រីមាស") || selectedPeriod.includes("៩ខែ")) {
      return "semester";
    }
    return "month";
  };

  const generateFullUUID = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const periodName = getComputedPeriodName();

    const newMainSponsor = {
      id: generateFullUUID(),
      name: periodName,
      period_type: getPeriodType(),
      year: year,
      created_at: new Date().toISOString(),
    };

    onCreated(newMainSponsor);
    onClose();
  };

  return (
    <div className="sponsorship-modal-backdrop" onClick={onClose}>
      <div
        className="sponsorship-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px" }}
      >
        {/* Header */}
        <div className="sponsorship-modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#1e3a8a" }}>
              បង្កើតតារាងឧបត្ថម្ភមេ (Create Main Sponsor)
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              ជ្រើសរើសកាលបរិច្ឆេទ និងឆ្នាំប្រតិបត្តិការ
            </span>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="sponsorship-modal-body" style={{ gap: "1.15rem" }}>
            {/* 1. Period Dropdown */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>
                ១. កាលបរិច្ឆេទ (Period) <span style={{ color: "red" }}>*</span>
              </label>
              <select
                className="form-control"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{ fontWeight: "600", fontSize: "0.95rem" }}
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
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>
                ២. ឆ្នាំប្រតិបត្តិការ (Year: 2015 - 2050) <span style={{ color: "red" }}>*</span>
              </label>
              <select
                className="form-control"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{ fontWeight: "600", fontSize: "0.95rem" }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} (ឆ្នាំ {toKhmerDigits(y)})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Computed Preview Card */}
            <div
              style={{
                padding: "0.85rem 1rem",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <LuCalendar size={20} color="#16a34a" />
              <div>
                <span style={{ fontSize: "0.75rem", color: "#166534", display: "block" }}>
                  ឈ្មោះតារាងឧបត្ថម្ភមេដែលនឹងបង្កើត ៖
                </span>
                <strong style={{ color: "#14532d", fontSize: "1.05rem" }}>
                  {getComputedPeriodName()}
                </strong>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sponsorship-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              បោះបង់
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
            >
              <LuSave size={16} />
              <span>បង្កើតតារាងមេ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
