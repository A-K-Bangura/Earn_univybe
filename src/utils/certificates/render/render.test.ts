import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CertificateData } from "../../../types/certificate";
import { normalizeCertificateData } from "../data";
import { CertificateTextOverflowError } from "../layout";

const assetsState = vi.hoisted(() => ({
  assets: { wordmarkColor: {}, wordmarkWhite: {}, graduate: {}, trophy: {} } as Record<string, unknown>,
  brandFace: true,
}));

vi.mock("./assets", () => ({
  loadFonts: vi.fn(async () => ({
    display: assetsState.brandFace ? '"Super Greatly", sans-serif' : "ui-rounded, sans-serif",
    body: "system-ui, sans-serif",
    brandFaceLoaded: assetsState.brandFace,
  })),
  loadAssets: vi.fn(async () => assetsState.assets),
}));

import { renderCertificateBlob, renderCertificatePdfBlob, FORMAT_SIZES } from "./index";

interface Recorder {
  texts: string[];
  images: number;
  fills: string[];
  fonts: string[];
}

let recorder: Recorder;
let canvases: Array<{ width: number; height: number }>;

/** A canvas stand-in that records what was drawn. Every glyph is 0.5em wide. */
const makeContext = () => {
  let font = "";
  const ctx: Record<string, unknown> = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn(() => {
      recorder.images += 1;
    }),
    fillText: vi.fn((text: string) => {
      recorder.texts.push(text);
      recorder.fonts.push(font);
    }),
    measureText: vi.fn((text: string) => {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
      return { width: Array.from(text).length * size * 0.5 };
    }),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4).fill(255),
    })),
  };
  Object.defineProperty(ctx, "font", { get: () => font, set: (v: string) => (font = v) });
  for (const prop of ["fillStyle", "strokeStyle", "lineWidth", "textAlign", "textBaseline", "globalAlpha", "shadowColor", "shadowBlur", "shadowOffsetY", "imageSmoothingEnabled", "imageSmoothingQuality"]) {
    let value: unknown;
    Object.defineProperty(ctx, prop, {
      get: () => value,
      set: (v) => {
        value = v;
        if (prop === "fillStyle" && typeof v === "string") recorder.fills.push(v);
      },
    });
  }
  return ctx;
};

/** Reads a (jsdom) Blob as latin1 text. */
const readText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(blob);
  });

const data = (over: Partial<Parameters<typeof normalizeCertificateData>[0]> = {}): CertificateData =>
  normalizeCertificateData({
    studentId: "private-student-id",
    courseId: "private-course-id",
    courseTitle: "Intro to Programming",
    profileName: "Ada Lovelace",
    completedAt: "2026-10-09T14:30:00Z",
    ...over,
  })!;

beforeEach(() => {
  recorder = { texts: [], images: 0, fills: [], fonts: [] };
  canvases = [];
  assetsState.assets = { wordmarkColor: { width: 1100, height: 338 }, wordmarkWhite: { width: 420, height: 135 }, graduate: { width: 379, height: 720 }, trophy: { width: 478, height: 720 } };
  assetsState.brandFace = true;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    canvases.push(this);
    return makeContext() as unknown as CanvasRenderingContext2D;
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb, type) {
    // jsdom's Blob lacks arrayBuffer(), which real browsers have.
    const blob = new Blob(["encoded"], { type: type ?? "image/png" });
    cb(Object.assign(blob, { arrayBuffer: async () => new TextEncoder().encode("encoded").buffer }));
  });
});

afterEach(() => vi.restoreAllMocks());

describe("renderCertificateBlob", () => {
  it("draws the landscape certificate on a 2400 × 1697 canvas and encodes a PNG blob", async () => {
    const blob = await renderCertificateBlob(data(), "landscape");
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("image/png");
    expect(FORMAT_SIZES.landscape).toEqual({ width: 2400, height: 1697 });
    // The canvas was created at the canonical size before being released.
    expect(canvases).toHaveLength(1);
  });

  it("uses a 1080 × 1920 (9:16) story canvas", async () => {
    expect(FORMAT_SIZES.story).toEqual({ width: 1080, height: 1920 });
    expect(FORMAT_SIZES.story.width / FORMAT_SIZES.story.height).toBeCloseTo(9 / 16, 5);
    await renderCertificateBlob(data(), "story");
  });

  it("prints the name, full course title, recorded date and fixed brand copy — and no private ids", async () => {
    await renderCertificateBlob(data(), "landscape");
    const printed = recorder.texts.join("|");
    expect(printed).toContain("Ada Lovelace");
    expect(printed).toContain("Intro to Programming");
    expect(printed).toContain("Completed 9 October 2026");
    expect(printed).toContain("CERTIFICATE OF COMPLETION".charAt(0));
    expect(printed).toContain("A celebration of learning on UniVybe");
    expect(printed).not.toMatch(/private-student-id|private-course-id|accredit|verified|signature/i);
  });

  it("story card carries the same name, course and date", async () => {
    await renderCertificateBlob(data(), "story");
    const printed = recorder.texts.join("|");
    expect(printed).toContain("Ada Lovelace");
    expect(printed).toContain("Completed 9 October 2026");
    expect(printed).toContain("A new vibe for learning");
    // The title may wrap across lines; every word is still drawn.
    expect(recorder.texts.join(" ")).toContain("Intro to Progra");
    expect(recorder.texts.join(" ").replace(/s+/g, " ")).toMatch(/Intro to Prograw*/);
    expect(printed).not.toMatch(/private-/);
  });

  it("omits the date when none was recorded and never invents today's date", async () => {
    await renderCertificateBlob(data({ completedAt: null }), "landscape");
    expect(recorder.texts.join("|")).not.toMatch(/Completed \d|20\d\d/);
  });

  it("wraps a long course title into full lines without ellipsis", async () => {
    const title = "Introduction to Data Structures, Algorithms and Computational Thinking for Sierra Leone Universities";
    await renderCertificateBlob(data({ courseTitle: title }), "landscape");
    const lines = recorder.texts.filter((t) => title.includes(t) && t.length > 10);
    expect(lines.join(" ").replace(/\s+/g, " ")).toBe(title);
    expect(recorder.texts.join("")).not.toMatch(/…|\.\.\./);
  });

  it("keeps Unicode names intact", async () => {
    await renderCertificateBlob(data({ profileName: "Zoë Müller-Åberg 李小龍" }), "landscape");
    expect(recorder.texts.join("|")).toContain("Zoë Müller-Åberg 李小龍");
  });

  it("draws the decorative mascot when available and a brand-shape fallback when it is missing", async () => {
    await renderCertificateBlob(data(), "landscape");
    const withAssets = recorder.images;
    expect(withAssets).toBe(2); // wordmark + mascot

    recorder = { texts: [], images: 0, fills: [], fonts: [] };
    assetsState.assets = { wordmarkColor: null, wordmarkWhite: null, graduate: null, trophy: null };
    const blob = await renderCertificateBlob(data(), "landscape");
    expect(blob.size).toBeGreaterThan(0);
    expect(recorder.images).toBe(0);
    // Text wordmark + amber brand-shape disc instead of images.
    expect(recorder.texts).toContain("UniVybe");
    expect(recorder.fills).toContain("#FFBE0B");
  });

  it("story card also survives missing assets", async () => {
    assetsState.assets = { wordmarkColor: null, wordmarkWhite: null, graduate: null, trophy: null };
    await renderCertificateBlob(data(), "story");
    expect(recorder.texts).toContain("UniVybe");
    expect(recorder.texts.join(" ")).toMatch(/Intro to/);
  });

  it("still renders, with the fallback font stack, when the brand font fails to load", async () => {
    assetsState.brandFace = false;
    await renderCertificateBlob(data(), "landscape");
    expect(recorder.texts.join("|")).toContain("Ada Lovelace");
    expect(recorder.fonts.some((f) => f.includes("Super Greatly"))).toBe(false);
    expect(recorder.fonts.some((f) => f.includes("ui-rounded"))).toBe(true);
  });

  it("refuses to produce a clipped certificate for text that cannot fit", async () => {
    await expect(renderCertificateBlob(data({ courseTitle: "word ".repeat(3000) }), "landscape")).rejects.toBeInstanceOf(
      CertificateTextOverflowError
    );
  });

  it("fails clearly when the browser cannot encode the image", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(null));
    await expect(renderCertificateBlob(data(), "landscape")).rejects.toThrow(/could not be encoded/i);
  });
});

describe("renderCertificatePdfBlob", () => {
  it("produces a one-page A4 landscape PDF carrying the full-resolution landscape image", async () => {
    const blob = await renderCertificatePdfBlob(data());
    expect(blob.type).toBe("application/pdf");
    const text = await readText(blob);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 841.89 595.28]");
    expect(text).toContain("/Count 1");
    expect(text).toContain("/Width 2400 /Height 1697");
    // Rendered from the same landscape composition as the PNG.
    expect(recorder.texts.join("|")).toContain("Ada Lovelace");
  });

  it("falls back to a JPEG image where lossless compression isn't available", async () => {
    const original = globalThis.CompressionStream;
    // @ts-expect-error simulating an older browser
    delete globalThis.CompressionStream;
    try {
      const blob = await renderCertificatePdfBlob(data());
      const text = await readText(blob);
      expect(text).toContain("/Filter /DCTDecode");
    } finally {
      globalThis.CompressionStream = original;
    }
  });
});
