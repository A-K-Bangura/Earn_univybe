import { afterEach, describe, expect, it, vi } from "vitest";
import { canShareFile, copyText, shareCertificateFile } from "./share";

const file = () => new File(["png"], "UniVybe_Intro_Certificate.png", { type: "image/png" });

const setNavigator = (props: Record<string, unknown>) => {
  for (const key of ["share", "canShare", "clipboard"]) {
    Object.defineProperty(navigator, key, { value: undefined, configurable: true, writable: true });
  }
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
};

afterEach(() => {
  setNavigator({});
  vi.restoreAllMocks();
});

describe("canShareFile — feature detection on the actual File", () => {
  it("is false without Web Share", () => {
    setNavigator({});
    expect(canShareFile(file())).toBe(false);
  });

  it("is false when share exists but canShare is missing (text-only share)", () => {
    setNavigator({ share: vi.fn() });
    expect(canShareFile(file())).toBe(false);
  });

  it("is false when the browser says it cannot share this file", () => {
    setNavigator({ share: vi.fn(), canShare: vi.fn(() => false) });
    expect(canShareFile(file())).toBe(false);
  });

  it("is true when canShare accepts the PNG file, and asks about that exact file", () => {
    const canShare = vi.fn(() => true);
    setNavigator({ share: vi.fn(), canShare });
    const f = file();
    expect(canShareFile(f)).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [f] });
  });

  it("is false when canShare throws, and false when there is no file yet", () => {
    setNavigator({
      share: vi.fn(),
      canShare: vi.fn(() => {
        throw new TypeError("nope");
      }),
    });
    expect(canShareFile(file())).toBe(false);
    expect(canShareFile(null)).toBe(false);
  });
});

describe("shareCertificateFile", () => {
  it("shares the prepared PNG file — and only the file (no caption, link or account data)", async () => {
    const share = vi.fn(async () => undefined);
    setNavigator({ share, canShare: vi.fn(() => true) });
    const f = file();
    await expect(shareCertificateFile(f)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    const arg = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(arg.files).toEqual([f]);
    expect(arg).not.toHaveProperty("url");
    expect(arg).not.toHaveProperty("text");
  });

  it("invokes navigator.share synchronously, before any await, so the click keeps its user activation", () => {
    const share = vi.fn(() => new Promise<void>(() => {}));
    setNavigator({ share, canShare: vi.fn(() => true) });
    void shareCertificateFile(file());
    // Nothing has been awaited yet: the call must already have happened.
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("treats the user dismissing the sheet (AbortError) as a quiet cancel", async () => {
    setNavigator({
      share: vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
      canShare: vi.fn(() => true),
    });
    await expect(shareCertificateFile(file())).resolves.toBe("cancelled");
  });

  it("surfaces every other failure so the UI can offer Retry or Download", async () => {
    setNavigator({
      share: vi.fn(async () => {
        throw new DOMException("no activation", "NotAllowedError");
      }),
      canShare: vi.fn(() => true),
    });
    await expect(shareCertificateFile(file())).rejects.toMatchObject({ name: "NotAllowedError" });
  });
});

describe("copyText", () => {
  it("uses the async clipboard when available", async () => {
    const writeText = vi.fn(async () => undefined);
    setNavigator({ clipboard: { writeText } });
    await expect(copyText("caption")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("caption");
  });

  it("reports failure (instead of throwing) when nothing can copy", async () => {
    setNavigator({ clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) } });
    document.execCommand = vi.fn(() => false);
    await expect(copyText("caption")).resolves.toBe(false);
  });
});
