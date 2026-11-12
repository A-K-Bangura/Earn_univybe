import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type {
  Gig,
  GigApplicant,
  GigApplicantList,
  GigContactMethod,
  GigFilters,
  GigInterestList,
  GigInterestResult,
  GigList,
  GigOptions,
  GigCategoryOption,
  GigReview,
  PostedGig,
  PostedGigList,
  PostGigPayload,
  ReopenGigPayload,
  StudentGigReviews,
  UpdateGigSettingsPayload,
} from "../types/gig";

// Browsing (list/closed-list/detail) is public, like opportunities/resources
// — the axios request interceptor adds the Bearer token when there is one,
// which is what turns on the per-viewer `viewer` block. Everything under
// /student needs a Student account. List pagination is the sibling
// `{data, meta}` shape, same as opportunities/resources/roadmaps/coins.

type MetaEnvelope = { meta?: PageMeta };

// GET /gigs/options — pricing/work-mode/capacity vocab, currency, rating & limits.
export const getGigOptions = async (): Promise<GigOptions> => {
  const response = await api.get<ApiResponse<GigOptions>>("/gigs/options");

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch gig options");
  }

  return response.data.data;
};

// GET /gigs/categories — active categories only, admin order.
export const getGigCategories = async (): Promise<GigCategoryOption[]> => {
  const response = await api.get<ApiResponse<{ categories: GigCategoryOption[] }>>(
    "/gigs/categories"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch gig categories");
  }

  return response.data.data.categories;
};

const buildGigParams = (filters: GigFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.append("search", filters.search.trim());
  filters.category?.forEach((category) => params.append("category[]", category));
  filters.pricing_type?.forEach((type) => params.append("pricing_type[]", type));
  filters.work_mode?.forEach((mode) => params.append("work_mode[]", mode));
  if (filters.location?.trim()) params.append("location", filters.location.trim());
  filters.skills?.forEach((skill) => params.append("skills[]", skill));
  filters.tags?.forEach((tag) => params.append("tags[]", tag));
  if (filters.deadline_from) params.append("deadline_from", filters.deadline_from);
  if (filters.deadline_to) params.append("deadline_to", filters.deadline_to);
  if (filters.has_deadline !== undefined)
    params.append("has_deadline", String(filters.has_deadline));
  if (filters.page) params.append("page", String(filters.page));
  if (filters.per_page) params.append("per_page", String(filters.per_page));
  return params;
};

// GET /gigs (open) or /gigs/closed — `closed` picks the endpoint.
export const getGigs = async (
  filters: GigFilters = {},
  closed = false
): Promise<GigList> => {
  const params = buildGigParams(filters);
  const path = closed ? "/gigs/closed" : "/gigs";

  const response = await api.get<ApiResponse<Gig[]> & MetaEnvelope>(
    `${path}?${params.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch gigs");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// GET /gigs/{id|uuid} — open or closed gigs are both served.
export const getGig = async (gigId: string | number): Promise<Gig> => {
  const response = await api.get<ApiResponse<{ gig: Gig }>>(
    `/gigs/${encodeURIComponent(String(gigId))}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Gig not found");
  }

  return response.data.data.gig;
};

// POST /student/gigs/{gig}/interest — records interest first, then returns
// the creator's contact details for THIS gig. Call fresh every time the
// student taps Contact; never reuse a previous response.
export const expressGigInterest = async (
  gigId: string | number,
  method?: GigContactMethod
): Promise<GigInterestResult> => {
  const response = await api.post<ApiResponse<GigInterestResult>>(
    `/student/gigs/${encodeURIComponent(String(gigId))}/interest`,
    method ? { method } : {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to record interest");
  }

  return response.data.data;
};

// GET /student/gigs/interests — gigs I've shown interest in.
export const getGigInterests = async (params?: {
  worked_with?: boolean;
  page?: number;
  per_page?: number;
}): Promise<GigInterestList> => {
  const query = new URLSearchParams();
  if (params?.worked_with !== undefined)
    query.append("worked_with", String(params.worked_with));
  if (params?.page) query.append("page", String(params.page));
  if (params?.per_page) query.append("per_page", String(params.per_page));

  const response = await api.get<ApiResponse<GigInterestList["data"]> & MetaEnvelope>(
    `/student/gigs/interests?${query.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch gig interests");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// PUT /student/gigs/{gig}/creator-rating — rate the (student) creator back.
export const rateGigCreator = async (
  gigId: string | number,
  body: { rating: number; review?: string }
): Promise<GigReview> => {
  const response = await api.put<ApiResponse<{ rating: GigReview }>>(
    `/student/gigs/${encodeURIComponent(String(gigId))}/creator-rating`,
    body
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to save rating");
  }

  return response.data.data.rating;
};

// POST /student/posted-gigs — create a draft (optionally `submit:true`).
export const createPostedGig = async (
  payload: PostGigPayload
): Promise<PostedGig> => {
  const response = await api.post<ApiResponse<{ gig: PostedGig }>>(
    "/student/posted-gigs",
    payload
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to create gig");
  }

  return response.data.data.gig;
};

// PUT /student/posted-gigs/{gig} — edit content; draft/rejected only.
export const updatePostedGig = async (
  gigId: string | number,
  payload: Partial<PostGigPayload>
): Promise<PostedGig> => {
  const response = await api.put<ApiResponse<{ gig: PostedGig }>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}`,
    payload
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to update gig");
  }

  return response.data.data.gig;
};

// GET /student/posted-gigs — my gigs.
export const getPostedGigs = async (filters?: {
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<PostedGigList> => {
  const query = new URLSearchParams();
  if (filters?.status) query.append("status", filters.status);
  if (filters?.page) query.append("page", String(filters.page));
  if (filters?.per_page) query.append("per_page", String(filters.per_page));

  const response = await api.get<ApiResponse<PostedGig[]> & MetaEnvelope>(
    `/student/posted-gigs?${query.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch your gigs");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// GET /student/posted-gigs/{gig} — one, management shape.
export const getPostedGig = async (gigId: string | number): Promise<PostedGig> => {
  const response = await api.get<ApiResponse<{ gig: PostedGig }>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Gig not found");
  }

  return response.data.data.gig;
};

// DELETE /student/posted-gigs/{gig} — draft/rejected only.
export const deletePostedGig = async (gigId: string | number): Promise<void> => {
  const response = await api.delete<ApiResponse<void>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}`
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete gig");
  }
};

// POST /student/posted-gigs/{gig}/submit — draft/rejected -> pending_approval.
export const submitPostedGig = async (gigId: string | number): Promise<PostedGig> => {
  const response = await api.post<ApiResponse<{ gig: PostedGig }>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/submit`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to submit gig");
  }

  return response.data.data.gig;
};

// PUT /student/posted-gigs/{gig}/settings — capacity/limit and deadline only,
// works even on a live gig, no new review needed.
export const updatePostedGigSettings = async (
  gigId: string | number,
  body: UpdateGigSettingsPayload
): Promise<PostedGig> => {
  const response = await api.put<ApiResponse<{ gig: PostedGig }>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/settings`,
    body
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to update settings");
  }

  return response.data.data.gig;
};

// POST /student/posted-gigs/{gig}/close — published only.
export const closePostedGig = async (
  gigId: string | number,
  note?: string
): Promise<PostedGig> => {
  const response = await api.post<ApiResponse<{ gig: PostedGig }>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/close`,
    note ? { note } : {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to close gig");
  }

  return response.data.data.gig;
};

// POST /student/posted-gigs/{gig}/reopen — must leave the gig genuinely open.
export const reopenPostedGig = async (
  gigId: string | number,
  body?: ReopenGigPayload
): Promise<PostedGig> => {
  const response = await api.post<ApiResponse<{ gig: PostedGig }>>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/reopen`,
    body ?? {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to reopen gig");
  }

  return response.data.data.gig;
};

// GET /student/posted-gigs/{gig}/applicants — who is interested.
export const getGigApplicants = async (
  gigId: string | number,
  params?: { worked_with?: boolean; search?: string; page?: number; per_page?: number }
): Promise<GigApplicantList> => {
  const query = new URLSearchParams();
  if (params?.worked_with !== undefined)
    query.append("worked_with", String(params.worked_with));
  if (params?.search?.trim()) query.append("search", params.search.trim());
  if (params?.page) query.append("page", String(params.page));
  if (params?.per_page) query.append("per_page", String(params.per_page));

  const response = await api.get<ApiResponse<GigApplicant[]> & MetaEnvelope>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/applicants?${query.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch applicants");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// PUT /student/posted-gigs/{gig}/applicants/{interest}/worked-with — NOTE:
// the backend returns the bare boolean `true`/`false` here, not the usual
// `{success,data}` envelope. Don't "fix" this back to expecting one.
export const setApplicantWorkedWith = async (
  gigId: string | number,
  interestId: string,
  workedWith: boolean
): Promise<boolean> => {
  const response = await api.put<boolean>(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/applicants/${encodeURIComponent(interestId)}/worked-with`,
    { worked_with: workedWith }
  );

  return response.data;
};

// PUT /student/posted-gigs/{gig}/applicants/{interest}/rating — only if Worked With.
export const rateApplicant = async (
  gigId: string | number,
  interestId: string,
  body: { rating: number; review?: string }
): Promise<{ rating: GigReview; applicant: GigApplicant }> => {
  const response = await api.put<
    ApiResponse<{ rating: GigReview; applicant: GigApplicant }>
  >(
    `/student/posted-gigs/${encodeURIComponent(String(gigId))}/applicants/${encodeURIComponent(interestId)}/rating`,
    body
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to save rating");
  }

  return response.data.data;
};

// GET /gigs/students/{studentUuid}/reviews — any signed-in account, paginated.
export const getStudentGigReviews = async (
  studentUuid: string,
  params?: { page?: number; per_page?: number }
): Promise<{ data: StudentGigReviews; meta: PageMeta }> => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.per_page) query.append("per_page", String(params.per_page));

  const response = await api.get<ApiResponse<StudentGigReviews> & MetaEnvelope>(
    `/gigs/students/${encodeURIComponent(studentUuid)}/reviews?${query.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch reviews");
  }

  return { data: response.data.data, meta: response.data.meta };
};

/**
 * A deleted/nonexistent gig id returns Laravel's bare 404 body, not the
 * `{success,error}` envelope — key off the HTTP status, same pattern as
 * `services/resources.ts::isNotFoundError`.
 */
export const isGigNotFoundError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
};
