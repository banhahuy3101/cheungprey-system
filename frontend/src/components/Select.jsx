import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Children,
} from "react";
import { createPortal } from "react-dom";
import { LuChevronDown, LuCheck } from "react-icons/lu";

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 260;

function parseOptions(children) {
  const opts = [];
  Children.forEach(children, (child) => {
    if (child?.type === "option") {
      const raw = child.props.children;
      const label =
        typeof raw === "string" || typeof raw === "number"
          ? String(raw)
          : Array.isArray(raw)
            ? raw.map(String).join("")
            : String(child.props.value ?? "");
      opts.push({
        value: String(child.props.value ?? ""),
        label,
        disabled: !!child.props.disabled,
      });
    }
  });
  return opts;
}

export default function Select({
  value = "",
  onChange,
  name,
  disabled = false,
  className = "",
  id,
  options: optionsProp,
  children,
  placeholder = "-- ជ្រើសរើស --",
}) {
  const options = useMemo(() => {
    if (optionsProp) {
      return optionsProp.map((o) => ({
        value: String(o.value ?? ""),
        label: o.label ?? String(o.value ?? ""),
        disabled: !!o.disabled,
      }));
    }
    return parseOptions(children);
  }, [optionsProp, children]);

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const stringValue = String(value ?? "");
  const selectedOption = options.find((o) => o.value === stringValue);
  const displayLabel = selectedOption?.label ?? placeholder;
  const isPlaceholder = !selectedOption;

  const enabledOptions = options.filter((o) => !o.disabled);

  const fireChange = useCallback(
    (newValue) => {
      onChange?.({ target: { name, value: newValue } });
    },
    [onChange, name],
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, []);

  const selectOption = useCallback(
    (opt) => {
      if (!opt || opt.disabled) return;
      fireChange(opt.value);
      close();
    },
    [fireChange, close],
  );

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      MENU_MAX_HEIGHT,
      openUp ? spaceAbove : spaceBelow,
    );

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - maxHeight - MENU_GAP : rect.bottom + MENU_GAP,
      maxHeight: Math.max(maxHeight, 120),
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    const selectedIndex = options.findIndex(
      (o) => o.value === stringValue && !o.disabled,
    );
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, options, stringValue, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (
        rootRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const moveHighlight = (direction) => {
    if (!enabledOptions.length) return;

    const currentOpt = options[highlightIndex];
    let idx = currentOpt
      ? enabledOptions.findIndex((o) => o.value === currentOpt.value)
      : -1;

    if (idx < 0) idx = direction > 0 ? -1 : enabledOptions.length;

    idx = (idx + direction + enabledOptions.length) % enabledOptions.length;
    const next = enabledOptions[idx];
    const nextIndex = options.findIndex((o) => o.value === next.value);
    setHighlightIndex(nextIndex);

    menuRef.current
      ?.querySelector(`[data-index="${nextIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) {
          selectOption(options[highlightIndex]);
        } else {
          setOpen(true);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else moveHighlight(-1);
        break;
      case "Home":
        e.preventDefault();
        if (open && enabledOptions.length) {
          const idx = options.findIndex(
            (o) => o.value === enabledOptions[0].value,
          );
          setHighlightIndex(idx);
        }
        break;
      case "End":
        e.preventDefault();
        if (open && enabledOptions.length) {
          const last = enabledOptions[enabledOptions.length - 1];
          setHighlightIndex(options.findIndex((o) => o.value === last.value));
        }
        break;
      default:
        break;
    }
  };

  const menu =
    open && menuStyle
      ? createPortal(
          <ul
            ref={menuRef}
            className="custom-select-menu"
            role="listbox"
            id={id ? `${id}-listbox` : undefined}
            style={menuStyle}
          >
            {options.map((opt, index) => {
              const isSelected = opt.value === stringValue;
              const isHighlighted = index === highlightIndex;
              return (
                <li
                  key={`${opt.value}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  className={[
                    "custom-select-option",
                    isSelected && "is-selected",
                    isHighlighted && "is-highlighted",
                    opt.disabled && "is-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => !opt.disabled && setHighlightIndex(index)}
                  onClick={() => selectOption(opt)}
                >
                  <span className="custom-select-option-label">{opt.label}</span>
                  {isSelected && (
                    <LuCheck className="custom-select-option-check" aria-hidden />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={[
        "custom-select",
        open && "is-open",
        disabled && "is-disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        <span
          className={[
            "custom-select-value",
            isPlaceholder && "is-placeholder",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {displayLabel}
        </span>
        <LuChevronDown className="custom-select-chevron" aria-hidden />
      </button>
      {menu}
    </div>
  );
}
