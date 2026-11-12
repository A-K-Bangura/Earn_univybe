import { useEffect, useId, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import type { RoadmapCourseItem } from "../../types/roadmap";
import {
  getRoadmapCourseHref,
  roadmapStatusLabel,
} from "../../utils/roadmap";
import { RoadmapNodePreviewCard } from "./RoadmapNodePreviewCard";

interface RoadmapNodeProps {
  item: RoadmapCourseItem;
  /** Position as a percentage of the path canvas (the wrapper centres on it). */
  left: number;
  top: number;
  /** Which side of the node the desktop preview opens on. */
  popoverSide: "left" | "right";
  /** Hover-capable pointer: show a floating preview. Otherwise tap opens `onSelect`. */
  canHover: boolean;
  accent: string;
  ink: string;
  onSelect: (item: RoadmapCourseItem) => void;
}

const NODE_BG = "#141a3d";
const mix = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** Circular progress ring drawn around an in-progress node. */
const ProgressRing = ({ percent, accent }: { percent: number; accent: string }) => {
  const circumference = 2 * Math.PI * 46;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className="pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] -rotate-90"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(100, percent) / 100)}
      />
    </svg>
  );
};

/**
 * One course on the journey. Carries only a number (or a check), the state and
 * the page's glow; the course title lives in the preview card. Never locked:
 * every node is a normal link, whatever the order or state of its neighbours.
 *
 * State is shown by shape and text as well as colour: a check mark for
 * completed, a progress ring for in progress, a "Continue here" tag for the
 * current course, plus a full aria-label.
 */
export const RoadmapNode = ({
  item,
  left,
  top,
  popoverSide,
  canHover,
  accent,
  ink,
  onSelect,
}: RoadmapNodeProps) => {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const { course } = item;

  const isCurrent = item.is_current;
  const completed = item.status === "completed";
  const inProgress = item.status === "in_progress";

  // Escape dismisses the preview without moving focus (WCAG 1.4.13).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const circleStyle = completed
    ? {
        backgroundColor: accent,
        color: ink,
        boxShadow: `0 0 0 4px ${mix(accent, 25)}, 0 0 24px ${mix(accent, 45)}`,
      }
    : isCurrent
      ? {
          backgroundColor: `color-mix(in srgb, ${accent} 24%, ${NODE_BG})`,
          border: `3px solid ${accent}`,
          color: "#fff",
          boxShadow: `0 0 0 6px ${mix(accent, 22)}, 0 0 40px ${mix(accent, 75)}`,
        }
      : inProgress
        ? {
            backgroundColor: NODE_BG,
            border: `3px solid ${accent}`,
            color: "#fff",
            boxShadow: `0 0 26px ${mix(accent, 50)}`,
          }
        : {
            backgroundColor: NODE_BG,
            border: `2px solid ${mix(accent, 60)}`,
            color: "rgba(255,255,255,0.92)",
            boxShadow: `0 0 16px ${mix(accent, 22)}`,
          };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Touch: no hover to reveal the details, so open the bottom sheet instead
    // of navigating. Mouse/keyboard: the node is a plain link to the course.
    if (!canHover) {
      event.preventDefault();
      onSelect(item);
    }
  };

  const label = `Course ${item.position}: ${course.title}. ${roadmapStatusLabel(item)}.${
    isCurrent ? " Continue here." : ""
  }`;

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${
        open ? "z-30" : "z-10"
      }`}
      style={{ left: `${left}%`, top: `${top}%` }}
      onMouseEnter={canHover ? () => setOpen(true) : undefined}
      onMouseLeave={canHover ? () => setOpen(false) : undefined}
      onFocus={canHover ? () => setOpen(true) : undefined}
      onBlur={
        canHover
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setOpen(false);
              }
            }
          : undefined
      }
    >
      {/* `data-journey-node` is the GSAP target: it animates this inner layer so
          it never fights the wrapper's centring transform. */}
      <div
        data-journey-node
        id={isCurrent ? "journey-current" : undefined}
        className="relative"
      >
        {isCurrent && (
          <span
            className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide whitespace-nowrap uppercase shadow-lg"
            style={{ backgroundColor: accent, color: ink }}
          >
            Continue here
          </span>
        )}

        {(isCurrent || inProgress) && !completed && (
          <span
            aria-hidden
            className="absolute -inset-2.5 rounded-full border-2 opacity-60 motion-safe:animate-pulse"
            style={{ borderColor: accent }}
          />
        )}

        <Link
          to={getRoadmapCourseHref(item)}
          onClick={handleClick}
          aria-label={label}
          aria-describedby={canHover && open ? popoverId : undefined}
          className={`relative grid place-items-center rounded-full text-xl font-extrabold transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none ${
            isCurrent
              ? "h-15 w-15 sm:h-[4.5rem] sm:w-[4.5rem]"
              : "h-13 w-13 sm:h-16 sm:w-16"
          }`}
          style={circleStyle}
        >
          {inProgress && !completed && (
            <ProgressRing percent={item.progress_percent} accent={accent} />
          )}
          {completed ? (
            <Check className="h-7 w-7" strokeWidth={3.5} aria-hidden />
          ) : (
            <span aria-hidden>{item.position}</span>
          )}
        </Link>

        {canHover && open && (
          <div
            id={popoverId}
            role="group"
            aria-label={`Course ${item.position} preview`}
            className={`absolute top-1/2 z-40 -translate-y-1/2 ${
              popoverSide === "right" ? "left-full pl-5" : "right-full pr-5"
            }`}
          >
            <RoadmapNodePreviewCard item={item} accent={accent} ink={ink} />
          </div>
        )}
      </div>
    </div>
  );
};
