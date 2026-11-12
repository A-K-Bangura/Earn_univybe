import { useRef, type KeyboardEvent } from "react";
import type { CertificateFormat } from "../../types/certificate";
import { FORMAT_LABELS } from "../../utils/certificates/data";

const OPTIONS: CertificateFormat[] = ["landscape", "story"];

interface FormatToggleProps {
  value: CertificateFormat;
  onChange: (format: CertificateFormat) => void;
}

/**
 * Certificate / Story card selector. A radio group with a roving tabindex and
 * arrow-key support, and 44px tap targets (the shared SegmentedToggle is
 * smaller than that).
 */
export const FormatToggle = ({ value, onChange }: FormatToggleProps) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Certificate format"
      className="grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40"
    >
      {OPTIONS.map((option, index) => {
        const selected = option === value;
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-500 ${
              selected
                ? "bg-white text-azure-600 shadow-sm dark:bg-gray-700 dark:text-azure-400"
                : "bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {FORMAT_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
};
