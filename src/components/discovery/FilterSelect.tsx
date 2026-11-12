import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Label of the empty ("no filter") option. */
  placeholder: string;
  disabled?: boolean;
  /** Short hint shown in place of the placeholder when disabled. */
  disabledHint?: string;
}

const fieldClass =
  "w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500";

/** A labelled native `<select>` with the discovery pages' lighter styling. */
export const FilterSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  disabledHint,
}: FilterSelectProps) => {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={fieldClass}
        >
          <option value="">
            {disabled && disabledHint ? disabledHint : placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        />
      </div>
    </div>
  );
};

/** Pill-style on/off control for single boolean filters ("My roadmaps"). */
export const FilterToggle = ({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
}) => (
  <div className="flex items-end">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 ${
        checked
          ? "border-azure-500 bg-azure-500 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  </div>
);
