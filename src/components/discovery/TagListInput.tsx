import { useId, useState } from "react";
import { X } from "lucide-react";

interface TagListInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  max?: number;
}

/**
 * Free-text add/remove chip input for AND-semantics multi-value filters
 * (opportunity tags, gig skills/tags — "all given values must match").
 * Generalizes the add/remove-chip interaction already used by `Profile.tsx`'s
 * Interests editor.
 */
export const TagListInput = ({
  label,
  values,
  onChange,
  placeholder,
  max,
}: TagListInputProps) => {
  const id = useId();
  const [input, setInput] = useState("");

  const atLimit = max !== undefined && values.length >= max;

  const addValue = () => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || atLimit || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput("");
  };

  const removeValue = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400"
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addValue();
            }
          }}
          placeholder={atLimit ? `Up to ${max}` : placeholder}
          disabled={atLimit}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500"
        />
        <button
          type="button"
          onClick={addValue}
          disabled={!input.trim() || atLimit}
          className="shrink-0 rounded-xl border border-gray-200 px-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-azure-50 px-2.5 py-1 text-xs font-medium text-azure-700 dark:bg-azure-900/20 dark:text-azure-300"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                aria-label={`Remove ${value}`}
                className="hover:text-azure-900 dark:hover:text-azure-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
