import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type { AcademicModule, AcademicModuleFilters } from "../types/academicModule";

// Public, like the university/faculty/department lookups — no auth required.
// The `{ data, meta }` envelope has `meta` as a sibling of `data` (same shape
// as roadmaps), not the raw Laravel paginator courses use.
type MetaEnvelope = { meta?: PageMeta };

export interface AcademicModuleList {
  data: AcademicModule[];
  meta: PageMeta;
}

// GET /academic-modules — populates a module picker/filter. The backend
// requires at least one of department_id/faculty_id/university_id (422
// otherwise), so callers must always provide one.
export const getAcademicModules = async (
  filters: AcademicModuleFilters
): Promise<AcademicModuleList> => {
  const response = await api.get<ApiResponse<AcademicModule[]> & MetaEnvelope>(
    "/academic-modules",
    {
      params: {
        department_id: filters.department_id,
        faculty_id: filters.faculty_id,
        university_id: filters.university_id,
        scope: filters.scope,
        search: filters.search,
        per_page: filters.per_page,
      },
    }
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(
      response.data.message || "Failed to fetch academic modules"
    );
  }

  return { data: response.data.data, meta: response.data.meta };
};
