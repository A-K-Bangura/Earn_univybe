import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { BottomSheet } from "../common/BottomSheet";

interface DiscoveryToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchPlaceholder: string;
  searchLabel: string;
  /** Filters shown openly on desktop. */
  primary: ReactNode;
  /** Deeper filters, behind "More filters" on desktop. */
  secondary?: ReactNode;
  /** Open "More filters" initially (e.g. when a deep filter is already set). */
  secondaryDefaultOpen?: boolean;
  /** How many filters differ from the defaults (badge on the mobile trigger). */
  activeCount: number;
  onReset: () => void;
  sheetTitle: string;
}

/**
 * The search + filter card for the discovery pages. Desktop: a large search
 * field, the primary filters inline, deeper ones behind "More filters".
 * Mobile: just the search field and a Filters button that opens the whole form
 * in a bottom sheet (never a stack of dropdowns).
 *
 * Filters apply as they change; the sheet's button only closes it.
 */
export const DiscoveryToolbar = ({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  searchLabel,
  primary,
  secondary,
  secondaryDefaultOpen = false,
  activeCount,
  onReset,
  sheetTitle,
}: DiscoveryToolbarProps) => {
  const [moreOpen, setMoreOpen] = useState(secondaryDefaultOpen);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <section
      aria-label="Search and filters"
      className="mb-8 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <form onSubmit={handleSubmit} role="search" className="flex gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-azure-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-azure-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:bg-gray-700"
          />
        </div>
        <button
          type="submit"
          className="hidden shrink-0 rounded-xl bg-azure-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-azure-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 md:inline-flex"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="relative inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 md:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-azure-500 px-1 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </form>

      {/* Desktop filters */}
      <div className="mt-4 hidden md:block">
        <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">{primary}</div>

        {secondary && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                className="inline-flex items-center gap-1.5 rounded-lg bg-transparent px-1 py-1 text-sm font-semibold text-azure-500 transition-colors hover:text-azure-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500"
              >
                {moreOpen ? "Fewer filters" : "More filters"}
                <ChevronDown
                  aria-hidden
                  className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Reset
                </button>
              )}
            </div>
            {moreOpen && (
              <div className="mt-4 grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">{secondary}</div>
            )}
          </>
        )}
        {!secondary && activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        )}
      </div>

      {/* Mobile filters */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="flex-[2] rounded-xl bg-azure-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-azure-600"
            >
              Show results
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {primary}
          {secondary}
        </div>
      </BottomSheet>
    </section>
  );
};
