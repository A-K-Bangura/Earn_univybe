import { useLayoutEffect, useMemo, useRef } from "react";
import type { RoadmapCourseItem } from "../../types/roadmap";
import { buildJourneyGeometry, JOURNEY_WIDTH } from "../../utils/roadmap";
import { planJourneyDecor } from "../../utils/journeyDecor";
import { gsap } from "../../utils/gsapSetup";
import { RoadmapNode } from "./RoadmapNode";
import { RoadmapNodeDecor } from "./RoadmapNodeDecor";

interface RoadmapPathProps {
  items: RoadmapCourseItem[];
  accent: string;
  ink: string;
  /** Phones: a tighter, more centred winding so nodes stay easy to tap. */
  compact: boolean;
  canHover: boolean;
  /** The path carries on past the last node (more stages) / came from before the first. */
  continuesAfter: boolean;
  continuesBefore: boolean;
  /**
   * Identifies the stage shown (`slug:page`): replays the entrance when it changes
   * and seeds which Vybe poses/loops are placed beside the path.
   */
  stageKey: string;
  onSelect: (item: RoadmapCourseItem) => void;
}

/**
 * The winding vertical journey: a curved SVG trail with a node per course.
 *
 * The trail is neutral and dotted; the stretches the student has already
 * travelled glow in the page's theme colour. It never implies a hard
 * dependency, so no padlocks or "blocked" styling anywhere.
 *
 * Nodes are positioned in percentages of one scalable canvas, so the trail and
 * the nodes stay aligned at any width.
 */
export const RoadmapPath = ({
  items,
  accent,
  ink,
  compact,
  canHover,
  continuesAfter,
  continuesBefore,
  stageKey,
  onSelect,
}: RoadmapPathProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const geometry = useMemo(
    () => buildJourneyGeometry(items.length, compact),
    [items.length, compact]
  );
  const { width, height, points, segments } = geometry;
  const decor = useMemo(
    () =>
      planJourneyDecor({
        seed: stageKey,
        nodeCount: items.length,
        compact,
        geometry,
      }),
    [stageKey, items.length, compact, geometry]
  );

  // Entrance for each new stage: nodes rise in one after another and the trail
  // fades up. CSS leaves everything in its final visible state, so reduced
  // motion (or no JS animation) simply shows the finished journey.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const nodes = root.querySelectorAll("[data-journey-node]");
        const trail = root.querySelectorAll("[data-journey-trail]");
        gsap.fromTo(
          trail,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: "power1.out", clearProps: "opacity" }
        );
        gsap.fromTo(
          nodes,
          { y: 22, opacity: 0, scale: 0.85 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.07,
            ease: "back.out(1.6)",
            clearProps: "transform,opacity",
          }
        );
      },
      root
    );
    return () => mm.revert();
  }, [stageKey]);

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-full max-w-xl"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
        focusable="false"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <filter id="journey-glow" x="-30%" y="-10%" width="160%" height="120%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g data-journey-trail>
          {/* Dotted neutral trail through every node. */}
          {segments.map((d, i) => (
            <path
              key={`base-${i}`}
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="1 11"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Stretches already travelled glow in the page colour. */}
          {segments.map((d, i) =>
            items[i].status === "completed" ? (
              <path
                key={`done-${i}`}
                d={d}
                fill="none"
                stroke={accent}
                strokeWidth={5}
                strokeLinecap="round"
                filter="url(#journey-glow)"
                vectorEffect="non-scaling-stroke"
              />
            ) : items[i].is_current ? (
              // Gently lit towards the next node: "you are here", not "locked beyond".
              <path
                key={`next-${i}`}
                d={d}
                fill="none"
                stroke={accent}
                strokeOpacity={0.5}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="1 11"
                vectorEffect="non-scaling-stroke"
              />
            ) : null
          )}

          {/* The journey carries on beyond this stage. */}
          {continuesAfter && last && (
            <path
              d={`M ${last.x.toFixed(1)} ${last.y} L ${last.x.toFixed(1)} ${height}`}
              fill="none"
              stroke={accent}
              strokeOpacity={0.55}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="1 11"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {continuesBefore && first && (
            <path
              d={`M ${first.x.toFixed(1)} 0 L ${first.x.toFixed(1)} ${first.y}`}
              fill="none"
              stroke={accent}
              strokeOpacity={0.55}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="1 11"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      </svg>

      {/* Vybe poses and loops live only here, in the gutters beside the nodes. */}
      <RoadmapNodeDecor
        plan={decor}
        compact={compact}
        swingPercent={(geometry.swing / width) * 100}
      />

      {items.map((item, i) => (
        <RoadmapNode
          key={item.course.id}
          item={item}
          left={(points[i].x / JOURNEY_WIDTH) * 100}
          top={(points[i].y / height) * 100}
          popoverSide={points[i].x < JOURNEY_WIDTH / 2 ? "right" : "left"}
          canHover={canHover}
          accent={accent}
          ink={ink}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
