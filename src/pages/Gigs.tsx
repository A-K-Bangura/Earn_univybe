import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, PlusCircle, X } from "lucide-react";
import { EmptyState } from "../components/common/EmptyState";
import { DiscoveryToolbar } from "../components/discovery/DiscoveryToolbar";
import { FilterMultiSelect } from "../components/discovery/FilterMultiSelect";
import { TagListInput } from "../components/discovery/TagListInput";
import { SegmentedToggle } from "../components/discovery/SegmentedToggle";
import { GigCard } from "../components/gigs/GigCard";
import { getGigCategories, getGigOptions, getGigs } from "../services/gigs";
import { isAuthenticated } from "../services/auth";
import type { GigPricingType, GigWorkMode } from "../types/gig";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;

const OPEN_CLOSED_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

interface FilterState {
  search: string;
  category: string[];
  pricing_type: string[];
  work_mode: string[];
  location: string;
  skills: string[];
  tags: string[];
  deadline_from: string;
  deadline_to: string;
  view: "open" | "closed";
  page: number;
}

const paramsToFilters = (params: URLSearchParams): FilterState => ({
  search: params.get("search") ?? "",
  category: params.getAll("category"),
  pricing_type: params.getAll("pricing_type"),
  work_mode: params.getAll("work_mode"),
  location: params.get("location") ?? "",
  skills: params.getAll("skills"),
  tags: params.getAll("tags"),
  deadline_from: params.get("deadline_from") ?? "",
  deadline_to: params.get("deadline_to") ?? "",
  view: params.get("view") === "closed" ? "closed" : "open",
  page: Number(params.get("page")) || 1,
});

const filtersToParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  filters.category.forEach((c) => params.append("category", c));
  filters.pricing_type.forEach((p) => params.append("pricing_type", p));
  filters.work_mode.forEach((w) => params.append("work_mode", w));
  if (filters.location) params.set("location", filters.location);
  filters.skills.forEach((s) => params.append("skills", s));
  filters.tags.forEach((t) => params.append("tags", t));
  if (filters.deadline_from) params.set("deadline_from", filters.deadline_from);
  if (filters.deadline_to) params.set("deadline_to", filters.deadline_to);
  if (filters.view === "closed") params.set("view", "closed");
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
};

export const Gigs = () => {
  const signedIn = isAuthenticated();
  const [searchParams, setSearchParams] = useSearchParams();
  const listTopRef = useRef<HTMLDivElement>(null);
  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(filters.search);

  const update = (patch: Partial<FilterState>) => {
    setSearchParams(filtersToParams({ ...filters, ...patch, page: 1 }), { replace: true });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) update({ search: searchInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { data: options } = useQuery({
    queryKey: ["gig-options"],
    queryFn: getGigOptions,
    staleTime: 60 * 60 * 1000,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["gig-categories"],
    queryFn: getGigCategories,
    staleTime: 60 * 60 * 1000,
  });

  const apiFilters = {
    search: filters.search,
    category: filters.category.length > 0 ? filters.category : undefined,
    pricing_type: filters.pricing_type.length > 0 ? (filters.pricing_type as GigPricingType[]) : undefined,
    work_mode: filters.work_mode.length > 0 ? (filters.work_mode as GigWorkMode[]) : undefined,
    location: filters.location || undefined,
    skills: filters.skills.length > 0 ? filters.skills : undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    deadline_from: filters.deadline_from || undefined,
    deadline_to: filters.deadline_to || undefined,
    page: filters.page,
    per_page: PAGE_SIZE,
  };

  const listQuery = useQuery({
    queryKey: ["gigs", "list", signedIn, apiFilters, filters.view === "closed"],
    queryFn: () => getGigs(apiFilters, filters.view === "closed"),
    placeholderData: keepPreviousData,
  });

  const gigs = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const activeCount = [
    filters.search.trim(),
    filters.category.length > 0,
    filters.pricing_type.length > 0,
    filters.work_mode.length > 0,
    filters.location.trim(),
    filters.skills.length > 0,
    filters.tags.length > 0,
    filters.deadline_from,
    filters.deadline_to,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchInput("");
    setSearchParams(
      filtersToParams({
        ...filters,
        search: "",
        category: [],
        pricing_type: [],
        work_mode: [],
        location: "",
        skills: [],
        tags: [],
        deadline_from: "",
        deadline_to: "",
        page: 1,
      }),
      { replace: true }
    );
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
    filters.category.forEach((category) => {
      const label = categories.find((c) => c.slug === category)?.name ?? category;
      list.push({
        key: `category-${category}`,
        label,
        onRemove: () => update({ category: filters.category.filter((c) => c !== category) }),
      });
    });
    filters.pricing_type.forEach((type) => {
      const label = options?.pricing_types.find((t) => t.value === type)?.label ?? type;
      list.push({
        key: `pricing-${type}`,
        label,
        onRemove: () => update({ pricing_type: filters.pricing_type.filter((t) => t !== type) }),
      });
    });
    filters.work_mode.forEach((mode) => {
      const label = options?.work_modes.find((m) => m.value === mode)?.label ?? mode;
      list.push({
        key: `mode-${mode}`,
        label,
        onRemove: () => update({ work_mode: filters.work_mode.filter((m) => m !== mode) }),
      });
    });
    if (filters.location.trim())
      list.push({ key: "location", label: filters.location, onRemove: () => update({ location: "" }) });
    filters.skills.forEach((skill) =>
      list.push({ key: `skill-${skill}`, label: skill, onRemove: () => update({ skills: filters.skills.filter((s) => s !== skill) }) })
    );
    filters.tags.forEach((tag) =>
      list.push({ key: `tag-${tag}`, label: tag, onRemove: () => update({ tags: filters.tags.filter((t) => t !== tag) }) })
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, categories, options]);

  const primary = (
    <>
      <FilterMultiSelect
        label="Category"
        value={filters.category}
        onChange={(value) => update({ category: value })}
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        placeholder="All categories"
      />
      <FilterMultiSelect
        label="Pricing"
        value={filters.pricing_type}
        onChange={(value) => update({ pricing_type: value })}
        options={options?.pricing_types ?? []}
        placeholder="Any pricing"
      />
      <FilterMultiSelect
        label="Work mode"
        value={filters.work_mode}
        onChange={(value) => update({ work_mode: value })}
        options={options?.work_modes ?? []}
        placeholder="Any work mode"
      />
    </>
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
        label="Skills"
        values={filters.skills}
        onChange={(value) => update({ skills: value })}
        placeholder="e.g. figma, branding"
        max={options?.limits.max_skills}
      />
      <TagListInput
        label="Tags"
        values={filters.tags}
        onChange={(value) => update({ tags: value })}
        placeholder="e.g. logo, tutoring"
        max={options?.limits.max_tags}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
            Deadline from
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
            Deadline to
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={signedIn ? "/feed/gigs/new" : "/auth/login?redirect=/feed/gigs/new"}
            className="inline-flex items-center gap-2 rounded-xl bg-aquamarine-500 px-4 py-2 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Post a gig
          </Link>
          {signedIn && (
            <>
              <Link
                to="/feed/gigs/interests"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                My interests
              </Link>
              <Link
                to="/feed/gigs/posted"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                My posted gigs
              </Link>
            </>
          )}
        </div>
        <SegmentedToggle
          options={OPEN_CLOSED_OPTIONS}
          value={filters.view}
          onChange={(value) => update({ view: value as "open" | "closed" })}
          aria-label="Open or closed gigs"
        />
      </div>

      <DiscoveryToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => update({ search: searchInput })}
        searchPlaceholder="Search gigs, skills, or locations"
        searchLabel="Search gigs"
        primary={primary}
        secondary={secondary}
        activeCount={activeCount}
        onReset={resetFilters}
        sheetTitle="Filter gigs"
      />

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full bg-aquamarine-900 px-3 py-1.5 text-sm font-medium text-aquamarine-200 transition-colors hover:bg-aquamarine-800 dark:bg-aquamarine-100 dark:text-aquamarine-300"
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
          {meta.total} gig{meta.total === 1 ? "" : "s"} found · Newest published first
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
            <p className="font-semibold">We couldn't load gigs.</p>
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
      ) : gigs.length === 0 ? (
        activeCount > 0 ? (
          <EmptyState
            title="No gigs match your search"
            description="Try a different search, or clear some filters to see more."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title={filters.view === "closed" ? "No closed gigs" : "No open gigs right now"}
            description="Check back soon, or be the first to post one."
            action={
              filters.view === "open" ? (
                <Link
                  to={signedIn ? "/feed/gigs/new" : "/auth/login?redirect=/feed/gigs/new"}
                  className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
                >
                  Post a gig
                </Link>
              ) : undefined
            }
          />
        )
      ) : (
        <div
          className={`space-y-3 ${listQuery.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}
          aria-busy={listQuery.isPlaceholderData}
        >
          {gigs.map((gig) => (
            <GigCard key={gig.id} gig={gig} />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <nav aria-label="Gigs pages" className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, filters.page - 1))}
            disabled={meta.current_page <= 1}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="rounded-xl bg-aquamarine-500 px-4 py-2 text-sm font-semibold text-aquamarine-100">
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
