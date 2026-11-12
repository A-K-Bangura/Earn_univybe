import api from "./api";
import type { ApiResponse } from "../types";
import type {
  University,
  Faculty,
  Department,
  Organization,
} from "../types/onboarding";

// The lookup endpoints are public and documented as "paginated"
// (docs/STUDENT_API_PAYLOADS.md), but the app has always consumed `data` as a
// bare array. Accept either shape so a backend that wraps the list in a
// Laravel paginator ({ data: [...] }) can't turn the selectors into a crash or
// a misleading "nothing here".
type ListPayload<T> = T[] | { data?: T[] } | null | undefined;

const unwrapList = <T>(payload: ListPayload<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

// Get all universities
export const getUniversities = async (): Promise<University[]> => {
  const response = await api.get<ApiResponse<ListPayload<University>>>(
    "/universities"
  );
  return unwrapList(response.data.data);
};

// Get all organizations
export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get<ApiResponse<ListPayload<Organization>>>(
    "/organizations"
  );
  return unwrapList(response.data.data);
};

// Get faculties for a university
export const getFaculties = async (
  universityId: number
): Promise<Faculty[]> => {
  const response = await api.get<ApiResponse<ListPayload<Faculty>>>(
    `/universities/${universityId}/faculties`
  );
  return unwrapList(response.data.data);
};

// Get departments for a faculty
export const getDepartments = async (
  universityId: number,
  facultyId: number
): Promise<Department[]> => {
  const response = await api.get<ApiResponse<ListPayload<Department>>>(
    `/universities/${universityId}/faculties/${facultyId}/departments`
  );
  return unwrapList(response.data.data);
};
