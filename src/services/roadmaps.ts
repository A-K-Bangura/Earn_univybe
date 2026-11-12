import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type {
  RoadmapCourseItem,
  RoadmapCoursesPage,
  RoadmapDetail,
  RoadmapFilters,
  RoadmapList,
  RoadmapPageParams,
  Roadmap,
} from "../types/roadmap";

// Roadmap endpoints are public (like course browsing). The axios request
// interceptor adds the Bearer token when there is one, which is what turns on
// the student's own standing (`progress`, `is_participant`, `current_course`)
// and the profile-based ordering. A guest simply gets those fields empty.
//
// Their pagination is the sibling `{ data, meta }` shape (meta at the top
// level of the envelope), not the raw Laravel paginator used by /courses.

type MetaEnvelope = { meta?: PageMeta };

const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeRoadmap = (roadmap: Roadmap): Roadmap => ({
  ...roadmap,
  progress: roadmap.progress
    ? { ...roadmap.progress, percent: toNumber(roadmap.progress.percent) }
    : null,
});

const normalizeCourseItem = (item: RoadmapCourseItem): RoadmapCourseItem => ({
  ...item,
  progress_percent: toNumber(item.progress_percent),
});

// GET /student/roadmaps — discovery list.
export const getRoadmaps = async (
  filters: RoadmapFilters = {}
): Promise<RoadmapList> => {
  const response = await api.get<ApiResponse<Roadmap[]> & MetaEnvelope>(
    "/student/roadmaps",
    {
      params: {
        search: filters.search?.trim() || undefined,
        university_id: filters.university_id,
        faculty_id: filters.faculty_id,
        department_id: filters.department_id,
        organization_id: filters.organization_id,
        level: filters.level,
        semester: filters.semester,
        participating: filters.participating ? "true" : undefined,
        sort: filters.sort,
        page: filters.page,
        per_page: filters.per_page,
      },
    }
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch roadmaps");
  }

  return {
    data: response.data.data.map(normalizeRoadmap),
    meta: response.data.meta,
  };
};

// GET /student/roadmaps/{roadmap} — the roadmap, the student's standing, and
// ONE page of its courses. `{roadmap}` is the id, uuid or slug.
export const getRoadmap = async (
  roadmapId: string | number,
  params: RoadmapPageParams = {}
): Promise<RoadmapDetail> => {
  const response = await api.get<
    ApiResponse<{ roadmap: Roadmap; courses: RoadmapCourseItem[] }> &
      MetaEnvelope
  >(`/student/roadmaps/${encodeURIComponent(String(roadmapId))}`, {
    params: { page: params.page, per_page: params.per_page },
  });

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch roadmap");
  }

  const { roadmap, courses } = response.data.data;
  return {
    roadmap: normalizeRoadmap(roadmap),
    courses: (courses ?? []).map(normalizeCourseItem),
    meta: response.data.meta,
  };
};

// GET /student/roadmaps/{roadmap}/courses — the lighter call for flipping
// pages of a long roadmap once the roadmap itself has been loaded. Paging
// never affects progress, so there is no roadmap block here.
export const getRoadmapCourses = async (
  roadmapId: string | number,
  params: RoadmapPageParams = {}
): Promise<RoadmapCoursesPage> => {
  const response = await api.get<ApiResponse<RoadmapCourseItem[]> & MetaEnvelope>(
    `/student/roadmaps/${encodeURIComponent(String(roadmapId))}/courses`,
    { params: { page: params.page, per_page: params.per_page } }
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(
      response.data.message || "Failed to fetch roadmap courses"
    );
  }

  return {
    data: response.data.data.map(normalizeCourseItem),
    meta: response.data.meta,
  };
};
