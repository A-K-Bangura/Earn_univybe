import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type {
  Resource,
  ResourceVocabulary,
  ResourceFilters,
  ResourceList,
  ResourceDetail,
  CourseResourcesResult,
  ResourceUsage,
  ResourceAccessResult,
  ResourcePurchase,
  ResourcePurchaseList,
} from "../types/resource";

// Resource browsing (list/details/course-resources) is public, like course
// browsing — the axios request interceptor adds the Bearer token when there
// is one, which is what turns on relevance_score/accessed_today and
// personalised ordering. Opening/downloading and buying access packs need a
// Student account.
//
// List/purchase-list pagination is the sibling `{data, meta}` shape (meta at
// the top level of the envelope, not nested inside `data`) — same as coins
// and roadmaps, not the raw Laravel paginator used by /courses.

type MetaEnvelope = { meta?: PageMeta };

// GET /resources/types — no /student prefix, shared with tutor/admin portals.
export const getResourceVocabulary = async (): Promise<ResourceVocabulary> => {
  const response =
    await api.get<ApiResponse<ResourceVocabulary>>("/resources/types");

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch resource types"
    );
  }

  return response.data.data;
};

// GET /student/resources — discover.
export const getResources = async (
  filters: ResourceFilters = {}
): Promise<ResourceList> => {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.append("search", filters.search.trim());
  if (filters.resource_type) params.append("resource_type", filters.resource_type);
  if (filters.source_type) params.append("source_type", filters.source_type);
  if (filters.format) params.append("format", filters.format);
  if (filters.subject) params.append("subject", filters.subject);
  if (filters.module) params.append("module", filters.module);
  filters.tags?.forEach((tag) => params.append("tags[]", tag));
  if (filters.university_id) params.append("university_id", String(filters.university_id));
  if (filters.faculty_id) params.append("faculty_id", String(filters.faculty_id));
  if (filters.department_id) params.append("department_id", String(filters.department_id));
  if (filters.organization_id) params.append("organization_id", String(filters.organization_id));
  if (filters.level) params.append("level", filters.level);
  if (filters.semester) params.append("semester", filters.semester);
  if (filters.publication_year) params.append("publication_year", String(filters.publication_year));
  if (filters.course_id) params.append("course_id", String(filters.course_id));
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.per_page) params.append("per_page", String(filters.per_page));

  const response = await api.get<ApiResponse<Resource[]> & MetaEnvelope>(
    `/student/resources?${params.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch resources");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// GET /student/resources/{resource} — id or uuid.
export const getResource = async (
  resourceId: string | number
): Promise<ResourceDetail> => {
  const response = await api.get<
    ApiResponse<{ resource: Resource; usage: ResourceUsage | null }>
  >(`/student/resources/${encodeURIComponent(String(resourceId))}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Resource not found");
  }

  return response.data.data;
};

// GET /student/courses/{course}/resources — the published course's resources
// in the creator's order, plus usage. No pagination — it's the whole list.
export const getCourseResources = async (
  courseId: string | number
): Promise<CourseResourcesResult> => {
  const response = await api.get<
    ApiResponse<{ resources: Resource[]; usage: ResourceUsage | null }>
  >(`/student/courses/${encodeURIComponent(String(courseId))}/resources`);

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch course resources"
    );
  }

  return response.data.data;
};

// GET /student/resources/usage — today's allowance.
export const getResourceUsage = async (): Promise<ResourceUsage> => {
  const response = await api.get<ApiResponse<{ usage: ResourceUsage }>>(
    "/student/resources/usage"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch resource usage");
  }

  return response.data.data.usage;
};

// POST /student/resources/{resource}/access — the only call that returns a
// file link or external URL, and where the allowance is spent. Call this
// every time the student taps Open/Download, never reuse an old link.
export const accessResource = async (
  resourceId: string | number,
  disposition?: "inline" | "attachment"
): Promise<ResourceAccessResult> => {
  const response = await api.post<ApiResponse<ResourceAccessResult>>(
    `/student/resources/${encodeURIComponent(String(resourceId))}/access`,
    disposition ? { disposition } : {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to access resource");
  }

  return response.data.data;
};

// POST /student/resources/purchases — start (or resume) buying the
// currently-offered access pack. No body.
export const purchaseResourcePack = async (): Promise<ResourcePurchase> => {
  const response = await api.post<ApiResponse<{ purchase: ResourcePurchase }>>(
    "/student/resources/purchases",
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to start access-pack purchase"
    );
  }

  return response.data.data.purchase;
};

// GET /student/resources/purchases/{purchase} — re-checks with Monime while
// still pending, so poll this after a `purchase=processing` return.
export const getResourcePurchase = async (
  purchaseId: string
): Promise<{ purchase: ResourcePurchase; usage: ResourceUsage }> => {
  const response = await api.get<
    ApiResponse<{ purchase: ResourcePurchase; usage: ResourceUsage }>
  >(`/student/resources/purchases/${encodeURIComponent(purchaseId)}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch purchase");
  }

  return response.data.data;
};

// GET /student/resources/purchases — the student's own purchases, newest first.
export const getResourcePurchases = async (params?: {
  page?: number;
  per_page?: number;
}): Promise<ResourcePurchaseList> => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.per_page) query.append("per_page", String(params.per_page));

  const response = await api.get<ApiResponse<ResourcePurchase[]> & MetaEnvelope>(
    `/student/resources/purchases?${query.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch purchases");
  }

  return { data: response.data.data, meta: response.data.meta };
};

/**
 * A deleted/nonexistent resource (or course) id returns Laravel's bare 404
 * body, not the `{success,error}` envelope — key off the HTTP status, same
 * pattern as `RoadmapJourney.tsx`'s equivalent helper.
 */
export const isNotFoundError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
};
