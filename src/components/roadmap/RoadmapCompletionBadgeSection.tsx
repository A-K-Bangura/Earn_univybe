import { useId, useState } from "react";
import { Award, ChevronDown, Lock } from "lucide-react";
import type { Roadmap } from "../../types/roadmap";

interface RoadmapCompletionBadgeSectionProps {
  roadmap: Roadmap;
  accent: string;
  ink: string;
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/**
 * The end of the journey: the roadmap's completion badge, kept deliberately
 * quiet. One slim row; collapsed while the roadmap is unfinished (the nodes stay
 * the focus), open once it's completed. `badge.earned` is permanent, so the
 * earned state sticks even if an admin later adds a course.
 */
export const RoadmapCompletionBadgeSection = ({
  roadmap,
  accent,
  ink,
}: RoadmapCompletionBadgeSectionProps) => {
  const badge = roadmap.badge;
  const earned = !!badge?.earned;
  const [open, setOpen] = useState(earned || roadmap.is_completed);
  const panelId = useId();

  const remaining = roadmap.progress
    ? Math.max(0, roadmap.progress.total_courses - roadmap.progress.completed_courses)
    : roadmap.total_courses;

  const status = earned
    ? badge?.earned_at
      ? `Earned on ${formatDate(badge.earned_at)}`
      : "Earned"
    : "Complete all courses to earn it";

  return (
    <section
      aria-labelledby="journey-badge-title"
      className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl bg-white/6 ring-1 ring-white/10"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 bg-transparent p-3 text-left text-white focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
      >
        <span
          className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full"
          style={{
            backgroundColor: earned ? accent : "#141a3d",
            color: earned ? ink : "rgba(255,255,255,0.8)",
            boxShadow: earned ? undefined : "inset 0 0 0 2px rgba(255,255,255,0.18)",
          }}
        >
          {badge?.icon_url ? (
            <img
              src={badge.icon_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <Award className="h-5 w-5" aria-hidden />
          )}
          {!earned && (
            <span className="absolute -right-0.5 -bottom-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#0b1026] ring-1 ring-white/30">
              <Lock className="h-2.5 w-2.5" aria-hidden />
              <span className="sr-only">Not earned yet</span>
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span id="journey-badge-title" className="block truncate text-sm font-bold">
            Roadmap badge
          </span>
          <span className="block truncate text-xs text-white/70">{status}</span>
        </span>

        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 text-white/70 transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="animate-expand space-y-1.5 border-t border-white/10 px-4 py-3 text-sm"
        >
          <p className="font-semibold text-white">{badge?.name ?? "Roadmap badge"}</p>
          {badge?.description && <p className="text-white/70">{badge.description}</p>}
          {earned ? (
            !roadmap.is_completed && (
              <p className="text-xs text-white/60">
                New courses were added since you finished. Your badge stays yours.
              </p>
            )
          ) : (
            <p className="text-white/70">
              {roadmap.is_participant
                ? `${remaining} course${remaining === 1 ? "" : "s"} to go. Any order works.`
                : "Take the courses in any order. Your progress is tracked automatically."}
            </p>
          )}
        </div>
      )}
    </section>
  );
};
