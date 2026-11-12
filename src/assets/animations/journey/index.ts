// Looping Vybe clips for the roadmap journey (animated WebP with alpha, 240x352,
// 12 fps, ~5.2 s, seamless). Hand-written, unlike the generated image indexes:
// the loops are rendered from Higgsfield video (see docs/ARCHITECTURE.md,
// "Roadmap journey ambient assets"), not produced by scripts/optimize-assets.mjs.
//
// `poster` is the first frame as a static WebP: the fallback for
// `prefers-reduced-motion` (an animated image cannot be paused).
import wave from "./vybe-wave.webp";
import wavePoster from "./vybe-wave-poster.webp";
import cool from "./vybe-cool.webp";
import coolPoster from "./vybe-cool-poster.webp";
import cheer from "./vybe-cheer.webp";
import cheerPoster from "./vybe-cheer-poster.webp";

export interface JourneyLoop {
  src: string;
  poster: string;
  width: number;
  height: number;
}

export const journeyLoops: Record<string, JourneyLoop> = {
  "loop-wave": { src: wave, poster: wavePoster, width: 240, height: 352 },
  "loop-cool": { src: cool, poster: coolPoster, width: 240, height: 352 },
  "loop-cheer": { src: cheer, poster: cheerPoster, width: 240, height: 352 },
};
