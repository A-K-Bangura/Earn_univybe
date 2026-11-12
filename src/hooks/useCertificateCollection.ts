import { useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { CertificateCandidate, EnrolledProgressPage } from "../types/certificate";
import { getEnrolledProgressPage } from "../services/certificates";
import { mergeCompleted, seenKeys, sortByCompletionDate } from "../utils/certificates/enrolledPage";

/** A runaway guard for a backend that never stops returning pages. */
const MAX_PAGES = 100;

/** Query-key root for everything certificate-related (cleared wholesale on logout). */
export const CERTIFICATES_QUERY_KEY = "certificates";

interface Options {
  accountId: string | null;
  /**
   * Keep loading further pages on its own until this many completed courses
   * are known (the Profile preview wants 3). Omit to load one page and wait
   * for "Load more courses".
   */
  autoLoadUntil?: number;
  /** Cap on automatic page loads, so a Profile visit never scans every enrollment. */
  maxAutoPages?: number;
}

/**
 * The student's completed courses, gathered page by page from the existing
 * enrolled-course list (it has no completed-only filter, and none is invented).
 *
 * A page with no completions says nothing about later pages, so "no
 * certificates" is only reported once the source list is *exhausted*, and the
 * list is only date-sorted once it is complete.
 */
export const useCertificateCollection = ({ accountId, autoLoadUntil, maxAutoPages = 3 }: Options) => {
  const query = useInfiniteQuery({
    queryKey: [CERTIFICATES_QUERY_KEY, "enrolled", accountId],
    enabled: !!accountId,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getEnrolledProgressPage(pageParam),
    getNextPageParam: (last: EnrolledProgressPage, all: EnrolledProgressPage[]) => {
      if (last.hasMore === false) return undefined;
      // Empty page: the list has ended (also the stop for responses with no pagination info).
      if (last.records.length === 0) return undefined;
      // A backend that ignores `page` keeps returning the same records: stop.
      const earlier = seenKeys(all.slice(0, -1));
      if (all.length > 1 && last.records.every((r) => earlier.has(r.key))) return undefined;
      if (all.length >= MAX_PAGES) return undefined;
      return all.length + 1;
    },
    // Re-reading every page on each visit would be an eager full scan.
    staleTime: 5 * 60_000,
  });

  const pages = query.data?.pages;
  const pagesLoaded = pages?.length ?? 0;
  const completed = useMemo(() => (pages ? mergeCompleted(pages) : []), [pages]);

  const exhausted = !!pages && !query.hasNextPage && !query.isError;

  const certificates: CertificateCandidate[] = useMemo(
    () => (exhausted ? sortByCompletionDate(completed) : completed),
    [exhausted, completed]
  );

  const { hasNextPage, isFetching, isError, fetchNextPage } = query;
  useEffect(() => {
    if (autoLoadUntil === undefined) return;
    if (!hasNextPage || isFetching || isError) return;
    if (completed.length >= autoLoadUntil || pagesLoaded >= maxAutoPages) return;
    void fetchNextPage();
  }, [autoLoadUntil, maxAutoPages, hasNextPage, isFetching, isError, completed.length, pagesLoaded, fetchNextPage]);

  return {
    certificates,
    isLoading: query.isPending && !!accountId,
    /** First page failed: nothing is known yet — show Retry, not an empty state. */
    loadError: query.isError && pagesLoaded === 0,
    /** A later page failed: what was found stays visible. */
    moreError: query.isError && pagesLoaded > 0,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    exhausted,
    pagesChecked: pagesLoaded,
    loadMore: () => void query.fetchNextPage(),
    retry: () => (pagesLoaded === 0 ? void query.refetch() : void query.fetchNextPage()),
  };
};
