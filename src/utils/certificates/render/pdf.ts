/**
 * A minimal single-page PDF writer that embeds one raster image across the
 * whole page. It exists so the landscape certificate can be a real A4 PDF
 * without adding a PDF library to the bundle (the text is part of the image,
 * so it isn't searchable — documented V1 behaviour).
 */

/** A4 landscape in PDF points (1pt = 1/72in): 297mm × 210mm. */
export const A4_LANDSCAPE_PT = { width: (297 / 25.4) * 72, height: (210 / 25.4) * 72 } as const;

export type PdfImage =
  /** zlib-compressed 8-bit RGB scanlines, no predictor. */
  | { kind: "flate"; data: Uint8Array }
  /** A complete baseline JPEG file. */
  | { kind: "jpeg"; data: Uint8Array };

export interface SingleImagePdfOptions {
  imageWidth: number;
  imageHeight: number;
  image: PdfImage;
  pageWidthPt?: number;
  pageHeightPt?: number;
  title?: string;
}

const encoder = new TextEncoder();

const fmt = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

const escapePdfString = (value: string) =>
  value.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7E]/g, "?");

export const buildSingleImagePdf = (options: SingleImagePdfOptions): Uint8Array => {
  const pageW = options.pageWidthPt ?? A4_LANDSCAPE_PT.width;
  const pageH = options.pageHeightPt ?? A4_LANDSCAPE_PT.height;
  const { imageWidth, imageHeight, image } = options;

  const content = encoder.encode(`q\n${fmt(pageW)} 0 0 ${fmt(pageH)} 0 0 cm\n/Im0 Do\nQ\n`);
  const filter = image.kind === "flate" ? "/FlateDecode" : "/DCTDecode";

  // Objects are numbered 1..6; `body[n]` holds the bytes between "n 0 obj\n" and "\nendobj".
  const text = (s: string) => encoder.encode(s);
  const stream = (dict: string, data: Uint8Array) => [
    text(`<< ${dict} /Length ${data.length} >>\nstream\n`),
    data,
    text("\nendstream"),
  ];

  const body: Uint8Array[][] = [
    [text("<< /Type /Catalog /Pages 2 0 R >>")],
    [text("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")],
    [
      text(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pageW)} ${fmt(pageH)}] ` +
          "/Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>"
      ),
    ],
    stream("", content),
    stream(
      `/Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter ${filter}`,
      image.data
    ),
    [text(`<< /Title (${escapePdfString(options.title ?? "UniVybe Certificate of Completion")}) /Producer (UniVybe) >>`)],
  ];

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (chunk: Uint8Array) => {
    chunks.push(chunk);
    offset += chunk.length;
  };

  // Header + binary marker comment so tools treat the file as binary.
  push(text("%PDF-1.4\n"));
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const offsets: number[] = [];
  body.forEach((parts, index) => {
    offsets.push(offset);
    push(text(`${index + 1} 0 obj\n`));
    parts.forEach(push);
    push(text("\nendobj\n"));
  });

  const xrefOffset = offset;
  let xref = `xref\n0 ${body.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  push(text(xref));
  push(text(`trailer\n<< /Size ${body.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));

  const out = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
};

/** Drops the alpha channel: the canvas is opaque, and PDF DeviceRGB has none. */
export const rgbaToRgb = (rgba: Uint8ClampedArray | Uint8Array): Uint8Array => {
  const pixels = rgba.length / 4;
  const rgb = new Uint8Array(pixels * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  return rgb;
};

/** zlib-deflates bytes with the platform's CompressionStream, or null where it doesn't exist. */
export const deflate = async (bytes: Uint8Array): Promise<Uint8Array | null> => {
  if (typeof CompressionStream === "undefined") return null;
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes as BufferSource);
      controller.close();
    },
  });
  const stream = source.pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};
