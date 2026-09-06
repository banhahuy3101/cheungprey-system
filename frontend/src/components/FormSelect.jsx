import { forwardRef, useId } from "react";

/**
 * Reusable Form Select Component
 * Standard styled select dropdown for forms across the application.
 */
const FormSelect = forwardRef(function FormSelect(
  {
    id,
    label,
    value,
    onChange,
    options = [],
    placeholder,
    required = false,
    disabled = false,
    helper,
    icon,
    className = "",
    style = {},
    selectStyle = {},
    children,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`form-group ${className}`} style={{ margin: 0, ...style }}>
      {label && (
        <label
          htmlFor={selectId}
          className="form-label"
          style={{
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.88rem",
            marginBottom: "0.35rem",
          }}
        >
          {icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>}
          <span>{label}</span>
          {required && <span style={{ color: "red" }}>*</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        className="form-control"
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        style={{ fontWeight: "600", ...selectStyle }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children
          ? children
          : options.map((opt) => {
              const isObj = typeof opt === "object" && opt !== null;
              const val = isObj ? opt.value : opt;
              const lbl = isObj ? opt.label : opt;
              const isOptDisabled = isObj ? !!opt.disabled : false;
              return (
                <option key={val} value={val} disabled={isOptDisabled}>
                  {lbl}
                </option>
              );
            })}
      </select>

      {helper && <div className="form-help-text" style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>{helper}</div>}
    </div>
  );
});

export default FormSelect;
