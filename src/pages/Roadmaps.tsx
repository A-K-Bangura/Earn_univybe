import { useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, Compass } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { GuestBanner } from "../components/common/GuestBanner";
import { EmptyState } from "../components/common/EmptyState";
import { DiscoveryToolbar } from "../components/discovery/DiscoveryToolbar";
import { FilterSelect, FilterToggle } from "../components/discovery/FilterSelect";
import { SectionHeader } from "../components/discovery/SectionHeader";
import {
  RoadmapGrid,
  RoadmapGridSkeleton,
} from "../components/roadmap/RoadmapGrid";
import { getRoadmaps } from "../services/roadmaps";
import { isAuthenticated } from "../services/auth";
import {
  getDepartments,
  getFaculties,
  getOrganizations,
  getUniversities,
} from "../services/onboarding";
import {
  getCompletedRoadmaps,
  getContinueRoadmaps,
  getRecommendedRoadmaps,
} from "../utils/roadmap";
import type { RoadmapSort } from "../types/roadmap";

const PAGE_SIZE = 12;
const FEATURED_COUNT = 4;

interface FilterState {
  search: string;
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  organization_id?: number;
  level?: string;
  semester?: string;
  /** "My roadmaps" — signed-in students only (a guest gets a 401). */
  participating: boolean;
  /** `undefined` = the server default (relevance when signed in, newest for guests). */
  sort?: RoadmapSort;
  page: number;
}

const initialFilters: FilterState = { search: "", participating: false, page: 1 };

const LEVELS = [
  { value: "UnderGrad", label: "Undergraduate" },
  { value: "100", label: "100 Level" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level" },
  { value: "graduate", label: "Graduate" },
  { value: "general", label: "General" },
];

const SEMESTERS = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
];

export const Roadmaps = () => {
  const signedIn = isAuthenticated();
  const gridTopRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchInput, setSearchInput] = useState("");

  const update = (patch: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  // ---- filter options (same cascade as the course filters) ----
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

  const activeCount = [
    filters.search.trim(),
    filters.university_id,
    filters.faculty_id,
    filters.department_id,
    filters.organization_id,
    filters.level,
    filters.semester,
    filters.participating,
    filters.sort,
  ].filter(Boolean).length;
  const isFiltering = activeCount > 0;
  const secondaryActive = !!(
    filters.faculty_id ||
    filters.department_id ||
    filters.organization_id ||
    filters.semester
  );

  // ---- data ----
  const apiFilters = {
    search: filters.search,
    university_id: filters.university_id,
    faculty_id: filters.faculty_id,
    department_id: filters.department_id,
    organization_id: filters.organization_id,
    level: filters.level,
    semester: filters.semester,
    participating: filters.participating,
    sort: filters.sort,
    page: filters.page,
    per_page: PAGE_SIZE,
  };

  // Signed-in lists are personalised (progress, ordering): never share a cache
  // entry with the guest version.
  const listQuery = useQuery({
    queryKey: ["roadmaps", "list", signedIn, apiFilters],
    queryFn: () => getRoadmaps(apiFilters),
    placeholderData: keepPreviousData,
  });

  // Page 1 of the unfiltered list feeds "Recommended for you" / "Featured".
  // With no filters and on page 1 this is the very same query as above.
  const topFilters = { page: 1, per_page: PAGE_SIZE };
  const topQuery = useQuery({
    queryKey: ["roadmaps", "list", signedIn, { ...initialFilters, ...topFilters, participating: false, search: "" }],
    queryFn: () => getRoadmaps(topFilters),
    enabled: !isFiltering,
  });

  const mineQuery = useQuery({
    queryKey: ["roadmaps", "mine", signedIn],
    queryFn: () => getRoadmaps({ participating: true, per_page: 50 }),
    enabled: signedIn && !isFiltering,
  });

  // General roadmaps (Round 10): level is exact-match, so the level filter
  // above never surfaces `general` roadmaps on its own — this row fetches
  // them explicitly so every student can see them, whatever their year.
  const generalQuery = useQuery({
    queryKey: ["roadmaps", "general-preview", signedIn],
    queryFn: () => getRoadmaps({ level: "general", per_page: FEATURED_COUNT }),
    enabled: !isFiltering,
  });

  const roadmaps = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const top = topQuery.data?.data;
  const mine = mineQuery.data?.data;
  const general = generalQuery.data?.data ?? [];

  const recommended = useMemo(
    () => (signedIn && top ? getRecommendedRoadmaps(top, FEATURED_COUNT) : []),
    [signedIn, top]
  );
  const recommendedIds = useMemo(
    () => new Set(recommended.map((r) => r.id)),
    [recommended]
  );
  // Guests have no relevance signal: feature the newest few instead.
  const featured =
    !signedIn && top && top.length > FEATURED_COUNT
      ? top.slice(0, FEATURED_COUNT)
      : [];
  const continuing = useMemo(() => getContinueRoadmaps(mine ?? []), [mine]);
  const completed = useMemo(() => getCompletedRoadmaps(mine ?? []), [mine]);

  const resetFilters = () => {
    setFilters(initialFilters);
    setSearchInput("");
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sortOptions = signedIn
    ? [
        { value: "relevance", label: "Recommended" },
        { value: "newest", label: "Newest" },
        { value: "title", label: "A to Z" },
      ]
    : [
        { value: "newest", label: "Newest" },
        { value: "title", label: "A to Z" },
      ];

  const primary = (
    <>
      <FilterSelect
        label="Sort"
        value={filters.sort ?? ""}
        onChange={(value) => update({ sort: (value || undefined) as RoadmapSort | undefined })}
        options={sortOptions}
        placeholder={signedIn ? "Recommended" : "Newest"}
      />
      <FilterSelect
        label="Level"
        value={filters.level ?? ""}
        onChange={(value) => update({ level: value || undefined })}
        options={LEVELS}
        placeholder="All levels"
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
      {signedIn && (
        <FilterToggle
          label="My roadmaps"
          checked={filters.participating}
          onChange={(participating) => update({ participating })}
          icon={<Compass className="h-4 w-4" aria-hidden />}
        />
      )}
    </>
  );

  const secondary = (
    <>
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
        label="Semester"
        value={filters.semester ?? ""}
        onChange={(value) => update({ semester: value || undefined })}
        options={SEMESTERS}
        placeholder="Any semester"
      />
    </>
  );

  const isInitialLoad = listQuery.isLoading;
  const exploreTitle = isFiltering ? "Results" : "Explore all";

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <GuestBanner />

        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Learning Roadmaps
          </h1>
          <p className="max-w-3xl text-gray-600 dark:text-gray-400">
            Follow curated learning journeys that bring related courses together
            into a clear path from where you are to where you want to go.
          </p>
        </header>

        <DiscoveryToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={() => update({ search: searchInput })}
          searchPlaceholder="Search roadmaps…"
          searchLabel="Search roadmaps"
          primary={primary}
          secondary={secondary}
          secondaryDefaultOpen={secondaryActive}
          activeCount={activeCount}
          onReset={resetFilters}
          sheetTitle="Filter roadmaps"
        />

        {/* ---- Grouped sections (default view only) ---- */}
        {!isFiltering && signedIn && recommended.length > 0 && (
          <section aria-labelledby="rm-recommended" className="mb-10">
            <SectionHeader
              id="rm-recommended"
              title="Recommended for you"
              subtitle="Closest to your department, faculty and year."
            />
            <RoadmapGrid roadmaps={recommended} recommendedIds={recommendedIds} />
          </section>
        )}

        {!isFiltering && signedIn && !mineQuery.isLoading && (
          <section aria-labelledby="rm-continue" className="mb-10">
            <SectionHeader id="rm-continue" title="Continue your roadmaps" />
            {continuing.length > 0 ? (
              <RoadmapGrid roadmaps={continuing} />
            ) : (
              <EmptyState
                title="No roadmaps started yet"
                description="Take any course that's part of a roadmap and it shows up here with your progress. There's no set order, so start wherever you like."
              />
            )}
          </section>
        )}

        {!isFiltering && signedIn && completed.length > 0 && (
          <section aria-labelledby="rm-completed" className="mb-10">
            <SectionHeader
              id="rm-completed"
              title="Completed roadmaps"
              subtitle="Every course done. Badge earned."
            />
            <RoadmapGrid roadmaps={completed} />
          </section>
        )}

        {!isFiltering && general.length > 0 && (
          <section aria-labelledby="rm-general" className="mb-10">
            <SectionHeader
              id="rm-general"
              title="General roadmaps"
              subtitle="Open to every student, whatever your year."
            />
            <RoadmapGrid roadmaps={general} />
          </section>
        )}

        {!isFiltering && featured.length > 0 && (
          <section aria-labelledby="rm-featured" className="mb-10">
            <SectionHeader
              id="rm-featured"
              title="Featured roadmaps"
              subtitle="Sign up to track your progress along any of them."
              action={{ label: "Sign up", to: "/auth/signup" }}
            />
            <RoadmapGrid roadmaps={featured} />
          </section>
        )}

        {/* ---- Explore all / filtered results ---- */}
        <section aria-labelledby="rm-explore">
          <div ref={gridTopRef} className="scroll-mt-24" />
          <SectionHeader
            id="rm-explore"
            title={exploreTitle}
            subtitle={
              meta && isFiltering
                ? `${meta.total} roadmap${meta.total === 1 ? "" : "s"} found`
                : undefined
            }
          />

          {listQuery.isError && !listQuery.data ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">We couldn't load roadmaps.</p>
                <p className="mt-0.5">
                  {filters.participating
                    ? "Sign in again to see your roadmaps."
                    : "Check your connection and try again."}
                </p>
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
            <RoadmapGridSkeleton />
          ) : roadmaps.length === 0 ? (
            isFiltering ? (
              <EmptyState
                pose="shrug"
                title={
                  filters.participating && activeCount === 1
                    ? "You haven't started a roadmap yet"
                    : "No roadmaps match those filters"
                }
                description={
                  filters.participating && activeCount === 1
                    ? "Take any course that's part of a roadmap and it will appear here."
                    : "Try a different search, or clear some filters to see more."
                }
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
                pose="learning"
                title="Roadmaps are on their way"
                description="Guided learning journeys will show up here soon. In the meantime, browse the courses."
                action={
                  <span className="own-links">
                    <Link
                      to="/courses"
                      className="inline-block rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
                    >
                      Browse courses
                    </Link>
                  </span>
                }
              />
            )
          ) : (
            <div
              className={listQuery.isPlaceholderData ? "opacity-60 transition-opacity" : ""}
              aria-busy={listQuery.isPlaceholderData}
            >
              <RoadmapGrid roadmaps={roadmaps} recommendedIds={recommendedIds} />
            </div>
          )}

          {meta && meta.last_page > 1 && (
            <nav
              aria-label="Roadmaps pages"
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
        </section>
      </div>
    </PageShell>
  );
};
