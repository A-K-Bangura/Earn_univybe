import {
  BRAND_COLORS,
  getInkOn,
  getStableBrandColor,
  hashString,
  mulberry32,
  type BrandColor,
} from "./brandColors";

// Abstract, branded fallback covers for courses/roadmaps with no thumbnail.
// Pure data here; <CourseFallbackCover> renders it as inline SVG. Everything is
// derived from a seed (slug/id/title), so a given course always gets the same
// cover — never randomized per render — and no raster art is ever generated.

export type CoverShapeKind = "circle" | "ring" | "square" | "pill" | "dots";

export interface CoverShape {
  kind: CoverShapeKind;
  x: number;
  y: number;
  size: number;
  rotate: number;
  color: string;
  opacity: number;
}

export interface CoverSpec {
  width: number;
  height: number;
  base: BrandColor;
  accent: BrandColor;
  /** Readable text colour on `base`. */
  ink: string;
  /** Gradient direction in degrees. */
  angle: number;
  shapes: CoverShape[];
  initials: string;
}

export type CoverSize = { width: number; height: number };

/** viewBox sizes; the SVG is `slice`d into whatever box it is placed in. */
export const LANDSCAPE_COVER: CoverSize = { width: 400, height: 240 };
export const PORTRAIT_COVER: CoverSize = { width: 300, height: 420 };

const STOP_WORDS = new Set(["a", "an", "and", "the", "of", "to", "in", "for", "on", "with", "&"]);

/** 1-3 letters from the title: initials of the first words, or the first two letters of a single word. */
export const getTitleInitials = (title: string): string => {
  const words = title
    .replace(/[^\p{L}\p{N}\s&]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const significant = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const pool = significant.length > 0 ? significant : words;
  if (pool.length === 0) return "UV";
  if (pool.length === 1) {
    const [first, second = ""] = Array.from(pool[0]);
    return `${first.toUpperCase()}${second.toLowerCase()}`;
  }
  return pool
    .slice(0, 3)
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("");
};

const SHAPE_KINDS: CoverShapeKind[] = ["circle", "ring", "square", "pill", "dots"];

/**
 * Build the cover description for `seed` (prefer a slug/uuid; the title is a
 * fine fallback) and `title` (for the monogram).
 */
export const buildCourseFallbackCover = (
  seed: string,
  title: string,
  shape: CoverSize = LANDSCAPE_COVER
): CoverSpec => {
  const rand = mulberry32(hashString(`cover:${seed}`));
  const base = getStableBrandColor(`cover:${seed}`);
  const baseIndex = BRAND_COLORS.indexOf(base);
  // Accent: a different brand colour, chosen deterministically.
  const accent =
    BRAND_COLORS[(baseIndex + 1 + Math.floor(rand() * (BRAND_COLORS.length - 1))) % BRAND_COLORS.length];
  const tertiary = BRAND_COLORS[(baseIndex + 2 + Math.floor(rand() * (BRAND_COLORS.length - 2))) % BRAND_COLORS.length];
  const ink = getInkOn(base);

  const { width, height } = shape;
  const shapes: CoverShape[] = [];

  // One large soft shape bleeding off a corner: gives each cover its silhouette.
  shapes.push({
    kind: rand() > 0.5 ? "circle" : "pill",
    x: width * (rand() > 0.5 ? 0.85 : 0.1),
    y: height * (rand() > 0.5 ? 0.15 : 0.9),
    size: Math.min(width, height) * (0.7 + rand() * 0.35),
    rotate: Math.round(rand() * 60 - 30),
    color: accent,
    opacity: 0.85,
  });

  // A handful of smaller accents, kept away from the centre where the monogram sits.
  const accentCount = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < accentCount; i++) {
    const kind = SHAPE_KINDS[Math.floor(rand() * SHAPE_KINDS.length)];
    const onLeft = rand() > 0.5;
    shapes.push({
      kind,
      x: width * (onLeft ? 0.06 + rand() * 0.22 : 0.72 + rand() * 0.22),
      y: height * (0.08 + rand() * 0.84),
      size: Math.min(width, height) * (0.1 + rand() * 0.16),
      rotate: Math.round(rand() * 90 - 45),
      color: i % 2 === 0 ? tertiary : "#FFFFFF",
      opacity: i % 2 === 0 ? 0.9 : 0.35,
    });
  }

  return {
    width,
    height,
    base,
    accent,
    ink,
    angle: 120 + Math.floor(rand() * 5) * 30,
    shapes,
    initials: getTitleInitials(title),
  };
};
