import { Link } from "react-router-dom";
import { BookOpen, Clock, Coins, GraduationCap } from "lucide-react";
import type { RoadmapCourseItem } from "../../types/roadmap";
import {
  formatLevel,
  getRoadmapCourseCta,
  getRoadmapCourseHref,
  roadmapStatusLabel,
} from "../../utils/roadmap";
import { CourseCover } from "../course/CourseCover";

interface RoadmapNodePreviewCardProps {
  item: RoadmapCourseItem;
  /** The page's theme colour and a readable text colour on top of it. */
  accent: string;
  ink: string;
  /** `popover`: floating card on desktop hover. `sheet`: inside the mobile bottom sheet. */
  variant?: "popover" | "sheet";
}

/**
 * The information layer of the journey: what a node stands for. Only useful
 * facts: cover, title, blurb, level/lessons/time, price or free, coin reward,
 * the student's progress, and a single action.
 */
export const RoadmapNodePreviewCard = ({
  item,
  accent,
  ink,
  variant = "popover",
}: RoadmapNodePreviewCardProps) => {
  const { course } = item;
  const level = formatLevel(course.level);
  const blurb = course.short_description || course.description;
  const enrolled = item.status !== "not_enrolled";
  const popover = variant === "popover";

  return (
    // `own-links`: the card can be portalled out of the page, so it carries its
    // own opt-out from the global unlayered `a { color }` rule.
    <div
      className={`own-links text-white ${
        popover
          ? "w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#12183a]/95 shadow-2xl backdrop-blur-md"
          : ""
      }`}
    >
      <CourseCover
        title={course.title}
        seed={course.slug || course.uuid || String(course.id)}
        thumbnailUrl={course.thumbnail_url}
        className={`w-full ${popover ? "h-28" : "h-36 rounded-2xl"}`}
      />

      <div className={popover ? "p-4" : "pt-4"}>
        <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">
          Course {item.position} · {roadmapStatusLabel(item)}
        </p>
        <h3 className="mt-1 text-base leading-snug font-bold text-white">
          {course.title}
        </h3>
        {blurb && (
          <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-white/75">
            {blurb}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/70">
          {level && (
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              {level}
            </span>
          )}
          {!!course.estimated_lessons_count && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {course.estimated_lessons_count} lessons
            </span>
          )}
          {!!course.estimated_duration_hours && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {course.estimated_duration_hours}h
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {course.is_paid ? (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-gray-900">
              {course.currency || "SLE"} {(course.price ?? 0).toFixed(2)}
            </span>
          ) : (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white">
              Free
            </span>
          )}
          {!!course.coin_reward && course.coin_reward > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <Coins className="h-3 w-3" aria-hidden />
              Earn {course.coin_reward} coins
            </span>
          )}
        </div>

        {enrolled && item.progress_percent > 0 && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label="Course progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(item.progress_percent)}
              className="h-1.5 overflow-hidden rounded-full bg-white/15"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, item.progress_percent)}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
          </div>
        )}

        <Link
          to={getRoadmapCourseHref(item)}
          className="mt-4 block rounded-xl px-4 py-2.5 text-center text-sm font-bold transition-[filter] hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ backgroundColor: accent, color: ink }}
        >
          {getRoadmapCourseCta(item)}
        </Link>
      </div>
    </div>
  );
};
