import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDepartments,
  getFaculties,
  getOrganizations,
  getUniversities,
} from "../services/onboarding";

// An institution can be added by an admin while the student is away (e.g. after
// they message support). Revalidate when the tab regains focus, but only once
// the data is this old, so tabbing back and forth doesn't hammer the API.
const LOOKUP_STALE_MS = 30_000;
const FRESHNESS = {
  staleTime: LOOKUP_STALE_MS,
  refetchOnWindowFocus: true,
} as const;

interface Selection {
  universityId: number | null;
  facultyId: number | null;
}

/**
 * University -> faculty -> department (+ organization) lookups for onboarding.
 *
 * Query keys are the same ones Courses/Roadmaps/Resources/Profile use, so the
 * cache is shared and `refresh*` invalidates it for all of them.
 *
 * `departments` only loads once the chosen faculty has been confirmed to be in
 * the chosen university's faculty list, so a stale/restored mismatched pair is
 * never sent to the API.
 */
export const useInstitutionLookups = ({ universityId, facultyId }: Selection) => {
  const queryClient = useQueryClient();

  const universities = useQuery({
    queryKey: ["universities"],
    queryFn: getUniversities,
    ...FRESHNESS,
  });

  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    ...FRESHNESS,
  });

  const universityConfirmed =
    !!universityId &&
    !!universities.data &&
    universities.data.some((u) => u.id === universityId);

  const faculties = useQuery({
    queryKey: ["faculties", universityId],
    queryFn: () => getFaculties(universityId as number),
    enabled: universityConfirmed,
    ...FRESHNESS,
  });

  const facultyConfirmed =
    universityConfirmed &&
    !!facultyId &&
    !!faculties.data &&
    faculties.data.some((f) => f.id === facultyId);

  const departments = useQuery({
    queryKey: ["departments", universityId, facultyId],
    queryFn: () => getDepartments(universityId as number, facultyId as number),
    enabled: facultyConfirmed,
    ...FRESHNESS,
  });

  const refreshUniversities = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["universities"] }),
    [queryClient]
  );
  const refreshFaculties = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: ["faculties", universityId] }),
    [queryClient, universityId]
  );
  const refreshDepartments = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ["departments", universityId, facultyId],
      }),
    [queryClient, universityId, facultyId]
  );

  return {
    universities,
    faculties,
    departments,
    organizations,
    universityConfirmed,
    facultyConfirmed,
    refreshUniversities,
    refreshFaculties,
    refreshDepartments,
  };
};
