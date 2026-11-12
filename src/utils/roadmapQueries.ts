import type { QueryClient } from "@tanstack/react-query";

/**
 * Roadmap progress, participation and the current course are all derived from
 * course enrollment/completion, so anything that changes those must refresh
 * the roadmap views: list/preview (`roadmaps`), journey (`roadmap`) and its
 * stage pages (`roadmap-courses`). Roadmaps can also change on the admin side,
 * which is why these are never cached across sessions (default staleTime).
 */
export const invalidateRoadmapQueries = (queryClient: QueryClient): void => {
  queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
  queryClient.invalidateQueries({ queryKey: ["roadmap"] });
  queryClient.invalidateQueries({ queryKey: ["roadmap-courses"] });
};
