import { hashString, mulberry32 } from "./brandColors";
import type { JourneyGeometry } from "./roadmap";

// Where Vybe's poses and loops go on the roadmap journey: in the empty gutters
// beside the winding path, evenly spaced and alternating left/right.
//
// The rule "no more than 2 on a phone screen / 5 on a desktop screen" is met by
// construction, not by measuring the viewport: a stage never holds more than
// 2 (phone) or 4 (desktop) of them in total, so however it is scrolled the
// count on screen cannot exceed that.

export interface DecorAsset {
  /** Key into `journeyImages` (poses) or `journeyLoops` (loops). */
  id: string;
  kind: "pose" | "loop";
}

/** The 5 generic poses and 3 loops generated for the journey. */
export const DECOR_ASSETS: readonly DecorAsset[] = [
  { id: "pose-thumbs-up", kind: "pose" },
  { id: "pose-notes", kind: "pose" },
  { id: "pose-pointing", kind: "pose" },
  { id: "pose-cheer", kind: "pose" },
  { id: "pose-aha", kind: "pose" },
  { id: "loop-wave", kind: "loop" },
  { id: "loop-cool", kind: "loop" },
  { id: "loop-cheer", kind: "loop" },
];

export interface DecorSlot {
  asset: DecorAsset;
  side: "left" | "right";
  /** Vertical centre as a fraction (0-1) of the path canvas height. */
  top: number;
}

export const MAX_DECOR_COMPACT = 2;
export const MAX_DECOR_DESKTOP = 4;

/** How many decorations a stage of `nodeCount` courses gets. */
export const decorSlotCount = (nodeCount: number, compact: boolean): number => {
  if (nodeCount <= 0) return 0;
  if (compact) return Math.min(MAX_DECOR_COMPACT, nodeCount >= 5 ? 2 : 1);
  return Math.min(MAX_DECOR_DESKTOP, Math.max(1, Math.round(nodeCount / 2)));
};

/**
 * Plan the decorations for one stage. A pure function of its inputs: the same
 * roadmap stage always shows the same cast in the same places.
 *
 * - **Even spacing:** slot centres are evenly distributed over the band between
 *   the path's top and bottom padding.
 * - **Alternating:** sides alternate left/right; which side comes first varies
 *   by seed.
 * - **Variety:** a seeded shuffle of the eight assets, never repeating one within
 *   a stage, and never two loops back to back (loops are the costly ones to decode).
 */
export const planJourneyDecor = ({
  seed,
  nodeCount,
  compact,
  geometry,
}: {
  seed: string;
  nodeCount: number;
  compact: boolean;
  geometry: Pick<JourneyGeometry, "height" | "padding">;
}): DecorSlot[] => {
  const count = decorSlotCount(nodeCount, compact);
  if (count === 0) return [];

  const rand = mulberry32(hashString(`decor:${seed}`));
  const order = [...DECOR_ASSETS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const chosen = order.slice(0, count);
  // No two loops in a row: swap the second with the next pose further down the list.
  for (let i = 1; i < chosen.length; i++) {
    if (chosen[i].kind === "loop" && chosen[i - 1].kind === "loop") {
      const swap = order.slice(count).findIndex((asset) => asset.kind === "pose");
      if (swap !== -1) chosen[i] = order[count + swap];
    }
  }

  const { height, padding } = geometry;
  const band = height - padding * 2;
  const startsRight = hashString(`side:${seed}`) % 2 === 1;

  return chosen.map((asset, index) => ({
    asset,
    side: (index % 2 === 0) === startsRight ? "right" : "left",
    top: (padding + ((index + 0.5) * band) / count) / height,
  }));
};
