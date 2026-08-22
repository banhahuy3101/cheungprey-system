import { useId } from "react";
import Select from "./Select";

export default function FormDropdown({
  id,
  label,
  required,
  helper,
  status,
  compact = false,
  className = "",
  fieldClassName = "",
  leadIcon,
  tailIcon,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const classes = [
    "app-form-dropdown",
    compact ? "app-form-dropdown-compact" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={["app-form-field", fieldClassName].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={selectId} className="app-form-label">
          {label}
          {required && <span className="app-form-required">*</span>}
        </label>
      )}
      <Select
        id={selectId}
        className={classes}
        leadIcon={leadIcon}
        tailIcon={tailIcon}
        {...props}
      />
      {helper && <div className="app-form-help-text">{helper}</div>}
      {status}
    </div>
  );
}
