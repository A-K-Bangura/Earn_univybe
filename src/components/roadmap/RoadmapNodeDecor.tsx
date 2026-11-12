import { journeyImages } from "../../assets/journey";
import { journeyLoops } from "../../assets/animations/journey";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import type { DecorSlot } from "../../utils/journeyDecor";

interface RoadmapNodeDecorProps {
  plan: DecorSlot[];
  compact: boolean;
  /** Half-width of the node band, as a percentage of the canvas width. */
  swingPercent: number;
}

// Gap between the outer edge of the node band and the decoration, in px. Covers the
// largest node's radius (30 px phone, 36 px desktop) plus breathing room.
const CLEARANCE_PX = { compact: 46, desktop: 54 } as const;

// Rendered heights. Phones keep to the narrow gutters beside the path.
const HEIGHT_PX = {
  compact: { pose: 100, loop: 96 },
  desktop: { pose: 150, loop: 160 },
} as const;

/**
 * Vybe poses and loops placed in the gutters beside the path, clear of the nodes
 * (see utils/journeyDecor.ts for the count/spacing rules). Purely decorative:
 * hidden from assistive tech, never interactive, lazy-loaded, and loops fall back
 * to their still poster under `prefers-reduced-motion`.
 */
export const RoadmapNodeDecor = ({
  plan,
  compact,
  swingPercent,
}: RoadmapNodeDecorProps) => {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mode = compact ? "compact" : "desktop";
  const edge = `calc(50% + ${swingPercent}% + ${CLEARANCE_PX[mode]}px)`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {plan.map((slot) => {
        const isLoop = slot.asset.kind === "loop";
        const loop = isLoop ? journeyLoops[slot.asset.id] : undefined;
        const media = loop ?? (isLoop ? undefined : journeyImages[slot.asset.id]);
        if (!media) return null;

        const height = HEIGHT_PX[mode][slot.asset.kind];
        const width = Math.round((height * media.width) / media.height);
        const src = loop && reducedMotion ? loop.poster : media.src;

        return (
          // The wrapper owns position and centring; the image owns the idle float,
          // so the two transforms never fight.
          <div
            key={slot.asset.id}
            data-journey-decor={slot.asset.id}
            className="absolute"
            style={{
              top: `${slot.top * 100}%`,
              [slot.side === "left" ? "right" : "left"]: edge,
              width,
              height,
              transform: "translateY(-50%)",
            }}
          >
            <img
              src={src}
              alt=""
              width={media.width}
              height={media.height}
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`block h-full w-full max-w-none object-contain select-none ${
                isLoop ? "" : "vybe-float"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
