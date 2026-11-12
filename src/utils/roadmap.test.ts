import { describe, expect, it } from "vitest";
import {
  BRAND_COLORS,
  getInkOn,
  getRoadmapPageThemeColor,
  getStableBrandColor,
} from "./brandColors";
import { buildCourseFallbackCover, getTitleInitials } from "./courseCover";
import {
  JOURNEY_WIDTH,
  buildJourneyGeometry,
  formatLevel,
  getCompletedRoadmaps,
  getContinueRoadmaps,
  getRecommendedRoadmaps,
  roadmapAudience,
  roadmapProgressLabel,
} from "./roadmap";
import type { Roadmap } from "../types/roadmap";

const makeRoadmap = (overrides: Partial<Roadmap> = {}): Roadmap => ({
  id: 1,
  uuid: "uuid-1",
  slug: "software-engineering-path",
  title: "Software Engineering Path",
  description: null,
  thumbnail_url: null,
  published_at: null,
  level: null,
  semester: null,
  university: null,
  faculty: null,
  department: null,
  organization: null,
  total_courses: 8,
  is_participant: false,
  is_completed: false,
  progress: null,
  current_course: null,
  badge: null,
  ...overrides,
});

describe("brand colours", () => {
  it("picks the same colour for the same seed, always from the palette", () => {
    expect(getStableBrandColor("intro-to-programming")).toBe(
      getStableBrandColor("intro-to-programming")
    );
    for (const seed of ["a", "b", "calculus", "42", ""]) {
      expect(BRAND_COLORS).toContain(getStableBrandColor(seed));
    }
  });

  it("gives a roadmap page the same theme every time", () => {
    for (let page = 1; page <= 12; page++) {
      expect(getRoadmapPageThemeColor("se-path", page)).toBe(
        getRoadmapPageThemeColor("se-path", page)
      );
    }
  });

  it("never repeats the previous page's colour", () => {
    for (const slug of ["se-path", "data-science", "x", "business-101"]) {
      for (let page = 2; page <= 40; page++) {
        expect(getRoadmapPageThemeColor(slug, page)).not.toBe(
          getRoadmapPageThemeColor(slug, page - 1)
        );
      }
    }
  });

  it("treats a bad page number as page 1", () => {
    expect(getRoadmapPageThemeColor("se-path", 0)).toBe(
      getRoadmapPageThemeColor("se-path", 1)
    );
  });

  it("uses dark ink on yellow/cyan and white ink on the rest", () => {
    expect(getInkOn("#FFBE0B")).not.toBe("#FFFFFF");
    expect(getInkOn("#00F5D4")).not.toBe("#FFFFFF");
    expect(getInkOn("#3A86FF")).toBe("#FFFFFF");
    expect(getInkOn("#8338EC")).toBe("#FFFFFF");
    expect(getInkOn("#FF006E")).toBe("#FFFFFF");
  });
});

describe("fallback course cover", () => {
  it("is deterministic for a seed", () => {
    expect(buildCourseFallbackCover("calculus-1", "Calculus I")).toEqual(
      buildCourseFallbackCover("calculus-1", "Calculus I")
    );
  });

  it("only uses brand colours for its base and accent", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const cover = buildCourseFallbackCover(seed, seed);
      expect(BRAND_COLORS).toContain(cover.base);
      expect(BRAND_COLORS).toContain(cover.accent);
      expect(cover.accent).not.toBe(cover.base);
    }
  });

  it("varies between different courses", () => {
    const covers = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((seed) =>
        JSON.stringify(buildCourseFallbackCover(seed, "T"))
      )
    );
    expect(covers.size).toBeGreaterThan(5);
  });

  it("derives a short monogram from the title", () => {
    expect(getTitleInitials("Intro to Programming")).toBe("IP");
    expect(getTitleInitials("Data Structures and Algorithms")).toBe("DSA");
    expect(getTitleInitials("Databases")).toBe("Da");
    expect(getTitleInitials("")).toBe("UV");
    expect(getTitleInitials("The Art of War and Peace Today")).toBe("AWP");
  });
});

describe("roadmap labels", () => {
  it("formats levels", () => {
    expect(formatLevel("200")).toBe("200 Level");
    expect(formatLevel("UnderGrad")).toBe("Undergraduate");
    expect(formatLevel("graduate")).toBe("Graduate");
    expect(formatLevel("general")).toBe("General");
    expect(formatLevel(null)).toBeNull();
  });

  it("describes standing on a tile", () => {
    expect(roadmapProgressLabel(makeRoadmap())).toBe("8-course roadmap");
    expect(
      roadmapProgressLabel(
        makeRoadmap({
          is_participant: true,
          progress: { completed_courses: 3, total_courses: 8, percent: 37.5 },
        })
      )
    ).toBe("3 of 8 courses · 38% complete");
    expect(roadmapProgressLabel(makeRoadmap({ is_completed: true }))).toBe(
      "Completed"
    );
    expect(roadmapProgressLabel(makeRoadmap({ total_courses: 1 }))).toBe(
      "1-course roadmap"
    );
  });

  it("names the audience, most specific first, and is empty for open roadmaps", () => {
    expect(roadmapAudience(makeRoadmap())).toBeNull();
    expect(
      roadmapAudience(
        makeRoadmap({
          level: "200",
          university: { id: 1, name: "USL" },
          department: { id: 2, name: "Computer Science" },
        })
      )
    ).toBe("Computer Science · 200 Level");
  });
});

describe("roadmap grouping", () => {
  const list = [
    makeRoadmap({ id: 1, relevance_score: 10 }),
    makeRoadmap({ id: 2, relevance_score: 30 }),
    makeRoadmap({ id: 3, relevance_score: 0 }),
    makeRoadmap({ id: 4, relevance_score: 50, is_participant: true }),
    makeRoadmap({
      id: 5,
      relevance_score: 40,
      is_participant: true,
      is_completed: true,
    }),
    makeRoadmap({ id: 6 }), // guest-style: no score
  ];

  it("recommends the closest roadmaps the student has not started, best first", () => {
    expect(getRecommendedRoadmaps(list).map((r) => r.id)).toEqual([2, 1]);
    expect(getRecommendedRoadmaps(list, 1).map((r) => r.id)).toEqual([2]);
  });

  it("splits started from finished", () => {
    expect(getContinueRoadmaps(list).map((r) => r.id)).toEqual([4]);
    expect(getCompletedRoadmaps(list).map((r) => r.id)).toEqual([5]);
  });
});

describe("journey geometry", () => {
  it("places one point and one curve per gap, inside the canvas", () => {
    for (const compact of [false, true]) {
      const geometry = buildJourneyGeometry(7, compact);
      expect(geometry.points).toHaveLength(7);
      expect(geometry.segments).toHaveLength(6);
      for (const point of geometry.points) {
        expect(point.x).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(JOURNEY_WIDTH);
        expect(point.y).toBeGreaterThan(0);
        expect(point.y).toBeLessThan(geometry.height);
      }
    }
  });

  it("is stable between calls and tighter on phones", () => {
    expect(buildJourneyGeometry(5, false)).toEqual(buildJourneyGeometry(5, false));
    const spread = (compact: boolean) => {
      const xs = buildJourneyGeometry(8, compact).points.map((p) => p.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(spread(true)).toBeLessThan(spread(false));
  });

  it("copes with a one-node stage", () => {
    const geometry = buildJourneyGeometry(1, false);
    expect(geometry.points).toHaveLength(1);
    expect(geometry.segments).toHaveLength(0);
  });
});
