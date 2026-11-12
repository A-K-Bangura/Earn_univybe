import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type {
  Opportunity,
  OpportunityFilters,
  OpportunityList,
  OpportunityVocabulary,
} from "../types/opportunity";

// Opportunities are fully public — no account, no token, not under /student.
// A guest and a signed-in student get byte-identical responses (a token is
// ignored — there is no personalisation). List/closed-list pagination is the
// sibling `{data, meta}` shape (meta at the top level of the envelope), same
// as resources/roadmaps/coins, not the raw Laravel paginator used by /courses.

type MetaEnvelope = { meta?: PageMeta };

// GET /opportunities/types — the type/action vocabulary. Cache long; it can
// grow but rarely does within a session.
export const getOpportunityVocabulary = async (): Promise<OpportunityVocabulary> => {
  const response = await api.get<ApiResponse<OpportunityVocabulary>>(
    "/opportunities/types"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch opportunity types"
    );
  }

  return response.data.data;
};

const buildOpportunityParams = (filters: OpportunityFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.append("search", filters.search.trim());
  filters.type?.forEach((type) => params.append("type[]", type));
  if (filters.location?.trim()) params.append("location", filters.location.trim());
  filters.tags?.forEach((tag) => params.append("tags[]", tag));
  if (filters.deadline_from) params.append("deadline_from", filters.deadline_from);
  if (filters.deadline_to) params.append("deadline_to", filters.deadline_to);
  if (filters.has_deadline !== undefined)
    params.append("has_deadline", String(filters.has_deadline));
  if (filters.page) params.append("page", String(filters.page));
  if (filters.per_page) params.append("per_page", String(filters.per_page));
  return params;
};

// GET /opportunities (open) or /opportunities/closed (past) — `closed` picks
// the endpoint; `filters.status` is never sent (the endpoint already implies it).
export const getOpportunities = async (
  filters: OpportunityFilters = {},
  closed = false
): Promise<OpportunityList> => {
  const params = buildOpportunityParams(filters);
  const path = closed ? "/opportunities/closed" : "/opportunities";

  const response = await api.get<ApiResponse<Opportunity[]> & MetaEnvelope>(
    `${path}?${params.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch opportunities");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// GET /opportunities/{id|uuid} — works for an open or a closed opportunity.
export const getOpportunity = async (
  opportunityId: string | number
): Promise<Opportunity> => {
  const response = await api.get<ApiResponse<{ opportunity: Opportunity }>>(
    `/opportunities/${encodeURIComponent(String(opportunityId))}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Opportunity not found");
  }

  return response.data.data.opportunity;
};

/**
 * A deleted/nonexistent opportunity id returns Laravel's bare 404 body, not
 * the `{success,error}` envelope — key off the HTTP status, same pattern as
 * `services/resources.ts::isNotFoundError`.
 */
export const isOpportunityNotFoundError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
};
