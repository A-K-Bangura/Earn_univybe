import { Star } from "lucide-react";

interface RatingStarsProps {
  value: number | null;
  /** Omit for a read-only display (e.g. showing an existing rating). */
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  label?: string;
}

/** Accessible 1-5 star rating input (radiogroup) or read-only display when `onChange` is omitted. */
export const RatingStars = ({ value, onChange, size = "md", label = "Rating" }: RatingStarsProps) => {
  const readOnly = !onChange;
  const starSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  const moveFocus = (current: number, delta: number) => {
    if (!onChange) return;
    const next = Math.min(5, Math.max(1, (current || 1) + delta));
    onChange(next);
  };

  if (readOnly) {
    return (
      <div role="img" aria-label={`${value ?? 0} out of 5 stars`} className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            aria-hidden
            className={`${starSize} ${
              value !== null && star <= value
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(value ?? 0, 1);
            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(value ?? 0, -1);
            }
          }}
          className="rounded p-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500"
        >
          <Star
            aria-hidden
            className={`${starSize} transition-colors ${
              value !== null && star <= value
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200 hover:fill-amber-200 hover:text-amber-200 dark:fill-gray-600 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
};
