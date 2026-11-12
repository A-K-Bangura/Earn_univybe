interface SegmentedToggleOption {
  value: string;
  label: string;
}

interface SegmentedToggleProps {
  options: readonly [SegmentedToggleOption, SegmentedToggleOption];
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
}

/** Two-option pill switch — Opportunities' Open/Past, Gigs' Open/Closed. */
export const SegmentedToggle = ({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedToggleProps) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40"
  >
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
            selected
              ? "bg-white text-azure-600 shadow-sm dark:bg-gray-700 dark:text-azure-400"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
