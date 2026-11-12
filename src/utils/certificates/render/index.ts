import type { CertificateData, CertificateFormat } from "../../../types/certificate";
import { loadAssets, loadFonts } from "./assets";
import { canvasLandscapeMeasure, drawLandscape, LANDSCAPE_SIZE, planLandscape } from "./landscape";
import { buildSingleImagePdf, deflate, rgbaToRgb } from "./pdf";
import { canvasStoryMeasure, drawStory, planStory, STORY_SIZE } from "./story";

/**
 * The lazily-loaded export module: everything that draws or encodes a
 * certificate lives behind this entry (imported with `import()`), so the rest
 * of the portal doesn't pay for it.
 */

export { CertificateTextOverflowError } from "../layout";

export const FORMAT_SIZES: Record<CertificateFormat, { width: number; height: number }> = {
  landscape: LANDSCAPE_SIZE,
  story: STORY_SIZE,
};

export class CertificateRenderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CertificateRenderError";
  }
}

const createCanvas = (format: CertificateFormat) => {
  const { width, height } = FORMAT_SIZES[format];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // `alpha: false` keeps the backing store opaque, as both PNG and PDF require.
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new CertificateRenderError("Canvas isn't available in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
};

/**
 * Draws one format at its canonical size, after fonts and images are ready.
 * The single code path used by preview, PNG, PDF and share, so what the student
 * approved is exactly what they download.
 */
export const renderCertificateCanvas = async (
  data: CertificateData,
  format: CertificateFormat
): Promise<HTMLCanvasElement> => {
  const [fonts, assets] = await Promise.all([loadFonts(), loadAssets()]);
  const { canvas, ctx } = createCanvas(format);

  // Measure and draw against the same font that will actually render.
  ctx.textBaseline = "middle";
  if (format === "landscape") {
    const plan = planLandscape(data, canvasLandscapeMeasure(ctx, fonts));
    drawLandscape(ctx, plan, assets, fonts);
  } else {
    const plan = planStory(data, canvasStoryMeasure(ctx, fonts));
    drawStory(ctx, plan, assets, fonts);
  }
  return canvas;
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new CertificateRenderError("The image could not be encoded."))),
      type,
      quality
    );
  });

const releaseCanvas = (canvas: HTMLCanvasElement) => {
  // Free the multi-megabyte backing store promptly instead of waiting for GC.
  canvas.width = 0;
  canvas.height = 0;
};

/** The PNG (2400 × 1697 landscape, 1080 × 1920 story) as a Blob — never a base64 string. */
export const renderCertificateBlob = async (data: CertificateData, format: CertificateFormat): Promise<Blob> => {
  const canvas = await renderCertificateCanvas(data, format);
  try {
    return await canvasToBlob(canvas, "image/png");
  } finally {
    releaseCanvas(canvas);
  }
};

/**
 * One A4 landscape page (297 × 210mm) carrying the landscape certificate at
 * full resolution. Lossless where CompressionStream exists, high-quality JPEG
 * otherwise.
 */
export const renderCertificatePdfBlob = async (data: CertificateData): Promise<Blob> => {
  const canvas = await renderCertificateCanvas(data, "landscape");
  try {
    const { width, height } = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new CertificateRenderError("Canvas isn't available in this browser.");

    const compressed = await deflate(rgbaToRgb(ctx.getImageData(0, 0, width, height).data));
    const image = compressed
      ? ({ kind: "flate", data: compressed } as const)
      : ({
          kind: "jpeg",
          data: new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg", 0.95)).arrayBuffer()),
        } as const);

    const pdf = buildSingleImagePdf({ imageWidth: width, imageHeight: height, image });
    return new Blob([pdf as BlobPart], { type: "application/pdf" });
  } finally {
    releaseCanvas(canvas);
  }
};
