import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { EmptyState } from "../components/common/EmptyState";
import { DiscoveryToolbar } from "../components/discovery/DiscoveryToolbar";
import { FilterSelect } from "../components/discovery/FilterSelect";
import { FilterMultiSelect } from "../components/discovery/FilterMultiSelect";
import { TagListInput } from "../components/discovery/TagListInput";
import { SegmentedToggle } from "../components/discovery/SegmentedToggle";
import { OpportunityCard } from "../components/opportunities/OpportunityCard";
import { getOpportunities, getOpportunityVocabulary } from "../services/opportunities";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;

const HAS_DEADLINE_OPTIONS = [
  { value: "1", label: "Has a deadline" },
  { value: "0", label: "No deadline" },
];

const OPEN_PAST_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "past", label: "Past" },
] as const;

interface FilterState {
  search: string;
  type: string[];
  location: string;
  tags: string[];
  deadline_from: string;
  deadline_to: string;
  has_deadline: string;
  view: "open" | "past";
  page: number;
}

const paramsToFilters = (params: URLSearchParams): FilterState => ({
  search: params.get("search") ?? "",
  type: params.getAll("type"),
  location: params.get("location") ?? "",
  tags: params.getAll("tags"),
  deadline_from: params.get("deadline_from") ?? "",
  deadline_to: params.get("deadline_to") ?? "",
  has_deadline: params.get("has_deadline") ?? "",
  view: params.get("view") === "past" ? "past" : "open",
  page: Number(params.get("page")) || 1,
});

const filtersToParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  filters.type.forEach((t) => params.append("type", t));
  if (filters.location) params.set("location", filters.location);
  filters.tags.forEach((t) => params.append("tags", t));
  if (filters.deadline_from) params.set("deadline_from", filters.deadline_from);
  if (filters.deadline_to) params.set("deadline_to", filters.deadline_to);
  if (filters.has_deadline) params.set("has_deadline", filters.has_deadline);
  if (filters.view === "past") params.set("view", "past");
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
};

export const Opportunities = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const listTopRef = useRef<HTMLDivElement>(null);
  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(filters.search);

  const update = (patch: Partial<FilterState>) => {
    setSearchParams(filtersToParams({ ...filters, ...patch, page: 1 }), { replace: true });
  };

  // Debounced search (300ms per the guide), reset to page 1 on change.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) update({ search: searchInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { data: vocab } = useQuery({
    queryKey: ["opportunity-vocabulary"],
    queryFn: getOpportunityVocabulary,
    staleTime: 60 * 60 * 1000,
  });

  const apiFilters = {
    search: filters.search,
    type: filters.type.length > 0 ? filters.type : undefined,
    location: filters.location || undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    deadline_from: filters.deadline_from || undefined,
    deadline_to: filters.deadline_to || undefined,
    has_deadline:
      filters.has_deadline === "1" ? true : filters.has_deadline === "0" ? false : undefined,
    page: filters.page,
    per_page: PAGE_SIZE,
  };

  const listQuery = useQuery({
    queryKey: ["opportunities", "list", apiFilters, filters.view === "past"],
    queryFn: () => getOpportunities(apiFilters, filters.view === "past"),
    placeholderData: keepPreviousData,
  });

  const opportunities = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const activeCount = [
    filters.search.trim(),
    filters.type.length > 0,
    filters.location.trim(),
    filters.tags.length > 0,
    filters.deadline_from,
    filters.deadline_to,
    filters.has_deadline,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchInput("");
    setSearchParams(filtersToParams({ ...filters, search: "", type: [], location: "", tags: [], deadline_from: "", deadline_to: "", has_deadline: "", page: 1 }), { replace: true });
  };

  const goToPage = (page: number) => {
    setSearchParams(filtersToParams({ ...filters, page }), { replace: true });
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chips = useMemo(() => {
    const list: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (filters.search.trim())
      list.push({
        key: "search",
        label: `"${filters.search.trim()}"`,
        onRemove: () => {
          setSearchInput("");
          update({ search: "" });
        },
      });
    filters.type.forEach((type) => {
      const label = vocab?.opportunity_types.find((t) => t.value === type)?.label ?? type;
      list.push({
        key: `type-${type}`,
        label,
        onRemove: () => update({ type: filters.type.filter((t) => t !== type) }),
      });
    });
    if (filters.location.trim())
      list.push({ key: "location", label: filters.location, onRemove: () => update({ location: "" }) });
    filters.tags.forEach((tag) =>
      list.push({ key: `tag-${tag}`, label: tag, onRemove: () => update({ tags: filters.tags.filter((t) => t !== tag) }) })
    );
    if (filters.has_deadline)
      list.push({
        key: "has_deadline",
        label: HAS_DEADLINE_OPTIONS.find((o) => o.value === filters.has_deadline)?.label ?? "",
        onRemove: () => update({ has_deadline: "" }),
      });
    if (filters.deadline_from || filters.deadline_to)
      list.push({
        key: "deadline-range",
        label: `Deadline ${filters.deadline_from || "…"} – ${filters.deadline_to || "…"}`,
        onRemove: () => update({ deadline_from: "", deadline_to: "" }),
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, vocab]);

  const primary = (
    <FilterMultiSelect
      label="Opportunity type"
      value={filters.type}
      onChange={(value) => update({ type: value })}
      options={vocab?.opportunity_types ?? []}
      placeholder="All types"
    />
  );

  const secondary = (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
          Location
        </label>
        <input
          type="text"
          value={filters.location}
          onChange={(event) => update({ location: event.target.value })}
          placeholder="e.g. Freetown, Remote"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 transition-colors hover:border-gray-300 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500"
        />
      </div>
      <TagListInput
        label="Tags"
        values={filters.tags}
        onChange={(value) => update({ tags: value })}
        placeholder="e.g. stem, women"
        max={vocab?.max_tags}
      />
      <FilterSelect
        label="Deadline"
        value={filters.has_deadline}
        onChange={(value) => update({ has_deadline: value })}
        options={HAS_DEADLINE_OPTIONS}
        placeholder="Any"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
            From
          </label>
          <input
            type="date"
            value={filters.deadline_from}
            onChange={(event) => update({ deadline_from: event.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
            To
          </label>
          <input
            type="date"
            value={filters.deadline_to}
            onChange={(event) => update({ deadline_to: event.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>
    </>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <SegmentedToggle
          options={OPEN_PAST_OPTIONS}
          value={filters.view}
          onChange={(value) => update({ view: value as "open" | "past" })}
          aria-label="Open or past opportunities"
        />
      </div>

      <DiscoveryToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => update({ search: searchInput })}
        searchPlaceholder="Search scholarships, internships, programs…"
        searchLabel="Search opportunities"
        primary={primary}
        secondary={secondary}
        activeCount={activeCount}
        onReset={resetFilters}
        sheetTitle="Filter opportunities"
      />

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-violet-900 px-3 py-1.5 text-sm font-medium text-blue-violet-500 transition-colors hover:bg-blue-violet-800 dark:bg-blue-violet-100 dark:text-blue-violet-700"
            >
              {chip.label}
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear all
          </button>
        </div>
      )}

      {meta && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {meta.total} opportunit{meta.total === 1 ? "y" : "ies"} found · Newest published first
        </p>
      )}

      <div ref={listTopRef} className="scroll-mt-24" />

      {listQuery.isError && !listQuery.data ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">We couldn't load opportunities.</p>
            <p className="mt-0.5">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      ) : listQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        activeCount > 0 ? (
          <EmptyState
            title="No opportunities match your search"
            description="Try a different search, or clear some filters to see more."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl bg-blue-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-violet-400"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title={filters.view === "past" ? "No past opportunities" : "No open opportunities right now"}
            description="Check back soon for new scholarships, internships and programs."
          />
        )
      ) : (
        <div
          className={`space-y-3 ${listQuery.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}
          aria-busy={listQuery.isPlaceholderData}
        >
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <nav aria-label="Opportunities pages" className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, filters.page - 1))}
            disabled={meta.current_page <= 1}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="rounded-xl bg-blue-violet-500 px-4 py-2 text-sm font-semibold text-white">
            {meta.current_page} / {meta.last_page}
          </span>
          <button
            type="button"
            onClick={() => goToPage(Math.min(meta.last_page, filters.page + 1))}
            disabled={meta.current_page >= meta.last_page}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
};
