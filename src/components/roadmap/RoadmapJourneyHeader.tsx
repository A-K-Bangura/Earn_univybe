import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Building2,
  ChevronDown,
  GraduationCap,
  LayoutGrid,
  Navigation,
} from "lucide-react";
import type { Roadmap } from "../../types/roadmap";
import { formatLevel } from "../../utils/roadmap";

interface RoadmapJourneyHeaderProps {
  roadmap: Roadmap;
  accent: string;
  ink: string;
  signedIn: boolean;
  /** Jump to the student's current course (only offered to participants). */
  onGoToCurrent: () => void;
}

const Tag = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span
    className={`truncate rounded-full bg-white/10 px-2.5 py-1 text-[11px] leading-none font-semibold text-white/85 ${className}`}
  >
    {children}
  </span>
);

const Chip = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
    {icon}
    {children}
  </span>
);

/**
 * Progress for a participant, or — for guests and students who haven't taken a
 * course yet — an explanation that there's nothing to join and nothing locked.
 */
export const RoadmapProgressSummary = ({
  roadmap,
  accent,
  signedIn,
}: Pick<RoadmapJourneyHeaderProps, "roadmap" | "accent" | "signedIn">) => {
  if (roadmap.is_participant && roadmap.progress) {
    const { completed_courses, total_courses, percent } = roadmap.progress;
    return (
      <div className="max-w-md">
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-white">
            {completed_courses} of {total_courses} courses
          </span>
          <span className="font-bold" style={{ color: accent }}>
            {Math.round(percent)}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Roadmap progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className="h-2.5 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
            style={{
              width: `${Math.min(100, percent)}%`,
              backgroundColor: accent,
              boxShadow: `0 0 12px ${accent}`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <p className="max-w-md text-sm text-white/70">
      Start anywhere, in any order. Taking a course on this roadmap adds it to
      your journey automatically.
      {!signedIn && " Sign up to keep track of your progress."}
    </p>
  );
};

/**
 * The journey's title bar: one compact row (chevron, title, a couple of small
 * tags, a way back) so the course nodes stay the focus of the page. The chevron
 * reveals everything else: description, full details, progress.
 */
export const RoadmapJourneyHeader = ({
  roadmap,
  accent,
  ink,
  signedIn,
  onGoToCurrent,
}: RoadmapJourneyHeaderProps) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const place =
    roadmap.department?.name ??
    roadmap.faculty?.name ??
    roadmap.university?.name ??
    roadmap.organization?.name ??
    null;
  const level = formatLevel(roadmap.level);
  const details = [
    roadmap.department?.name,
    roadmap.faculty?.name,
    roadmap.university?.name,
    roadmap.organization?.name,
  ].filter((name): name is string => !!name);
  const percent =
    roadmap.is_participant && roadmap.progress ? roadmap.progress.percent : null;
  const canJump = roadmap.is_participant && !!roadmap.current_course;

  return (
    <header className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl bg-white/6 ring-1 ring-white/10 backdrop-blur-sm">
        <div className="relative flex items-center gap-2 p-2 sm:gap-3 sm:px-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Hide roadmap details" : "Show roadmap details"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 p-0 text-white transition-colors hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          <h1
            title={roadmap.title}
            className="min-w-0 flex-1 truncate font-title text-base leading-tight text-white sm:text-2xl"
          >
            {roadmap.title}
          </h1>

          {/* Phones show just the level; the rest is behind the chevron. */}
          <div className="flex min-w-0 shrink items-center gap-1.5">
            {level && <Tag className="shrink-0">{level}</Tag>}
            {place && <Tag className="hidden max-w-[14rem] sm:block">{place}</Tag>}
          </div>

          {/* `own-links`: keep the global unlayered `a { color }` rule off this link. */}
          <span className="own-links shrink-0">
            <Link
              to="/roadmaps"
              aria-label="All roadmaps"
              title="All roadmaps"
              className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LayoutGrid className="h-5 w-5" aria-hidden />
            </Link>
          </span>

          {percent !== null && (
            <div
              role="progressbar"
              aria-label="Roadmap progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10"
            >
              <div
                className="h-full"
                style={{ width: `${Math.min(100, percent)}%`, backgroundColor: accent }}
              />
            </div>
          )}
        </div>

        {open && (
          <div
            id={panelId}
            className="animate-expand space-y-4 border-t border-white/10 px-4 py-4 sm:px-5"
          >
            {/* The row truncates long titles on phones; show it whole here. */}
            <p className="text-base font-bold text-white sm:hidden">{roadmap.title}</p>

            {roadmap.description && (
              <p className="max-w-2xl text-sm leading-relaxed text-white/80">
                {roadmap.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Chip icon={<BookOpen className="h-3.5 w-3.5" aria-hidden />}>
                {roadmap.total_courses} course{roadmap.total_courses === 1 ? "" : "s"}
              </Chip>
              {details.map((name) => (
                <Chip key={name} icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}>
                  {name}
                </Chip>
              ))}
              {level && (
                <Chip icon={<GraduationCap className="h-3.5 w-3.5" aria-hidden />}>
                  {level}
                </Chip>
              )}
              {roadmap.semester && <Chip icon={null}>Semester {roadmap.semester}</Chip>}
            </div>

            <RoadmapProgressSummary roadmap={roadmap} accent={accent} signedIn={signedIn} />

            {/* A positioning aid only: it never joins or enrols the student in anything. */}
            {canJump && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onGoToCurrent();
                }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-[filter] hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ backgroundColor: accent, color: ink }}
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Go to current course
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
