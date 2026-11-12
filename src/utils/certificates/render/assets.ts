import logoColorsSrc from "../../../assets/landing/logo-colors.webp";
import logoWordWhiteSrc from "../../../assets/landing/logo-word-white.webp";
import graduateSrc from "../../../assets/player/player-graduate.webp";
import trophySrc from "../../../assets/player/player-trophy.webp";

/**
 * Bundled, same-origin brand art only. No remote course thumbnails or avatars:
 * they add no required information and could taint the canvas.
 */
export interface CertificateAssets {
  /** Full-colour UniVybe wordmark (light backgrounds). */
  wordmarkColor: HTMLImageElement | null;
  /** White wordmark (the colourful story card). */
  wordmarkWhite: HTMLImageElement | null;
  /** Mascot with cap and diploma. */
  graduate: HTMLImageElement | null;
  /** Mascot with trophy. */
  trophy: HTMLImageElement | null;
}

export interface CertificateFonts {
  /** CSS font-family for display text; falls back to the system rounded stack. */
  display: string;
  /** CSS font-family for body text. */
  body: string;
  /** Whether the bundled brand face actually loaded. */
  brandFaceLoaded: boolean;
}

const BODY_STACK =
  '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Roboto, Arial, "Noto Sans", sans-serif';
const DISPLAY_FALLBACK = 'ui-rounded, "Segoe UI", system-ui, sans-serif';

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });

/**
 * Waits for the bundled brand faces (declared in index.css) before any text is
 * measured. If they can't load, rendering still proceeds with the fallback
 * stack — measurement then happens against the font that will actually draw.
 */
export const loadFonts = async (): Promise<CertificateFonts> => {
  let brandFaceLoaded = false;
  if (typeof document !== "undefined" && document.fonts) {
    const loaded = await withTimeout(
      Promise.all([
        document.fonts.load('400 64px "Super Greatly"', "UniVybe Abc"),
        document.fonts.load('400 64px "Bangers"', "UniVybe Abc"),
      ]),
      6000
    );
    await withTimeout(document.fonts.ready, 2000);
    brandFaceLoaded = !!loaded && document.fonts.check('400 64px "Super Greatly"');
  }
  return {
    display: brandFaceLoaded ? `"Super Greatly", "Bangers", ${DISPLAY_FALLBACK}` : DISPLAY_FALLBACK,
    body: BODY_STACK,
    brandFaceLoaded,
  };
};

/**
 * Loads one bundled image. Completion is the `load` event, which still fires
 * in a background tab; `decode()` is only a short best-effort afterwards
 * (it can stall while the tab is hidden, and drawImage decodes on demand
 * anyway), so a hidden tab can't silently degrade the export to fallback art.
 */
const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
  if (typeof Image === "undefined") return null;
  try {
    const image = new Image();
    const loaded = new Promise<boolean>((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
    });
    image.src = src;
    if (!(await withTimeout(loaded, 10000))) return null;
    if (typeof image.decode === "function") await withTimeout(image.decode(), 1500);
    return image;
  } catch {
    return null;
  }
};

/** Decorative art may fail individually; the renderers draw a brand-shape fallback instead. */
export const loadAssets = async (): Promise<CertificateAssets> => {
  const [wordmarkColor, wordmarkWhite, graduate, trophy] = await Promise.all([
    loadImage(logoColorsSrc),
    loadImage(logoWordWhiteSrc),
    loadImage(graduateSrc),
    loadImage(trophySrc),
  ]);
  return { wordmarkColor, wordmarkWhite, graduate, trophy };
};
