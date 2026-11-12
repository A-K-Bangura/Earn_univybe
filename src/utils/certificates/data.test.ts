import { describe, expect, it } from "vitest";
import {
  MAX_DISPLAY_NAME_LENGTH,
  certificateAltText,
  certificateCaption,
  certificateFilename,
  evaluateCompletion,
  formatCompletionDate,
  normalizeCertificateData,
  pickProfileName,
  validateDisplayName,
} from "./data";

describe("pickProfileName", () => {
  it("prefers a non-empty full_name", () => {
    expect(pickProfileName({ full_name: "  Mariama  Sesay ", firstname: "X", lastname: "Y" })).toBe(
      "Mariama Sesay"
    );
  });

  it("falls back to the joined non-empty first/last names", () => {
    expect(pickProfileName({ full_name: "  ", firstname: "Ibrahim", lastname: "Kamara" })).toBe(
      "Ibrahim Kamara"
    );
    expect(pickProfileName({ firstname: "Isatu", lastname: null })).toBe("Isatu");
  });

  it("returns an empty string when nothing is usable, so the page asks for a name", () => {
    expect(pickProfileName({ full_name: "", firstname: null, lastname: " " })).toBe("");
    expect(pickProfileName(null)).toBe("");
  });

  it("does not use the email or any other field", () => {
    expect(pickProfileName({ email: "secret@x.com" } as never)).toBe("");
  });
});

describe("validateDisplayName", () => {
  it("accepts and trims ordinary names, collapsing inner whitespace", () => {
    expect(validateDisplayName("  Alhaji   Kajalie Bangura ")).toEqual({
      ok: true,
      name: "Alhaji Kajalie Bangura",
    });
  });

  it("preserves Unicode, diacritics and emoji", () => {
    for (const name of ["Zoë Müller-Åberg", "李小龍", "محمد علي", "Ñandú 🌍"]) {
      expect(validateDisplayName(name)).toEqual({ ok: true, name });
    }
  });

  it("does not require a first/last-name shape or ASCII", () => {
    expect(validateDisplayName("Madonna").ok).toBe(true);
  });

  it("rejects blank and invisible-only names", () => {
    expect(validateDisplayName("")).toEqual({ ok: false, reason: "blank" });
    expect(validateDisplayName("   ")).toEqual({ ok: false, reason: "blank" });
    expect(validateDisplayName("\u200B\u200D")).toEqual({ ok: false, reason: "blank" });
  });

  it("rejects line breaks and control characters in the middle of a name", () => {
    expect(validateDisplayName("Ada\nLovelace")).toEqual({ ok: false, reason: "unsafe" });
    expect(validateDisplayName("Ada\tLovelace")).toEqual({ ok: false, reason: "unsafe" });
    expect(validateDisplayName("Ada\u0007Lovelace")).toEqual({ ok: false, reason: "unsafe" });
    expect(validateDisplayName("Ada\u2028Lovelace")).toEqual({ ok: false, reason: "unsafe" });
  });

  it("rejects bidi override characters that could reorder printed text", () => {
    expect(validateDisplayName("Ada\u202ELovelace")).toEqual({ ok: false, reason: "unsafe" });
    expect(validateDisplayName("Ada\u2066Lovelace")).toEqual({ ok: false, reason: "unsafe" });
  });

  it(`allows exactly ${MAX_DISPLAY_NAME_LENGTH} characters and rejects one more`, () => {
    expect(validateDisplayName("a".repeat(MAX_DISPLAY_NAME_LENGTH)).ok).toBe(true);
    expect(validateDisplayName("a".repeat(MAX_DISPLAY_NAME_LENGTH + 1))).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("counts code points, not UTF-16 units (an emoji is one character)", () => {
    expect(validateDisplayName("🌍".repeat(MAX_DISPLAY_NAME_LENGTH)).ok).toBe(true);
    expect(validateDisplayName("🌍".repeat(MAX_DISPLAY_NAME_LENGTH + 1)).ok).toBe(false);
  });
});

describe("formatCompletionDate (Africa/Freetown)", () => {
  it("formats the recorded date with an explicit day, month and year", () => {
    expect(formatCompletionDate("2026-10-09T14:30:00.000000Z")).toBe("9 October 2026");
  });

  it("uses the Freetown calendar day regardless of the device timezone", () => {
    // 23:59 UTC is still the 9th in Freetown (UTC+0) …
    expect(formatCompletionDate("2026-10-09T23:59:59Z")).toBe("9 October 2026");
    // … and an offset timestamp resolves to the same instant's Freetown day.
    expect(formatCompletionDate("2026-10-09T23:30:00-05:00")).toBe("10 October 2026");
    expect(formatCompletionDate("2026-10-10T04:30:00Z")).toBe("10 October 2026");
  });

  it("returns null for a missing or unusable date — never today's date", () => {
    expect(formatCompletionDate(null)).toBeNull();
    expect(formatCompletionDate(undefined)).toBeNull();
    expect(formatCompletionDate("")).toBeNull();
    expect(formatCompletionDate("not a date")).toBeNull();
  });
});

describe("evaluateCompletion — server record only", () => {
  it("is complete when the server says so (free or paid: no price/coins involved)", () => {
    expect(evaluateCompletion({ is_completed: true, completed_at: "2026-10-09T10:00:00Z" })).toBe("complete");
  });

  it("is complete with a date and no flag (is_completed is derived from completed_at)", () => {
    expect(evaluateCompletion({ completed_at: "2026-10-09T10:00:00Z" })).toBe("complete");
  });

  it("is complete without a date when the flag is true (legacy rows)", () => {
    expect(evaluateCompletion({ is_completed: true, completed_at: null })).toBe("complete");
  });

  it("is incomplete without server completion, however far along the percentage is", () => {
    expect(
      evaluateCompletion({ is_completed: false, completed_at: null, progress_percent: 100 } as never)
    ).toBe("incomplete");
    expect(evaluateCompletion({ progress_percent: "100" } as never)).toBe("incomplete");
    expect(evaluateCompletion({})).toBe("incomplete");
  });

  it("reports a self-contradicting record as a mismatch, never as eligible", () => {
    expect(evaluateCompletion({ is_completed: false, completed_at: "2026-10-09T10:00:00Z" })).toBe("mismatch");
  });
});

describe("normalizeCertificateData", () => {
  const base = {
    studentId: 42,
    courseId: "course-uuid",
    courseTitle: "  Intro   to Programming ",
    profileName: "Alhaji Bangura",
    completedAt: "2026-10-09T14:30:00Z",
  };

  it("defaults the printed name to the profile name and keeps the API timestamp unchanged", () => {
    const data = normalizeCertificateData(base)!;
    expect(data.displayName).toBe("Alhaji Bangura");
    expect(data.profileName).toBe("Alhaji Bangura");
    expect(data.courseTitle).toBe("Intro to Programming");
    expect(data.completedAt).toBe("2026-10-09T14:30:00Z");
    expect(data.completionDateLabel).toBe("Completed 9 October 2026");
    expect(data.templateVersion).toBe("v1");
  });

  it("uses a corrected name for the certificate only, leaving profileName intact", () => {
    const data = normalizeCertificateData({ ...base, displayName: "Alhaji K. Bangura" })!;
    expect(data.displayName).toBe("Alhaji K. Bangura");
    expect(data.profileName).toBe("Alhaji Bangura");
  });

  it("omits the date label when none was recorded", () => {
    const data = normalizeCertificateData({ ...base, completedAt: null })!;
    expect(data.completedAt).toBeNull();
    expect(data.completionDateLabel).toBeNull();
  });

  it("refuses to build data without a course title or a printable name", () => {
    expect(normalizeCertificateData({ ...base, courseTitle: "  " })).toBeNull();
    expect(normalizeCertificateData({ ...base, courseTitle: null })).toBeNull();
    expect(normalizeCertificateData({ ...base, profileName: "" })).toBeNull();
    expect(normalizeCertificateData({ ...base, displayName: "Bad\nName" })).toBeNull();
  });
});

describe("filenames, caption and alt text", () => {
  it("builds safe, length-limited filenames with no student identifiers", () => {
    expect(certificateFilename("Intro to Programming", "landscape", "png")).toBe(
      "UniVybe_Intro-to-Programming_Certificate.png"
    );
    expect(certificateFilename("Intro to Programming", "landscape", "pdf")).toBe(
      "UniVybe_Intro-to-Programming_Certificate.pdf"
    );
    expect(certificateFilename("Intro to Programming", "story", "png")).toBe(
      "UniVybe_Intro-to-Programming_Story.png"
    );
  });

  it("strips path/special characters and accents, and caps the length", () => {
    const name = certificateFilename('../../Écologie: "C++" / <Intro>?', "landscape", "png");
    expect(name).toBe("UniVybe_Ecologie-C-Intro_Certificate.png");
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    const long = certificateFilename("Very long title ".repeat(30), "story", "png");
    expect(long.length).toBeLessThan(90);
  });

  it("falls back for titles with no filename-safe characters", () => {
    expect(certificateFilename("李小龍", "landscape", "png")).toBe("UniVybe_Course_Certificate.png");
  });

  it("writes the suggested caption", () => {
    expect(certificateCaption("Intro to Programming")).toBe(
      "I completed Intro to Programming on UniVybe! A new vibe for learning."
    );
  });

  it("includes course, name and date in the preview's alt text", () => {
    const data = normalizeCertificateData({
      studentId: 1,
      courseId: "c",
      courseTitle: "Intro to Programming",
      profileName: "Ada Lovelace",
      completedAt: "2026-10-09T10:00:00Z",
    })!;
    const alt = certificateAltText(data, "landscape");
    expect(alt).toContain("Ada Lovelace");
    expect(alt).toContain("Intro to Programming");
    expect(alt).toContain("9 October 2026");
    expect(certificateAltText(data, "story")).toMatch(/^Story card/);
  });
});
