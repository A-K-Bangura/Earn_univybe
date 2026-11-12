import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import {
  CourseGrid,
  CourseGridSkeleton,
  CourseSection,
} from "../components/course/CourseSection";
import { RoadmapsPreviewSection } from "../components/roadmap/RoadmapsPreviewSection";
import { DiscoveryToolbar } from "../components/discovery/DiscoveryToolbar";
import { FilterSelect } from "../components/discovery/FilterSelect";
import { SectionHeader } from "../components/discovery/SectionHeader";
import { EmptyState } from "../components/common/EmptyState";
import { getCourses } from "../services/courses";
import { searchCourses } from "../services/search";
import { getCurrentUser } from "../services/auth";
import {
  getUniversities,
  getFaculties,
  getDepartments,
  getOrganizations,
} from "../services/onboarding";
import { getAcademicModules } from "../services/academicModules";
import { GuestBanner } from "../components/common/GuestBanner";
import type { CourseFilters } from "../types/course";
import type { Course } from "../types/dashboard";
import type { CourseSearchItem } from "../types/search";

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

// One "Sort" control instead of separate sort-by / sort-order dropdowns.
// Values encode `sort_by:sort_order`.
const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "title:asc", label: "Title A to Z" },
  { value: "title:desc", label: "Title Z to A" },
];

export const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Get current user to set default filters
  const currentUser = getCurrentUser();
  // `level` is the raw academic level string; `year_of_study` is only a
  // backward-compat alias of the same value (see STUDENT_API_PAYLOADS §8).
  const defaultLevel = currentUser?.level;
  const defaultDepartmentId = currentUser?.department?.id;
  const defaultFacultyId = currentUser?.faculty?.id;
  const defaultUniversityId = currentUser?.university?.id;

  const [showAllCourses, setShowAllCourses] = useState(false);
  const [_activeGroup, setActiveGroup] = useState<
    "department" | "faculty" | "university" | "general" | "all" | null
  >(null);
  const [groupMode, setGroupMode] = useState<
    "department" | "faculty" | "university" | "general" | "all" | null
  >(null);
  const [filters, setFilters] = useState<CourseFilters>({
    page: 1,
    per_page: 20,
    level: defaultLevel,
    department_id: defaultDepartmentId,
    faculty_id: defaultFacultyId,
    university_id: defaultUniversityId,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);

  // Initialize from ?group= query param
  useEffect(() => {
    const group = searchParams.get("group") as
      | "department"
      | "faculty"
      | "university"
      | "general"
      | "all"
      | null;
    if (!group) {
      setGroupMode(null);
      return;
    }

    setGroupMode(group);
    setShowAllCourses(true);
    setActiveGroup(group);
    void _activeGroup; // Intentionally unused - groupMode is used instead
    if (group === "department") {
      setFilters({
        page: 1,
        per_page: 20,
        level: defaultLevel,
        department_id: defaultDepartmentId,
      });
    } else if (group === "faculty") {
      setFilters({
        page: 1,
        per_page: 20,
        level: defaultLevel,
        faculty_id: defaultFacultyId,
      });
    } else if (group === "university") {
      setFilters({
        page: 1,
        per_page: 20,
        level: defaultLevel,
        university_id: defaultUniversityId,
      });
    } else if (group === "general") {
      // Open to every student, regardless of year/department — level is the
      // only filter here, exact-match "general" (Round 10).
      setFilters({
        page: 1,
        per_page: 20,
        level: "general",
      });
    } else {
      // all
      setFilters({
        page: 1,
        per_page: 20,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // API queries for filters
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
    queryFn: () => getDepartments(filters.university_id as number, filters.faculty_id as number),
    enabled: !!filters.university_id && !!filters.faculty_id,
  });

  // Academic modules (Round 12) — scoped to the most specific of the
  // selected department/faculty/university, per docs/ACADEMIC_MODULES_API.md
  // (passing more than one of these at once isn't a documented combination).
  const moduleScope = filters.department_id
    ? { department_id: filters.department_id }
    : filters.faculty_id
      ? { faculty_id: filters.faculty_id }
      : filters.university_id
        ? { university_id: filters.university_id }
        : null;
  const { data: academicModulesData } = useQuery({
    queryKey: ["academic-modules", moduleScope],
    queryFn: () => getAcademicModules(moduleScope!),
    enabled: !!moduleScope,
  });
  const academicModules = academicModulesData?.data || [];

  // Regular courses query (when not searching)
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["courses", filters],
    queryFn: () => getCourses(filters),
    enabled: !isSearchMode || !searchQuery.trim(),
  });

  // Search courses query (when searching)
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: [
      "search-courses",
      searchQuery,
      filters.level,
      filters.academic_module_id,
      searchOffset,
    ],
    queryFn: () =>
      searchCourses(searchQuery, {
        level: filters.level,
        academic_module_id: filters.academic_module_id,
        limit: filters.per_page || 20,
        offset: searchOffset,
      }),
    enabled: isSearchMode && !!searchQuery.trim(),
  });

  // Helper function to convert CourseSearchItem to Course format
  const convertSearchItemToCourse = (item: CourseSearchItem): Course => {
    return {
      id: item.id,
      uuid: item.uuid || `course-${item.id}`, // Use actual UUID from search results or generate fallback
      title: item.title,
      description: item.description,
      level: item.level,
      status: item.status,
      // Note: Search results may have a simplified creator object
      // We'll omit it if it doesn't match the full Creator type
      creator: undefined,
      tags: item.tags,
      thumbnail_url: item.thumbnail_url || null, // Use actual thumbnail URL from search results
      enrolled_students_count: item.enrollments_count,
      academic_module: item.academic_module,
    };
  };

  // Grouped recommended queries (top 6 each)
  const { data: departmentCourses } = useQuery({
    queryKey: [
      "courses",
      "group",
      "department",
      defaultDepartmentId,
      defaultLevel,
    ],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: defaultLevel,
        department_id: defaultDepartmentId,
      }),
    enabled: !!defaultDepartmentId,
  });

  const { data: facultyCourses } = useQuery({
    queryKey: ["courses", "group", "faculty", defaultFacultyId, defaultLevel],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: defaultLevel,
        faculty_id: defaultFacultyId,
      }),
    enabled: !!defaultFacultyId,
  });

  const { data: universityCourses } = useQuery({
    queryKey: [
      "courses",
      "group",
      "university",
      defaultUniversityId,
      defaultLevel,
    ],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: defaultLevel,
        university_id: defaultUniversityId,
      }),
    enabled: !!defaultUniversityId,
  });

  // Explore all (no organization filters). Keep level out as requested
  const { data: exploreAllCourses } = useQuery({
    queryKey: ["courses", "group", "all"],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
      }),
  });

  // General courses (Round 10): level is exact-match, so a student's own
  // `level` filter above never surfaces `general` courses on its own — this
  // row fetches them explicitly so every student can see them regardless of
  // year/department/faculty/university.
  const { data: generalCourses } = useQuery({
    queryKey: ["courses", "group", "general"],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: "general",
      }),
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearchMode(true);
      setSearchOffset(0);
      setShowAllCourses(true);
      setGroupMode(null);
    } else {
      setIsSearchMode(false);
      setSearchOffset(0);
    }
  };

  const handleFilterChange = (
    key: keyof CourseFilters,
    value: string | number | undefined
  ) => {
    // Filters only show up in the flat results list, so applying one moves the
    // page there (it used to change state silently while the curated rows
    // stayed on screen).
    setShowAllCourses(true);
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [key]: value || undefined,
        page: 1,
      };

      // Cascading logic: when university changes, reset faculty and department
      if (key === "university_id") {
        newFilters.faculty_id = undefined;
        newFilters.department_id = undefined;
        newFilters.academic_module_id = undefined;
      }
      // When faculty changes, reset department
      if (key === "faculty_id") {
        newFilters.department_id = undefined;
        newFilters.academic_module_id = undefined;
      }
      // The module picker's own options depend on department/faculty, so a
      // direct department change can also invalidate a previously picked one.
      if (key === "department_id") {
        newFilters.academic_module_id = undefined;
      }

      return newFilters;
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = (value || "created_at:desc").split(":") as [
      "created_at" | "title",
      "asc" | "desc",
    ];
    setShowAllCourses(true);
    setFilters((prev) => ({
      ...prev,
      sort_by: value ? sortBy : undefined,
      sort_order: value ? sortOrder : undefined,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchParams({});
    setGroupMode(null);
    setShowAllCourses(false);
    setActiveGroup(null);
    setIsSearchMode(false);
    setSearchQuery("");
    setSearchOffset(0);
    setFilters({
      page: 1,
      per_page: 20,
      level: defaultLevel,
      department_id: defaultDepartmentId,
      faculty_id: defaultFacultyId,
      university_id: defaultUniversityId,
    });
  };

  // How far the filters have moved from the student's own defaults (the
  // badge on the mobile Filters button and the Reset affordance).
  const activeFilterCount =
    (filters.level !== defaultLevel ? 1 : 0) +
    (filters.university_id !== defaultUniversityId ? 1 : 0) +
    (filters.faculty_id !== defaultFacultyId ? 1 : 0) +
    (filters.department_id !== defaultDepartmentId ? 1 : 0) +
    (filters.organization_id ? 1 : 0) +
    (filters.academic_module_id ? 1 : 0) +
    (filters.sort_by ? 1 : 0);
  const moreFiltersActive =
    filters.faculty_id !== defaultFacultyId ||
    filters.department_id !== defaultDepartmentId ||
    !!filters.organization_id ||
    !!filters.academic_module_id;

  // Determine which courses to display
  const courses =
    isSearchMode && searchResults
      ? searchResults.results.map(convertSearchItemToCourse)
      : coursesData?.data || [];

  const isLoadingCourses = isSearchMode ? isSearchLoading : isLoading;
  const departmentList = departmentCourses?.data || [];
  const facultyList = facultyCourses?.data || [];
  const universityList = universityCourses?.data || [];
  const exploreList = exploreAllCourses?.data || [];
  const generalList = generalCourses?.data || [];

  const isDiscoveryView = !isSearchMode && !groupMode && !showAllCourses;
  const seeAll = (
    group: "department" | "faculty" | "university" | "general" | "all"
  ) => setSearchParams({ group });

  const primaryFilters = (
    <>
      <FilterSelect
        label="Level"
        value={filters.level || ""}
        onChange={(value) => handleFilterChange("level", value)}
        options={LEVELS}
        placeholder="All levels"
      />
      <FilterSelect
        label="Sort"
        value={
          filters.sort_by
            ? `${filters.sort_by}:${filters.sort_order || "desc"}`
            : ""
        }
        onChange={handleSortChange}
        options={SORT_OPTIONS}
        placeholder="Default order"
      />
      <FilterSelect
        label="University"
        value={filters.university_id ? String(filters.university_id) : ""}
        onChange={(value) =>
          handleFilterChange("university_id", value ? Number(value) : undefined)
        }
        options={universities.map((uni) => ({
          value: String(uni.id),
          label: uni.name,
        }))}
        placeholder="All universities"
      />
    </>
  );

  const secondaryFilters = (
    <>
      <FilterSelect
        label="Faculty"
        value={filters.faculty_id ? String(filters.faculty_id) : ""}
        onChange={(value) =>
          handleFilterChange("faculty_id", value ? Number(value) : undefined)
        }
        options={faculties.map((faculty) => ({
          value: String(faculty.id),
          label: faculty.name,
        }))}
        placeholder="All faculties"
        disabled={!filters.university_id}
        disabledHint="Choose a university first"
      />
      <FilterSelect
        label="Department"
        value={filters.department_id ? String(filters.department_id) : ""}
        onChange={(value) =>
          handleFilterChange("department_id", value ? Number(value) : undefined)
        }
        options={departments.map((dept) => ({
          value: String(dept.id),
          label: dept.name,
        }))}
        placeholder="All departments"
        disabled={!filters.faculty_id}
        disabledHint="Choose a faculty first"
      />
      <FilterSelect
        label="Organization"
        value={filters.organization_id ? String(filters.organization_id) : ""}
        onChange={(value) =>
          handleFilterChange("organization_id", value ? Number(value) : undefined)
        }
        options={organizations.map((org) => ({
          value: String(org.id),
          label: org.name,
        }))}
        placeholder="All organizations"
      />
      <FilterSelect
        label="Module"
        value={
          filters.academic_module_id ? String(filters.academic_module_id) : ""
        }
        onChange={(value) =>
          handleFilterChange(
            "academic_module_id",
            value ? Number(value) : undefined
          )
        }
        options={academicModules.map((module) => ({
          value: String(module.id),
          label: module.label,
        }))}
        placeholder="All modules"
        disabled={!moduleScope}
        disabledHint="Choose a university first"
      />
    </>
  );

  const pagerButton =
    "rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <GuestBanner />
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Browse Courses
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover courses tailored to your interests, academic path, and
              learning goals.
            </p>
          </div>
          {!isDiscoveryView && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-transparent px-1 py-1 text-sm font-semibold text-azure-500 transition-colors hover:text-azure-600 dark:text-azure-700 dark:hover:text-azure-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to discovery
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <DiscoveryToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          searchPlaceholder="Search courses…"
          searchLabel="Search courses"
          primary={primaryFilters}
          secondary={secondaryFilters}
          secondaryDefaultOpen={moreFiltersActive}
          activeCount={activeFilterCount}
          onReset={handleResetFilters}
          sheetTitle="Filter courses"
        />

        {/* Roadmaps — a preview of guided journeys, on the curated view only */}
        {isDiscoveryView && <RoadmapsPreviewSection />}

        {/* Sub-courses view title when group is active */}
        {!isSearchMode && groupMode && (
          <div className="mb-6">
            <SectionHeader
              id="courses-group-title"
              title={
                groupMode === "department"
                  ? "Department Courses"
                  : groupMode === "general"
                    ? "General Courses"
                    : groupMode === "university"
                      ? "University Courses"
                      : groupMode === "faculty"
                        ? "Faculty Courses"
                        : "All Courses"
              }
              action={{
                label: "Back to recommendations",
                onClick: handleResetFilters,
              }}
            />
          </div>
        )}

        {/* Recommended by Department */}
        {isDiscoveryView && departmentList.length > 0 && (
          <CourseSection
            id="courses-department"
            title="Recommended in Your Department"
            courses={departmentList}
            source="dept-recommended"
            onSeeAll={() => seeAll("department")}
          />
        )}

        {/* General — open to every student, whatever their year (Round 10) */}
        {isDiscoveryView && generalList.length > 0 && (
          <CourseSection
            id="courses-general"
            title="General Courses"
            courses={generalList}
            source="general-recommended"
            onSeeAll={() => seeAll("general")}
          />
        )}

        {/* Recommended by Faculty */}
        {isDiscoveryView && facultyList.length > 0 && (
          <CourseSection
            id="courses-faculty"
            title="Recommended in Your Faculty"
            courses={facultyList}
            source="faculty-recommended"
            onSeeAll={() => seeAll("faculty")}
          />
        )}

        {/* Recommended by University */}
        {isDiscoveryView && universityList.length > 0 && (
          <CourseSection
            id="courses-university"
            title="Recommended in Your University"
            courses={universityList}
            source="university-recommended"
            onSeeAll={() => seeAll("university")}
          />
        )}

        {/* Explore All (Unfiltered) */}
        {isDiscoveryView && exploreList.length > 0 && (
          <CourseSection
            id="courses-explore"
            title="Explore All"
            courses={exploreList}
            source="explore-all"
            onSeeAll={() => seeAll("all")}
          />
        )}

        {/* Search Results Header */}
        {isSearchMode && searchQuery && (
          <div className="mb-6">
            <SectionHeader
              id="courses-search-title"
              title={`Search results for “${searchQuery}”`}
              subtitle={
                searchResults
                  ? `${searchResults.total} result${searchResults.total !== 1 ? "s" : ""} found`
                  : undefined
              }
              action={{ label: "Clear search", onClick: handleResetFilters }}
            />
          </div>
        )}

        {/* Results — the flat, full course list. Only shown once the user has
            moved past the curated preview rows above (via "See all", a
            filter, or a search), so the same courses aren't rendered twice on
            screen at once. */}
        {(showAllCourses || isSearchMode) &&
          (isLoadingCourses ? (
            <CourseGridSkeleton />
          ) : courses.length > 0 ? (
            <>
              <div className="mb-8">
                <CourseGrid courses={courses} source="courses-list" />
              </div>

              {/* Pagination */}
              {!isSearchMode && coursesData && coursesData.last_page > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, (prev.page || 1) - 1),
                      }))
                    }
                    disabled={coursesData.current_page === 1}
                    className={pagerButton}
                  >
                    Previous
                  </button>
                  <div className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white">
                    {coursesData.current_page} / {coursesData.last_page}
                  </div>
                  <button
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.min(
                          coursesData.last_page || 1,
                          (prev.page || 1) + 1
                        ),
                      }))
                    }
                    disabled={
                      coursesData.current_page === coursesData.last_page
                    }
                    className={pagerButton}
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Search Pagination */}
              {isSearchMode &&
                searchResults &&
                searchResults.total > (filters.per_page || 20) && (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() =>
                        setSearchOffset((prev) =>
                          Math.max(0, prev - (filters.per_page || 20))
                        )
                      }
                      disabled={searchOffset === 0}
                      className={pagerButton}
                    >
                      Previous
                    </button>
                    <div className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white">
                      Showing {searchOffset + 1}-
                      {Math.min(
                        searchOffset + (filters.per_page || 20),
                        searchResults.total
                      )}{" "}
                      of {searchResults.total}
                    </div>
                    <button
                      onClick={() =>
                        setSearchOffset((prev) => prev + (filters.per_page || 20))
                      }
                      disabled={
                        searchOffset + (filters.per_page || 20) >=
                        searchResults.total
                      }
                      className={pagerButton}
                    >
                      Next
                    </button>
                  </div>
                )}
            </>
          ) : (
            <EmptyState
              pose="shrug"
              title="No courses found"
              description="Try adjusting your search or filters."
              action={
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
                >
                  Reset filters
                </button>
              }
            />
          ))}
      </div>
    </PageShell>
  );
};
