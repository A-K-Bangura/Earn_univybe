/**
 * Pure text-fitting helpers for the certificate renderers. They take a
 * `measure` function instead of a canvas so the same code runs under test with
 * a fake ruler, and so a name or course title is only ever wrapped or shrunk —
 * never ellipsized or clipped.
 */

export type Measure = (text: string, sizePx: number) => number;

/** Thrown when text cannot be fitted at a readable size. Callers must not export a clipped artifact. */
export class CertificateTextOverflowError extends Error {
  constructor(what: string) {
    super(`The ${what} is too long to fit on a certificate.`);
    this.name = "CertificateTextOverflowError";
  }
}

/**
 * Longest course title either composition will attempt. Real titles are well
 * under 150 characters; anything beyond this cannot be set at a readable size,
 * and refusing early avoids wrapping thousands of words just to fail.
 */
export const MAX_COURSE_TITLE_CHARS = 500;

export const assertTitleLength = (title: string): void => {
  if (title.length > MAX_COURSE_TITLE_CHARS) throw new CertificateTextOverflowError("course title");
};

const segmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** User-perceived characters, so a break never splits an emoji or a base letter from its accent. */
export const splitGraphemes = (text: string): string[] =>
  segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);

/**
 * Greedy word wrap. A single word wider than `maxWidth` (a long German
 * compound, an unspaced CJK title, a URL-ish string) is broken between
 * graphemes rather than overflowing.
 */
export const wrapText = (text: string, maxWidth: number, sizePx: number, measure: Measure): string[] => {
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  const pushWord = (word: string) => {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, sizePx) <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (measure(word, sizePx) <= maxWidth) {
      line = word;
      return;
    }
    // Overlong word: fill lines grapheme by grapheme.
    let chunk = "";
    for (const grapheme of splitGraphemes(word)) {
      if (chunk && measure(chunk + grapheme, sizePx) > maxWidth) {
        lines.push(chunk);
        chunk = grapheme;
      } else {
        chunk += grapheme;
      }
    }
    line = chunk;
  };

  words.forEach(pushWord);
  if (line) lines.push(line);
  return lines;
};

export interface FitOptions {
  text: string;
  maxWidth: number;
  maxHeight: number;
  maxSize: number;
  minSize: number;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  maxLines: number;
  measure: Measure;
  step?: number;
}

export interface FittedText {
  lines: string[];
  size: number;
  lineHeightPx: number;
  height: number;
  fits: boolean;
}

/** The largest size in [minSize, maxSize] at which the wrapped text fits the box. */
export const fitText = (options: FitOptions): FittedText => {
  const { text, maxWidth, maxHeight, maxSize, minSize, lineHeight, maxLines, measure } = options;
  const step = options.step ?? 2;

  let size = Math.max(minSize, maxSize);
  let result: FittedText | null = null;
  for (;;) {
    const lines = wrapText(text, maxWidth, size, measure);
    const lineHeightPx = Math.round(size * lineHeight);
    const height = lines.length * lineHeightPx;
    const widest = lines.reduce((w, l) => Math.max(w, measure(l, size)), 0);
    result = {
      lines,
      size,
      lineHeightPx,
      height,
      fits: lines.length <= maxLines && height <= maxHeight && widest <= maxWidth + 0.5,
    };
    if (result.fits || size <= minSize) break;
    size = Math.max(minSize, size - step);
  }
  return result;
};

/** Total printed height of consecutive blocks separated by gaps. */
export const stackHeight = (heights: readonly number[], gaps: readonly number[]): number =>
  heights.reduce((sum, h) => sum + h, 0) + gaps.reduce((sum, g) => sum + g, 0);

export interface FitTier {
  maxLines: number;
  maxSize: number;
  minSize: number;
  maxHeight: number;
}

/**
 * Tries progressively more forgiving tiers (more lines allowed, smaller
 * minimum size) and returns the first one that fits. If none does, the last
 * (most forgiving) result comes back with `fits: false`, so callers can refuse
 * to export rather than clip.
 */
export const fitTiered = (
  text: string,
  maxWidth: number,
  lineHeight: number,
  measure: Measure,
  tiers: readonly FitTier[]
): FittedText => {
  let last: FittedText | null = null;
  for (const tier of tiers) {
    last = fitText({ text, maxWidth, lineHeight, measure, ...tier });
    if (last.fits) return last;
  }
  return last as FittedText;
};
