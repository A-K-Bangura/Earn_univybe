// Deterministic brand-colour picking. Used wherever the UI wants colour
// variety that must NOT change between renders or visits: fallback course
// covers and roadmap page themes (docs/designs/univybe_course_discovery_
// roadmaps_design_guide.md §7, §11).

export const BRAND_COLORS = [
  "#3A86FF", // azure
  "#FFBE0B", // amber
  "#FF006E", // rose
  "#00F5D4", // aquamarine
  "#8338EC", // blue violet
] as const;

export type BrandColor = (typeof BRAND_COLORS)[number];

/** Text colour that stays readable on a brand colour (yellow/cyan need dark ink). */
const DARK_INK = "#0B1026";
const LIGHT_INK = "#FFFFFF";

/** FNV-1a, 32-bit. Small, fast and stable across browsers and sessions. */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** Small deterministic PRNG: the same seed always yields the same sequence in [0, 1). */
export const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A brand colour derived from `seed` alone; `offset` picks a different colour for the same seed. */
export const getStableBrandColor = (seed: string, offset = 0): BrandColor =>
  BRAND_COLORS[(hashString(seed) + offset) % BRAND_COLORS.length];

/**
 * The accent colour for one page ("stage") of a roadmap journey.
 *
 * Looks random across pages but is a pure function of `slug` and `page`, so a
 * student always sees the same colour for the same stage. Never repeats the
 * previous page's colour (walks from page 1 to resolve that deterministically).
 */
export const getRoadmapPageThemeColor = (
  slug: string,
  page: number
): BrandColor => {
  const target = Math.max(1, Math.floor(page) || 1);
  let previous = -1;
  for (let current = 1; current <= target; current++) {
    let index = hashString(`${slug}:${current}`) % BRAND_COLORS.length;
    if (index === previous) index = (index + 1) % BRAND_COLORS.length;
    previous = index;
  }
  return BRAND_COLORS[previous];
};

/** Ink colour (dark or white) with enough contrast on top of a brand colour. */
export const getInkOn = (color: string): string => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Perceived luminance (Rec. 601); the brand yellow/cyan land well above 0.6.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? DARK_INK : LIGHT_INK;
};
