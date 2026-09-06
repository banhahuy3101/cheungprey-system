import { useMemo } from "react";
import { normalizeKhmerDigits, parseNumericInput } from "../utils/sponsorshipUtils";
import { toKhmerDigits, numberToKhmerWords } from "../utils/khmerNumberSpelling";

/**
 * Reusable Currency Input Component
 * Automatically handles Khmer digit normalization, currency symbol adornment,
 * and live formal Khmer word spell-out (e.g. 10,000 $ -> មួយម៉ឺន ដុល្លារ).
 *
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string|number} props.value - Controlled input value
 * @param {function} props.onChange - (val: string) => void or standard change event handler
 * @param {'USD'|'KHR'} props.currency - Currency code (default: 'USD')
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Mandatory field flag
 * @param {boolean} props.spellOut - Whether to show live spelled-out Khmer text (default: true)
 * @param {string} props.accentColor - Custom accent color (e.g. '#059669', '#2563eb')
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Custom CSS class
 */
export default function CurrencyInput({
  label,
  value = "",
  onChange,
  currency = "USD",
  placeholder = "0",
  required = false,
  spellOut = true,
  accentColor,
  disabled = false,
  className = "",
  id,
}) {
  const isUSD = currency === "USD";
  const defaultColor = isUSD ? "#059669" : "#2563eb";
  const color = accentColor || defaultColor;
  const symbol = isUSD ? "$" : "៛";

  const parsedValue = useMemo(() => {
    return parseNumericInput(value, !isUSD);
  }, [value, isUSD]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    const normalized = normalizeKhmerDigits(rawVal);
    if (typeof onChange === "function") {
      onChange(normalized, e);
    }
  };

  return (
    <div className={`form-group ${className}`} style={{ margin: 0 }}>
      {label && (
        <label
          htmlFor={id}
          className="form-label"
          style={{
            fontWeight: "600",
            color: color,
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.88rem",
            marginBottom: "0.35rem",
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: "red" }}>*</span>}
        </label>
      )}

      <div style={{ position: "relative" }}>
        <input
          id={id}
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          style={{
            fontWeight: "700",
            color: color,
            paddingRight: "32px",
            borderColor: value ? color : undefined,
          }}
        />
        <span
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: color,
            fontWeight: "700",
            fontSize: "1rem",
            pointerEvents: "none",
          }}
        >
          {symbol}
        </span>
      </div>

      {spellOut && parsedValue > 0 && (
        <div
          style={{
            fontSize: "0.78rem",
            color: color,
            marginTop: "0.25rem",
            fontWeight: "500",
            lineHeight: 1.3,
          }}
        >
          = {toKhmerDigits(parsedValue)} {symbol} ({numberToKhmerWords(parsedValue, currency)})
        </div>
      )}
    </div>
  );
}
