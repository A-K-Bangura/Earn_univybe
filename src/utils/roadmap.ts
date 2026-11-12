import type { Roadmap, RoadmapCourseItem } from "../types/roadmap";

/** "200" -> "200 Level", "UnderGrad" -> "Undergraduate", "graduate" -> "Graduate", "general" -> "General". */
export const formatLevel = (level: string | null | undefined): string | null => {
  if (!level) return null;
  if (level === "UnderGrad") return "Undergraduate";
  if (level === "graduate") return "Graduate";
  if (level === "general") return "General";
  return /^\d+$/.test(level) ? `${level} Level` : level;
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The one-line standing shown on a roadmap tile:
 * `3 of 8 courses · 38% complete`, `Completed` or `8-course roadmap`.
 */
export const roadmapProgressLabel = (roadmap: Roadmap): string => {
  if (roadmap.is_completed) return "Completed";
  if (roadmap.is_participant && roadmap.progress) {
    const { completed_courses, total_courses, percent } = roadmap.progress;
    return `${completed_courses} of ${plural(total_courses, "course")} · ${Math.round(percent)}% complete`;
  }
  return `${roadmap.total_courses}-course roadmap`;
};

/**
 * Who the roadmap is aimed at, for the metadata line: the most specific
 * academic group first, then the year. `null` fields mean "general / open",
 * so a fully open roadmap has no audience line at all.
 */
export const roadmapAudience = (roadmap: Roadmap): string | null => {
  const group =
    roadmap.department?.name ??
    roadmap.faculty?.name ??
    roadmap.university?.name ??
    roadmap.organization?.name ??
    null;
  const parts = [group, formatLevel(roadmap.level)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
};

// ---- Grouping for the Roadmaps Discovery page -----------------------------
// `relevance_score` is a backend ordering signal and is never shown to the
// student; it only decides what lands in "Recommended for you".

/** Closest to the student's profile, not already started or finished. */
export const getRecommendedRoadmaps = (
  roadmaps: Roadmap[],
  limit = 4
): Roadmap[] =>
  roadmaps
    .filter(
      (r) =>
        (r.relevance_score ?? 0) > 0 && !r.is_participant && !r.is_completed
    )
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
    .slice(0, limit);

/** Started, not finished. */
export const getContinueRoadmaps = (roadmaps: Roadmap[]): Roadmap[] =>
  roadmaps.filter((r) => r.is_participant && !r.is_completed);

export const getCompletedRoadmaps = (roadmaps: Roadmap[]): Roadmap[] =>
  roadmaps.filter((r) => r.is_completed);

// ---- Journey ---------------------------------------------------------------

/** Courses on this page that are finished (for the "N more to go" copy). */
export const countCompleted = (items: RoadmapCourseItem[]): number =>
  items.filter((item) => item.status === "completed").length;

export interface JourneyPoint {
  x: number;
  y: number;
}

export interface JourneyGeometry {
  width: number;
  height: number;
  /** Half-width of the band the nodes wander in, either side of the centre line. */
  swing: number;
  /** Empty space above the first and below the last node. */
  padding: number;
  points: JourneyPoint[];
  /** `segments[i]` is the curve from `points[i]` to `points[i + 1]`. */
  segments: string[];
}

/** Everything is in one 400-wide coordinate space; the SVG scales to its container. */
export const JOURNEY_WIDTH = 400;

/**
 * Lay `count` nodes out along a winding vertical path.
 *
 * Desktop swings wide to either side of the centre line; compact (phones) keeps
 * the swing tight and centred so nodes stay easy to tap. Positions are a pure
 * function of the index so a stage never reshuffles between renders.
 */
export const buildJourneyGeometry = (
  count: number,
  compact: boolean
): JourneyGeometry => {
  const rowHeight = compact ? 104 : 92;
  const swing = compact ? 62 : 128;
  const padding = compact ? 64 : 72;
  const centre = JOURNEY_WIDTH / 2;

  const height = padding * 2 + Math.max(0, count - 1) * rowHeight;
  const points: JourneyPoint[] = Array.from({ length: count }, (_, i) => ({
    // Two superimposed sines give an irregular, but repeatable, left/right walk.
    x:
      centre +
      swing * (0.75 * Math.sin(i * 1.25 + 0.5) + 0.25 * Math.sin(i * 2.6 + 1)),
    y: padding + i * rowHeight,
  }));

  const segments = points.slice(0, -1).map((from, i) => {
    const to = points[i + 1];
    const bend = (to.y - from.y) * 0.55;
    return `M ${from.x.toFixed(1)} ${from.y} C ${from.x.toFixed(1)} ${from.y + bend}, ${to.x.toFixed(1)} ${to.y - bend}, ${to.x.toFixed(1)} ${to.y}`;
  });

  return { width: JOURNEY_WIDTH, height, swing, padding, points, segments };
};

/**
 * Where tapping a roadmap node goes. Never gated by roadmap order: any course
 * can be opened from any state. In-progress courses resume in the player; every
 * other state lands on the course page (where enrolling happens).
 */
export const getRoadmapCourseHref = (item: RoadmapCourseItem): string =>
  item.status === "in_progress"
    ? `/course/${item.course.uuid}/play`
    : `/course/${item.course.uuid}`;

export const getRoadmapCourseCta = (item: RoadmapCourseItem): string => {
  switch (item.status) {
    case "completed":
      return "Review course";
    case "in_progress":
      return "Continue course";
    default:
      return "View course";
  }
};

/** Plain-words state of a node (never colour alone: also used for aria labels). */
export const roadmapStatusLabel = (item: RoadmapCourseItem): string => {
  switch (item.status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return item.progress_percent > 0
        ? `In progress, ${Math.round(item.progress_percent)}%`
        : "Enrolled, not started";
    default:
      return "Not started";
  }
};
