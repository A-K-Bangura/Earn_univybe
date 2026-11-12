import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { GuestBanner } from "../components/common/GuestBanner";
import { EmptyState } from "../components/common/EmptyState";
import { DiscoveryToolbar } from "../components/discovery/DiscoveryToolbar";
import { FilterSelect } from "../components/discovery/FilterSelect";
import { ResourceListItem } from "../components/resources/ResourceListItem";
import { ResourceUsagePanel } from "../components/resources/ResourceUsagePanel";
import { ResourceAccessDialog } from "../components/resources/ResourceAccessDialog";
import {
  getResources,
  getResourceVocabulary,
  getResourcePurchase,
} from "../services/resources";
import { useResourceAccess, RESOURCE_USAGE_QUERY_KEY } from "../hooks/useResourceAccess";
import { resolveFormatLabel } from "../utils/resourceFormat";
import { isAuthenticated } from "../services/auth";
import {
  getDepartments,
  getFaculties,
  getOrganizations,
  getUniversities,
} from "../services/onboarding";
import type { ResourceSort, ResourceSourceType } from "../types/resource";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;

type PurchaseBannerState =
  | "success"
  | "processing"
  | "cancelled"
  | "expired"
  | "failed";

interface FilterState {
  search: string;
  resource_type?: string;
  source_type?: ResourceSourceType;
  format?: string;
  subject?: string;
  module?: string;
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  organization_id?: number;
  level?: string;
  semester?: string;
  publication_year?: number;
  sort?: ResourceSort;
  page: number;
}

const initialFilters: FilterState = { search: "", page: 1 };

const LEVELS = [
  { value: "UnderGrad", label: "Undergraduate" },
  { value: "100", label: "100 Level" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level" },
  { value: "graduate", label: "Graduate" },
];

const SEMESTERS = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
];

export const Resources = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signedIn = isAuthenticated();
  const listTopRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchInput, setSearchInput] = useState("");

  // Debounce free-text search into the actual filter (the guide asks for
  // ~300ms, unlike Courses/Roadmaps' submit-on-Enter search).
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput
          ? prev
          : { ...prev, search: searchInput, page: 1 }
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const update = (patch: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  // ---- Monime access-pack checkout return (?purchase=...&purchase_id=...) ----
  const [purchaseBanner, setPurchaseBanner] = useState<PurchaseBannerState | null>(
    null
  );
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [showStillConfirming, setShowStillConfirming] = useState(false);

  const stripPurchaseParams = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("purchase");
        next.delete("purchase_id");
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const outcome = searchParams.get("purchase") as
      | "success"
      | "processing"
      | "cancelled"
      | "expired"
      | null;
    const id = searchParams.get("purchase_id");
    if (
      outcome === "success" ||
      outcome === "processing" ||
      outcome === "cancelled" ||
      outcome === "expired"
    ) {
      setPurchaseBanner(outcome);
      setPurchaseId(id);
      if (outcome === "processing") {
        setIsPolling(true);
        setPollStartedAt(Date.now());
      } else {
        queryClient.invalidateQueries({ queryKey: RESOURCE_USAGE_QUERY_KEY });
        stripPurchaseParams();
      }
    }
    // Read only the query params present when this page first mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-shot fetch for a `success` return (to show the real accesses count);
  // repeating fetch while `processing` (auto-paused when the tab is hidden —
  // React Query's refetchIntervalInBackground defaults to false).
  const purchaseQuery = useQuery({
    queryKey: ["resource-purchase", purchaseId],
    queryFn: () => getResourcePurchase(purchaseId!),
    enabled: !!purchaseId && (isPolling || purchaseBanner === "success"),
    refetchInterval: isPolling ? 4000 : false,
  });

  useEffect(() => {
    if (!purchaseQuery.data) return;
    queryClient.setQueryData(RESOURCE_USAGE_QUERY_KEY, purchaseQuery.data.usage);
    if (isPolling && purchaseQuery.data.purchase.status !== "pending") {
      setIsPolling(false);
      setPurchaseBanner(
        purchaseQuery.data.purchase.status === "succeeded"
          ? "success"
          : (purchaseQuery.data.purchase.status as PurchaseBannerState)
      );
      stripPurchaseParams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseQuery.data]);

  useEffect(() => {
    if (!isPolling || !pollStartedAt) {
      setShowStillConfirming(false);
      return;
    }
    const timer = setTimeout(() => setShowStillConfirming(true), 60000);
    return () => clearTimeout(timer);
  }, [isPolling, pollStartedAt]);

  // ---- Vocabulary + academic lookups ----
  const { data: vocab } = useQuery({
    queryKey: ["resource-vocabulary"],
    queryFn: getResourceVocabulary,
    staleTime: 60 * 60 * 1000,
  });

  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
  });
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });
  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties", filters.university_id],
    queryFn: () => getFaculties(filters.university_id as number),
    enabled: !!filters.university_id,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", filters.university_id, filters.faculty_id],
    queryFn: () =>
      getDepartments(filters.university_id as number, filters.faculty_id as number),
    enabled: !!filters.university_id && !!filters.faculty_id,
  });

  const formatOptions = useMemo(() => {
    if (!vocab) return [];
    if (filters.source_type === "file") return vocab.file_formats;
    if (filters.source_type === "external") return vocab.link_types;
    return [...vocab.file_formats, ...vocab.link_types];
  }, [vocab, filters.source_type]);

  const updateSourceType = (value: ResourceSourceType | undefined) => {
    setFilters((prev) => {
      const pool =
        value === "file"
          ? vocab?.file_formats
          : value === "external"
            ? vocab?.link_types
            : [...(vocab?.file_formats ?? []), ...(vocab?.link_types ?? [])];
      const formatStillValid =
        !prev.format || pool?.some((option) => option.value === prev.format);
      return {
        ...prev,
        source_type: value,
        format: formatStillValid ? prev.format : undefined,
        page: 1,
      };
    });
  };

  // ---- Data ----
  const apiFilters = {
    search: filters.search,
    resource_type: filters.resource_type,
    source_type: filters.source_type,
    format: filters.format,
    subject: filters.subject,
    module: filters.module,
    university_id: filters.university_id,
    faculty_id: filters.faculty_id,
    department_id: filters.department_id,
    organization_id: filters.organization_id,
    level: filters.level,
    semester: filters.semester,
    publication_year: filters.publication_year,
    sort: filters.sort,
    page: filters.page,
    per_page: PAGE_SIZE,
  };

  const listQuery = useQuery({
    queryKey: ["resources", "list", signedIn, apiFilters],
    queryFn: () => getResources(apiFilters),
    placeholderData: keepPreviousData,
  });

  const { open, isAccessing, accessingResourceId, usageQuery, limitDetails, closeLimitDialog } =
    useResourceAccess();

  const resources = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const activeCount = [
    filters.search.trim(),
    filters.resource_type,
    filters.source_type,
    filters.format,
    filters.subject,
    filters.module,
    filters.university_id,
    filters.faculty_id,
    filters.department_id,
    filters.organization_id,
    filters.level,
    filters.semester,
    filters.publication_year,
    filters.sort,
  ].filter(Boolean).length;
  const secondaryActive = !!(
    filters.source_type ||
    filters.subject ||
    filters.module ||
    filters.faculty_id ||
    filters.department_id ||
    filters.organization_id ||
    filters.semester ||
    filters.publication_year
  );

  const resetFilters = () => {
    setFilters(initialFilters);
    setSearchInput("");
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sortOptions = signedIn
    ? [
        { value: "relevance", label: "Closest to your profile" },
        { value: "newest", label: "Newest" },
        { value: "title", label: "A to Z" },
      ]
    : [
        { value: "newest", label: "Newest" },
        { value: "title", label: "A to Z" },
      ];

  // ---- Active filter chips ----
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
    if (filters.resource_type) {
      const label =
        vocab?.resource_types.find((t) => t.value === filters.resource_type)
          ?.label ?? filters.resource_type;
      list.push({ key: "type", label, onRemove: () => update({ resource_type: undefined }) });
    }
    if (filters.source_type) {
      const label =
        vocab?.source_types.find((t) => t.value === filters.source_type)?.label ??
        filters.source_type;
      list.push({ key: "source", label, onRemove: () => updateSourceType(undefined) });
    }
    if (filters.format) {
      const label =
        formatOptions.find((f) => f.value === filters.format)?.label ?? filters.format;
      list.push({ key: "format", label, onRemove: () => update({ format: undefined }) });
    }
    if (filters.university_id) {
      const label =
        universities.find((u) => u.id === filters.university_id)?.name ??
        "University";
      list.push({
        key: "university",
        label,
        onRemove: () =>
          update({ university_id: undefined, faculty_id: undefined, department_id: undefined }),
      });
    }
    if (filters.faculty_id) {
      const label = faculties.find((f) => f.id === filters.faculty_id)?.name ?? "Faculty";
      list.push({
        key: "faculty",
        label,
        onRemove: () => update({ faculty_id: undefined, department_id: undefined }),
      });
    }
    if (filters.department_id) {
      const label =
        departments.find((d) => d.id === filters.department_id)?.name ?? "Department";
      list.push({ key: "department", label, onRemove: () => update({ department_id: undefined }) });
    }
    if (filters.organization_id) {
      const label =
        organizations.find((o) => o.id === filters.organization_id)?.name ??
        "Organization";
      list.push({ key: "organization", label, onRemove: () => update({ organization_id: undefined }) });
    }
    if (filters.level) {
      const label = LEVELS.find((l) => l.value === filters.level)?.label ?? filters.level;
      list.push({ key: "level", label, onRemove: () => update({ level: undefined }) });
    }
    if (filters.semester) {
      const label =
        SEMESTERS.find((s) => s.value === filters.semester)?.label ?? filters.semester;
      list.push({ key: "semester", label, onRemove: () => update({ semester: undefined }) });
    }
    if (filters.publication_year)
      list.push({
        key: "year",
        label: String(filters.publication_year),
        onRemove: () => update({ publication_year: undefined }),
      });
    if (filters.subject)
      list.push({ key: "subject", label: filters.subject, onRemove: () => update({ subject: undefined }) });
    if (filters.module)
      list.push({ key: "module", label: filters.module, onRemove: () => update({ module: undefined }) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, vocab, formatOptions, universities, faculties, departments, organizations]);

  const primary = (
    <>
      <FilterSelect
        label="Sort"
        value={filters.sort ?? ""}
        onChange={(value) => update({ sort: (value || undefined) as ResourceSort | undefined })}
        options={sortOptions}
        placeholder={signedIn ? "Closest to your profile" : "Newest"}
      />
      <FilterSelect
        label="Resource type"
        value={filters.resource_type ?? ""}
        onChange={(value) => update({ resource_type: value || undefined })}
        options={vocab?.resource_types ?? []}
        placeholder="All types"
      />
      <FilterSelect
        label="Format"
        value={filters.format ?? ""}
        onChange={(value) => update({ format: value || undefined })}
        options={formatOptions}
        placeholder="All formats"
      />
    </>
  );

  const secondary = (
    <>
      <FilterSelect
        label="Source"
        value={filters.source_type ?? ""}
        onChange={(value) => updateSourceType((value || undefined) as ResourceSourceType | undefined)}
        options={vocab?.source_types ?? []}
        placeholder="Files and links"
      />
      <FilterSelect
        label="University"
        value={filters.university_id ? String(filters.university_id) : ""}
        onChange={(value) =>
          update({
            university_id: value ? Number(value) : undefined,
            faculty_id: undefined,
            department_id: undefined,
          })
        }
        options={universities.map((u) => ({ value: String(u.id), label: u.name }))}
        placeholder="All universities"
      />
      <FilterSelect
        label="Faculty"
        value={filters.faculty_id ? String(filters.faculty_id) : ""}
        onChange={(value) =>
          update({ faculty_id: value ? Number(value) : undefined, department_id: undefined })
        }
        options={faculties.map((f) => ({ value: String(f.id), label: f.name }))}
        placeholder="All faculties"
        disabled={!filters.university_id}
        disabledHint="Choose a university first"
      />
      <FilterSelect
        label="Department"
        value={filters.department_id ? String(filters.department_id) : ""}
        onChange={(value) => update({ department_id: value ? Number(value) : undefined })}
        options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
        placeholder="All departments"
        disabled={!filters.faculty_id}
        disabledHint="Choose a faculty first"
      />
      <FilterSelect
        label="Organization"
        value={filters.organization_id ? String(filters.organization_id) : ""}
        onChange={(value) => update({ organization_id: value ? Number(value) : undefined })}
        options={organizations.map((o) => ({ value: String(o.id), label: o.name }))}
        placeholder="All organizations"
      />
      <FilterSelect
        label="Level"
        value={filters.level ?? ""}
        onChange={(value) => update({ level: value || undefined })}
        options={LEVELS}
        placeholder="All levels"
      />
      <FilterSelect
        label="Semester"
        value={filters.semester ?? ""}
        onChange={(value) => update({ semester: value || undefined })}
        options={SEMESTERS}
        placeholder="Any semester"
      />
    </>
  );

  const isInitialLoad = listQuery.isLoading;

  const purchaseBannerText: Record<PurchaseBannerState, string> = {
    success: purchaseQuery.data
      ? `${purchaseQuery.data.purchase.accesses} accesses added.`
      : "Payment confirmed — accesses added.",
    processing: "Confirming your payment… this can take a moment.",
    cancelled: "Payment was cancelled — you can try again anytime.",
    expired: "The payment link expired — you can try again anytime.",
    failed: "The payment couldn't be completed — you can try again anytime.",
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <GuestBanner />

        {purchaseBanner && (
          <div
            className={`mb-6 flex items-start justify-between gap-4 rounded-lg p-4 ${
              purchaseBanner === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                : purchaseBanner === "processing"
                  ? "bg-azure-50 text-azure-800 dark:bg-azure-900/20 dark:text-azure-300"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
            }`}
          >
            <div className="text-sm font-medium">
              <p>{purchaseBannerText[purchaseBanner]}</p>
              {showStillConfirming && (
                <div className="mt-2 flex items-center gap-3">
                  <span>Still confirming your payment.</span>
                  <button
                    type="button"
                    onClick={() => purchaseQuery.refetch()}
                    className="font-semibold underline"
                  >
                    Check again
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setPurchaseBanner(null)}
              aria-label="Dismiss"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <header className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Resources
          </h1>
          <p className="max-w-3xl text-gray-600 dark:text-gray-400">
            Find lecture notes, slides, books, past questions, and useful
            learning links.
          </p>
        </header>

        <ResourceUsagePanel usageQuery={usageQuery} />

        <DiscoveryToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={() => update({ search: searchInput })}
          searchPlaceholder="Search titles, subjects, authors, or tags"
          searchLabel="Search resources"
          primary={primary}
          secondary={secondary}
          secondaryDefaultOpen={secondaryActive}
          activeCount={activeCount}
          onReset={resetFilters}
          sheetTitle="Filter resources"
        />

        {chips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 rounded-full bg-azure-50 px-3 py-1.5 text-sm font-medium text-azure-700 transition-colors hover:bg-azure-100 dark:bg-azure-900/20 dark:text-azure-300 dark:hover:bg-azure-900/30"
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
            {meta.total} resource{meta.total === 1 ? "" : "s"} found
            {!filters.sort && (
              <>
                {" "}
                ·{" "}
                {signedIn
                  ? "Closest to your academic profile first"
                  : "Newest first"}
              </>
            )}
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
              <p className="font-semibold">We couldn't load resources.</p>
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
        ) : isInitialLoad ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : resources.length === 0 ? (
          activeCount > 0 ? (
            <EmptyState
              pose="shrug"
              title="No resources match your search"
              description="Try a different search, or clear some filters to see more."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="Resources will appear here as they become available."
              description="Check back soon, or explore courses in the meantime."
            />
          )
        ) : (
          <div
            className={`space-y-3 ${listQuery.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}
            aria-busy={listQuery.isPlaceholderData}
          >
            {resources.map((resource) => (
              <ResourceListItem
                key={resource.id}
                resource={resource}
                formatLabel={resolveFormatLabel(resource, vocab)}
                isAccessing={isAccessing && accessingResourceId === resource.id}
                onOpen={(disposition) => open(resource, navigate, disposition)}
              />
            ))}
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <nav
            aria-label="Resources pages"
            className="mt-8 flex items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, filters.page - 1))}
              disabled={meta.current_page <= 1}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white">
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

        <ResourceAccessDialog details={limitDetails} onClose={closeLimitDialog} />
      </div>
    </PageShell>
  );
};
