import { BookOpen, RefreshCw } from "lucide-react";
import type { MissingInstitutionKind } from "../../utils/whatsapp";

interface Option {
  id: number;
  name: string;
}

interface InstitutionFieldProps {
  /** Unique id prefix for label/status wiring. */
  id: string;
  kind: MissingInstitutionKind;
  /** Visible label, e.g. "University". */
  label: string;
  value: number | null;
  options: Option[];
  onChange: (id: number | null) => void;
  /** First (empty) option text while the field is usable. */
  placeholder: string;
  /**
   * Where the list is at:
   *  - "idle": nothing to load yet (the parent isn't chosen / confirmed)
   *  - "loading": first request in flight
   *  - "error": the request failed (an earlier list may still be shown)
   *  - "ready": the request succeeded — an empty list here means "none listed"
   */
  state: "idle" | "loading" | "error" | "ready";
  /** First (empty) option text while `state` is "idle". */
  idlePlaceholder: string;
  /** A (re)fetch is running — disables Refresh and shows "Checking…". */
  isFetching: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  /** Opens the "can't find it" WhatsApp dialog. */
  onNeedHelp: () => void;
  /** Name the student asked support to add (to say when it shows up). */
  requestedName?: string | null;
  /** Shown when the request succeeded but the list is empty. */
  emptyMessage: string;
  /** Shown in place of the list while it loads/fails, e.g. "universities". */
  noun: string;
}

const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * One institution selector: the normal <select>, honest loading / failed /
 * empty states, and — always, whether or not the list has entries — a
 * "Can't find your …?" help link and a way to re-check the list.
 */
export const InstitutionField = ({
  id,
  kind,
  label,
  value,
  options,
  onChange,
  placeholder,
  state,
  idlePlaceholder,
  isFetching,
  onRetry,
  onRefresh,
  onNeedHelp,
  requestedName = null,
  emptyMessage,
  noun,
}: InstitutionFieldProps) => {
  const statusId = `${id}-status`;
  const selectId = `${id}-select`;
  const idle = state === "idle";
  const loading = state === "loading";
  const showEmpty = state === "ready" && options.length === 0;
  const requested = requestedName ? normalize(requestedName) : null;
  const nowListed =
    requested !== null && options.some((o) => normalize(o.name) === requested);

  return (
    <div>
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {label} *
      </label>
      <div className="relative">
        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <select
          id={selectId}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={idle || loading}
          aria-describedby={statusId}
          className="w-full min-w-0 pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent appearance-none disabled:opacity-50 disabled:cursor-not-allowed text-ellipsis"
        >
          <option value="">
            {idle
              ? idlePlaceholder
              : loading
              ? `Loading ${noun}…`
              : placeholder}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div id={statusId} className="mt-2 space-y-2 text-sm">
        {loading && (
          <p role="status" className="text-gray-500 dark:text-gray-400">
            Loading {noun}…
          </p>
        )}

        {state === "error" && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            We couldn't load the list of {noun}. Check your connection, then{" "}
            <button
              type="button"
              onClick={onRetry}
              className="bg-transparent p-0 font-semibold underline underline-offset-2 hover:text-red-700"
            >
              Retry
            </button>
            .
          </p>
        )}

        {showEmpty && (
          <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        )}

        {requestedName && (
          <p role="status" className="text-gray-600 dark:text-gray-400">
            {nowListed
              ? `“${requestedName}” is now in the list — select it above.`
              : `You asked support to add “${requestedName}”. It isn't in the list yet.`}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={onNeedHelp}
            className="min-h-9 bg-transparent p-0 font-semibold text-azure-500 hover:text-azure-600 underline underline-offset-2"
          >
            Can't find your {kind}?
          </button>
          {!idle && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isFetching}
              className="inline-flex min-h-9 items-center gap-1.5 bg-transparent p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden
              />
              {isFetching
                ? "Checking…"
                : requestedName
                ? "I've contacted support — check again"
                : "Refresh list"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
