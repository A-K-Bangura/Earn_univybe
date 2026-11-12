import { describe, expect, it } from "vitest";
import { A4_LANDSCAPE_PT, buildSingleImagePdf, deflate, rgbaToRgb } from "./render/pdf";

const decode = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("buildSingleImagePdf", () => {
  const image = { kind: "flate", data: new Uint8Array([120, 156, 1, 2, 3, 4, 5]) } as const;
  const pdf = buildSingleImagePdf({ imageWidth: 2400, imageHeight: 1697, image });
  const text = decode(pdf);

  it("is A4 landscape: 297 × 210mm in PDF points", () => {
    expect((A4_LANDSCAPE_PT.width / 72) * 25.4).toBeCloseTo(297, 5);
    expect((A4_LANDSCAPE_PT.height / 72) * 25.4).toBeCloseTo(210, 5);
    expect(text).toContain("/MediaBox [0 0 841.89 595.28]");
  });

  it("has exactly one page and one image drawn across it", () => {
    expect(text).toMatch(/^%PDF-1\.4/);
    expect(text.match(/\/Type \/Page /g)).toHaveLength(1);
    expect(text).toContain("/Kids [3 0 R] /Count 1");
    expect(text).toContain("/Subtype /Image /Width 2400 /Height 1697");
    expect(text).toContain("841.89 0 0 595.28 0 0 cm\n/Im0 Do");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("records correct byte offsets for every object in the xref table", () => {
    const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(6);
    entries.forEach((offset, i) => {
      expect(text.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
  });

  it("declares the image stream length truthfully and embeds the bytes untouched", () => {
    expect(text).toContain(`/Filter /FlateDecode /Length ${image.data.length}`);
    const at = pdf.findIndex((_, i) => pdf[i] === 120 && pdf[i + 1] === 156 && pdf[i + 2] === 1);
    expect([...pdf.slice(at, at + image.data.length)]).toEqual([...image.data]);
  });

  it("supports a JPEG image through DCTDecode", () => {
    const jpeg = buildSingleImagePdf({
      imageWidth: 10,
      imageHeight: 10,
      image: { kind: "jpeg", data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) },
    });
    expect(decode(jpeg)).toContain("/Filter /DCTDecode");
  });

  it("carries only a generic title — no student or course details", () => {
    expect(text).toContain("/Title (UniVybe Certificate of Completion)");
  });
});

describe("rgbaToRgb / deflate", () => {
  it("drops the alpha channel", () => {
    expect([...rgbaToRgb(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]))]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("returns null where CompressionStream is unavailable (caller falls back to JPEG)", async () => {
    const original = globalThis.CompressionStream;
    // @ts-expect-error simulating an older browser
    delete globalThis.CompressionStream;
    try {
      expect(await deflate(new Uint8Array([1, 2, 3]))).toBeNull();
    } finally {
      globalThis.CompressionStream = original;
    }
  });
});
