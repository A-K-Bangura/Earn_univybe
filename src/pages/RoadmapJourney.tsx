import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import type { AxiosError } from "axios";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { BottomSheet } from "../components/common/BottomSheet";
import { RoadmapAmbient } from "../components/roadmap/RoadmapAmbient";
import { RoadmapCompletionBadgeSection } from "../components/roadmap/RoadmapCompletionBadgeSection";
import { RoadmapJourneyHeader } from "../components/roadmap/RoadmapJourneyHeader";
import { RoadmapNodePreviewCard } from "../components/roadmap/RoadmapNodePreviewCard";
import { RoadmapPath } from "../components/roadmap/RoadmapPath";
import { RoadmapStageNavigation } from "../components/roadmap/RoadmapStageNavigation";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { getRoadmap, getRoadmapCourses } from "../services/roadmaps";
import { isAuthenticated } from "../services/auth";
import { getInkOn, getRoadmapPageThemeColor } from "../utils/brandColors";
import { gsap } from "../utils/gsapSetup";
import type { RoadmapCourseItem } from "../types/roadmap";

// How many courses make up one stage of the journey. Chosen so that a typical
// roadmap fits on a single stage; longer ones page by stage. (The API default
// is 7 and it allows up to 50 — the client picks.)
const STAGE_SIZE = 8;

const isNotFound = (error: unknown): boolean =>
  (error as AxiosError | undefined)?.response?.status === 404;

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SkeletonJourney = () => (
  <div aria-hidden className="mx-auto mt-12 flex max-w-xl animate-pulse flex-col items-center gap-14">
    {[40, 62, 36, 58].map((offset, i) => (
      <span
        key={i}
        className="h-16 w-16 rounded-full bg-white/10"
        style={{ marginLeft: `${offset - 50}%` }}
      />
    ))}
  </div>
);

export const RoadmapJourney = () => {
  const { roadmapId = "" } = useParams<{ roadmapId: string }>();
  const signedIn = isAuthenticated();
  // Phones get the tighter path and tap-to-open sheet; a hover-capable pointer
  // gets the floating preview.
  const compact = !useMediaQuery("(min-width: 640px)");
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<HTMLDivElement>(null);
  // `null` = follow the stage the API opened on (the student's current course).
  const [stage, setStage] = useState<number | null>(null);
  const [selected, setSelected] = useState<RoadmapCourseItem | null>(null);
  const [pendingScroll, setPendingScroll] = useState<"current" | "start" | null>(null);

  // The roadmap, the student's standing and one page of courses. `page=current`
  // lands a returning student on the stage holding their current course.
  const detailQuery = useQuery({
    // Personalised when signed in, so guest/student responses never share a cache entry.
    queryKey: ["roadmap", roadmapId, signedIn, STAGE_SIZE],
    queryFn: () => getRoadmap(roadmapId, { page: "current", per_page: STAGE_SIZE }),
    enabled: !!roadmapId,
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 1,
  });
  const detail = detailQuery.data;
  const roadmap = detail?.roadmap;
  const openedOnStage = detail?.meta.current_page;
  const lastStage = detail?.meta.last_page ?? 1;
  const activeStage = stage ?? openedOnStage ?? 1;

  // Flipping to another stage uses the lighter courses endpoint (progress and
  // the current course don't change when paging).
  const needsPage = !!detail && activeStage !== openedOnStage;
  const pageQuery = useQuery({
    queryKey: ["roadmap-courses", roadmapId, signedIn, STAGE_SIZE, activeStage],
    queryFn: () => getRoadmapCourses(roadmapId, { page: activeStage, per_page: STAGE_SIZE }),
    enabled: needsPage,
  });
  const items = needsPage ? pageQuery.data?.data : detail?.courses;
  const stageLoading = needsPage && pageQuery.isLoading;

  // Each stage gets its own page colour: varied, but the same every time.
  const accent = roadmap ? getRoadmapPageThemeColor(roadmap.slug, activeStage) : "#3A86FF";
  const ink = getInkOn(accent);

  const scrollTo = (el: Element | null, block: ScrollLogicalPosition) =>
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block });

  // Jump after the target stage has rendered (see handlePrimaryAction/changeStage).
  useEffect(() => {
    if (!pendingScroll || !items) return;
    scrollTo(
      pendingScroll === "current" ? document.getElementById("journey-current") : pathRef.current,
      pendingScroll === "current" ? "center" : "start"
    );
    setPendingScroll(null);
  }, [pendingScroll, items]);

  // Stage change: the old nodes drift away, then the new stage's colour and
  // nodes animate in (RoadmapPath plays the entrance). Instant when reduced.
  const changeStage = (next: number, scrollAfter: "start" | "current" = "start") => {
    if (next === activeStage || next < 1 || next > lastStage) return;
    const nodes = rootRef.current?.querySelectorAll("[data-journey-node]");
    const commit = () => {
      setStage(next);
      setPendingScroll(scrollAfter);
    };
    if (!nodes || nodes.length === 0 || prefersReducedMotion()) {
      commit();
      return;
    }
    gsap.to(nodes, {
      opacity: 0,
      y: -14,
      duration: 0.2,
      stagger: 0.02,
      ease: "power1.in",
      onComplete: commit,
    });
  };

  // A positioning aid only: it never joins or enrols the student in anything.
  const goToCurrent = () => {
    const current = roadmap?.current_course;
    if (!current) return;
    if (current.page !== activeStage) changeStage(current.page, "current");
    else setPendingScroll("current");
  };

  // ---- states ----
  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <div className="-mb-20 bg-[#0b1026] px-4 pt-12 pb-28 md:-mb-4 md:pb-20">
          <div aria-busy className="mx-auto max-w-3xl animate-pulse">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="mt-5 h-12 w-3/4 rounded bg-white/10" />
            <div className="mt-4 h-4 w-2/3 rounded bg-white/10" />
          </div>
          <SkeletonJourney />
        </div>
      </PageShell>
    );
  }

  if (detailQuery.isError || !roadmap) {
    const missing = isNotFound(detailQuery.error);
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <EmptyState
            pose="shrug"
            title={missing ? "We couldn't find that roadmap" : "We couldn't load this roadmap"}
            description={
              missing
                ? "It may have been unpublished or the link may be out of date."
                : "Check your connection and try again."
            }
            action={
              <div className="own-links flex flex-wrap justify-center gap-3">
                {!missing && (
                  <button
                    type="button"
                    onClick={() => detailQuery.refetch()}
                    className="rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
                  >
                    Try again
                  </button>
                )}
                <Link
                  to="/roadmaps"
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Browse roadmaps
                </Link>
              </div>
            }
          />
        </div>
      </PageShell>
    );
  }

  const isLastStage = activeStage === lastStage;

  return (
    <PageShell>
      {/* `own-links`: this page styles its own links (see index.css). The dark
          surface runs under the mobile bottom nav's spacing so no light strip shows. */}
      <div
        ref={rootRef}
        className="own-links relative isolate -mb-20 min-h-svh bg-[#0b1026] text-white md:-mb-4 md:min-h-[calc(100svh-5rem)]"
      >
        <RoadmapAmbient accent={accent} />

        <div className="relative z-10 px-4 pt-4 pb-28 sm:px-6 sm:pt-6 md:pb-20">
          <RoadmapJourneyHeader
            roadmap={roadmap}
            accent={accent}
            ink={ink}
            signedIn={signedIn}
            onGoToCurrent={goToCurrent}
          />

          {/* The course nodes are the point of the page: they start right under the bar. */}
          <div ref={pathRef} className="mt-4 scroll-mt-24">
            {stageLoading ? (
              <SkeletonJourney />
            ) : pageQuery.isError && needsPage ? (
              <div
                role="alert"
                className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">We couldn't load this stage.</p>
                  <button
                    type="button"
                    onClick={() => pageQuery.refetch()}
                    className="mt-3 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : items && items.length > 0 ? (
              <RoadmapPath
                items={items}
                accent={accent}
                ink={ink}
                compact={compact}
                canHover={canHover}
                continuesAfter={activeStage < lastStage}
                continuesBefore={activeStage > 1}
                stageKey={`${roadmap.slug}:${activeStage}`}
                onSelect={setSelected}
              />
            ) : (
              <p className="mx-auto max-w-md text-center text-sm text-white/70">
                There are no courses on this stage yet.
              </p>
            )}

            <RoadmapStageNavigation
              page={activeStage}
              lastPage={lastStage}
              accent={accent}
              ink={ink}
              onChange={(next) => changeStage(next)}
            />

            {isLastStage && (
              <RoadmapCompletionBadgeSection roadmap={roadmap} accent={accent} ink={ink} />
            )}
          </div>
        </div>
      </div>

      {/* Touch: the same course details as the desktop hover card, in a sheet. */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Course ${selected.position} of ${roadmap.total_courses}` : ""}
        tone="dark"
      >
        {selected && (
          <RoadmapNodePreviewCard item={selected} accent={accent} ink={ink} variant="sheet" />
        )}
      </BottomSheet>
    </PageShell>
  );
};
