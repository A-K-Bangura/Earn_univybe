import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import type { Roadmap } from "../../types/roadmap";
import { roadmapAudience, roadmapProgressLabel } from "../../utils/roadmap";
import { CourseCover } from "../course/CourseCover";

interface RoadmapTileProps {
  roadmap: Roadmap;
  /** Closest-to-your-profile pick (see getRecommendedRoadmaps). */
  recommended?: boolean;
  className?: string;
}

const textShadow = "[text-shadow:0_1px_3px_rgb(0_0_0/0.65)]";

/**
 * Portrait, poster-style tile for one roadmap: the thumbnail fills the card,
 * with a dark gradient behind the text so it stays readable on any image.
 * The whole tile is the link.
 */
export const RoadmapTile = ({
  roadmap,
  recommended = false,
  className = "",
}: RoadmapTileProps) => {
  const audience = roadmapAudience(roadmap);
  const participating = roadmap.is_participant && !roadmap.is_completed;
  const percent = roadmap.progress?.percent ?? 0;

  return (
    // `own-links` keeps the global unlayered `a { color }` rule off this link.
    <div className={`own-links ${className}`}>
      <Link
        to={`/roadmaps/${roadmap.slug}`}
        className="group relative block aspect-3/4 overflow-hidden rounded-2xl bg-gray-900 text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <CourseCover
          title={roadmap.title}
          seed={roadmap.slug}
          thumbnailUrl={roadmap.thumbnail_url}
          variant="portrait"
          className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />

        {/* Contrast: a light veil everywhere, a strong gradient under the text. */}
        <div aria-hidden className="absolute inset-0 bg-black/10" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-black/90 via-black/55 to-transparent"
        />

        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          {roadmap.is_completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Completed
            </span>
          )}
          {recommended && !roadmap.is_completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-gray-900 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Recommended
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <h3
            className={`line-clamp-2 text-sm leading-snug font-bold sm:text-lg ${textShadow}`}
          >
            {roadmap.title}
          </h3>
          {roadmap.description && (
            <p
              className={`mt-1 hidden line-clamp-2 text-xs leading-snug text-white/85 sm:block ${textShadow}`}
            >
              {roadmap.description}
            </p>
          )}
          <p
            className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/90 sm:text-xs ${textShadow}`}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{roadmapProgressLabel(roadmap)}</span>
          </p>
          {audience && (
            <p
              className={`mt-0.5 hidden truncate text-[11px] text-white/70 sm:block ${textShadow}`}
            >
              {audience}
            </p>
          )}
          {participating && (
            <div
              role="progressbar"
              aria-label={`${roadmap.title} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25"
            >
              <div
                className="h-full rounded-full bg-aquamarine-500"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export const RoadmapTileSkeleton = () => (
  <div
    aria-hidden
    className="aspect-3/4 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700"
  />
);
