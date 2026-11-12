import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FilterOption } from "./FilterSelect";

interface FilterMultiSelectProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  options: FilterOption[];
  /** Shown on the trigger when nothing is selected. */
  placeholder: string;
}

/**
 * A `FilterSelect`-styled trigger that opens a checkbox popover — for
 * filters where several values match any of them (e.g. opportunity type,
 * gig category/pricing/work-mode). One component covers all of these rather
 * than inventing a second shape for the smaller (2-3 option) vocabularies.
 */
export const FilterMultiSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}: FilterMultiSelectProps) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggleValue = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    );
  };

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? placeholder
        : `${value.length} selected`;

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-3 text-left text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500"
      >
        <span className={value.length === 0 ? "text-gray-400 dark:text-gray-500" : ""}>
          {triggerLabel}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="h-4 w-4 rounded border-gray-300 text-azure-500 focus:ring-azure-500/30 dark:border-gray-500"
                />
                {option.label}
              </label>
            );
          })}
          {options.length === 0 && (
            <p className="px-2.5 py-2 text-sm text-gray-400 dark:text-gray-500">
              No options available
            </p>
          )}
        </div>
      )}
    </div>
  );
};
