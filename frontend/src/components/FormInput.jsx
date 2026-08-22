import { forwardRef, useId } from "react";

const FormInput = forwardRef(function FormInput(
  {
    id,
    label,
    required,
    helper,
    status,
    textarea = false,
    mono = false,
    compact = false,
    className = "",
    fieldClassName = "",
    leadIcon,
    tailIcon,
    rightAction,
    type = "text",
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const Control = textarea ? "textarea" : "input";
  const controlProps = textarea ? props : { type, ...props };
  const classes = [
    "app-form-input",
    mono ? "app-form-input-mono" : "",
    compact ? "app-form-input-compact" : "",
    textarea ? "app-form-textarea" : "",
    leadIcon ? "has-lead-icon" : "",
    tailIcon ? "has-tail-icon" : "",
    className,
  ].filter(Boolean).join(" ");
  const action = rightAction || tailIcon;
  const control = (
    <div className="app-form-control-wrap">
      {leadIcon && <span className="app-form-icon is-leading">{leadIcon}</span>}
      <Control ref={ref} id={inputId} className={classes} required={required} {...controlProps} />
      {tailIcon && <span className="app-form-icon is-trailing">{tailIcon}</span>}
    </div>
  );

  return (
    <div className={["app-form-field", fieldClassName].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={inputId} className="app-form-label">
          {label}
          {required && <span className="app-form-required">*</span>}
        </label>
      )}
      {action && rightAction ? (
        <div className="app-form-control-row">
          {control}
          {action}
        </div>
      ) : (
        control
      )}
      {helper && <div className="app-form-help-text">{helper}</div>}
      {status}
    </div>
  );
});

export default FormInput;
