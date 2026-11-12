import { describe, expect, it } from "vitest";
import {
  DECOR_ASSETS,
  MAX_DECOR_COMPACT,
  MAX_DECOR_DESKTOP,
  decorSlotCount,
  planJourneyDecor,
} from "./journeyDecor";
import { buildJourneyGeometry } from "./roadmap";

const plan = (seed: string, nodeCount: number, compact: boolean) =>
  planJourneyDecor({
    seed,
    nodeCount,
    compact,
    geometry: buildJourneyGeometry(nodeCount, compact),
  });

describe("how many poses/loops a stage gets", () => {
  it("never exceeds 2 on a phone or 4 on a desktop, whatever the stage size", () => {
    for (let nodes = 0; nodes <= 60; nodes++) {
      expect(decorSlotCount(nodes, true)).toBeLessThanOrEqual(MAX_DECOR_COMPACT);
      expect(decorSlotCount(nodes, false)).toBeLessThanOrEqual(MAX_DECOR_DESKTOP);
    }
    // ...so a screen, which only ever sees part of one stage, can't show more
    // than 2 (phone) / 5 (desktop).
    expect(MAX_DECOR_COMPACT).toBeLessThanOrEqual(2);
    expect(MAX_DECOR_DESKTOP).toBeLessThanOrEqual(5);
  });

  it("scales with the stage, from none (empty) to the cap", () => {
    expect(decorSlotCount(0, true)).toBe(0);
    expect(decorSlotCount(0, false)).toBe(0);
    expect(decorSlotCount(3, true)).toBe(1);
    expect(decorSlotCount(8, true)).toBe(2);
    expect(decorSlotCount(1, false)).toBe(1);
    expect(decorSlotCount(8, false)).toBe(4);
  });
});

describe("where they go", () => {
  it("is deterministic: the same stage always shows the same cast in the same places", () => {
    expect(plan("se-path:1", 8, false)).toEqual(plan("se-path:1", 8, false));
    expect(plan("se-path:1", 8, true)).toEqual(plan("se-path:1", 8, true));
  });

  it("varies between stages and roadmaps", () => {
    const casts = new Set(
      Array.from({ length: 12 }, (_, i) =>
        plan(`path-${i}:1`, 8, false)
          .map((slot) => slot.asset.id)
          .join(",")
      )
    );
    expect(casts.size).toBeGreaterThan(6);
  });

  it("alternates sides, left/right/left…", () => {
    for (const compact of [true, false]) {
      for (const seed of ["a:1", "b:2", "c:3", "d:4"]) {
        const sides = plan(seed, 8, compact).map((slot) => slot.side);
        sides.forEach((side, i) => {
          if (i > 0) expect(side).not.toBe(sides[i - 1]);
        });
      }
    }
  });

  it("spaces them evenly down the path, inside its padding", () => {
    for (const compact of [true, false]) {
      const geometry = buildJourneyGeometry(8, compact);
      const slots = plan("se-path:1", 8, compact);
      const tops = slots.map((slot) => slot.top);

      const gaps = tops.slice(1).map((top, i) => top - tops[i]);
      for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 6);

      // Centred within equal bands, so the margins at either end match too.
      const first = tops[0] * geometry.height - geometry.padding;
      const last = geometry.height - geometry.padding - tops[tops.length - 1] * geometry.height;
      expect(first).toBeCloseTo(last, 4);
      expect(tops[0]).toBeGreaterThan(geometry.padding / geometry.height);
      expect(tops[tops.length - 1]).toBeLessThan(1 - geometry.padding / geometry.height);
    }
  });

  it("never repeats an asset within a stage, and never puts two loops back to back", () => {
    for (let i = 0; i < 200; i++) {
      const slots = plan(`seed-${i}:${i % 5}`, 8, false);
      const ids = slots.map((slot) => slot.asset.id);
      expect(new Set(ids).size).toBe(ids.length);
      slots.forEach((slot, j) => {
        if (j > 0) expect(slot.asset.kind === "loop" && slots[j - 1].asset.kind === "loop").toBe(false);
      });
    }
  });

  it("only uses the eight generated assets", () => {
    const known = new Set(DECOR_ASSETS.map((asset) => asset.id));
    expect(DECOR_ASSETS).toHaveLength(8);
    expect(DECOR_ASSETS.filter((asset) => asset.kind === "pose")).toHaveLength(5);
    expect(DECOR_ASSETS.filter((asset) => asset.kind === "loop")).toHaveLength(3);
    for (let i = 0; i < 50; i++) {
      for (const slot of plan(`x-${i}:1`, 8, i % 2 === 0)) expect(known.has(slot.asset.id)).toBe(true);
    }
  });
});
