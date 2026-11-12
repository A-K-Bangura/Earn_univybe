import { describe, expect, it } from "vitest";
import { CertificateTextOverflowError, MAX_COURSE_TITLE_CHARS, fitText, splitGraphemes, wrapText } from "./layout";
import { planLandscape } from "./render/landscape";
import { planStory } from "./render/story";

/** A fake ruler: every character is 0.55em wide. Deterministic, no canvas needed. */
const ruler = (text: string, size: number) => Array.from(text).length * size * 0.55;

const joined = (lines: string[]) => lines.join(" ");

describe("wrapText", () => {
  it("wraps on spaces and never drops or alters a word", () => {
    const text = "Introduction to Data Structures and Algorithms for Universities";
    const lines = wrapText(text, 600, 40, ruler);
    expect(lines.length).toBeGreaterThan(1);
    expect(joined(lines)).toBe(text);
    lines.forEach((line) => expect(ruler(line, 40)).toBeLessThanOrEqual(600));
  });

  it("breaks an over-long unspaced word between characters instead of overflowing", () => {
    const word = "Supercalifragilisticexpialidocious".repeat(2);
    const lines = wrapText(word, 400, 40, ruler);
    expect(lines.join("")).toBe(word);
    lines.forEach((line) => expect(ruler(line, 40)).toBeLessThanOrEqual(400));
  });

  it("never splits an emoji or a combining sequence across lines", () => {
    const text = "🌍".repeat(30);
    const lines = wrapText(text, 200, 40, ruler);
    expect(lines.join("")).toBe(text);
    lines.forEach((line) => expect(Array.from(line).every((c) => c === "🌍")).toBe(true));
    expect(splitGraphemes("éx")).toEqual(["é", "x"]);
  });

  it("keeps CJK text whole (no spaces to break on)", () => {
    const text = "数据结构与算法导论数据结构与算法导论";
    expect(wrapText(text, 300, 40, ruler).join("")).toBe(text);
  });
});

describe("fitText", () => {
  const base = { maxWidth: 800, lineHeight: 1.2, measure: ruler, step: 2 };

  it("uses the maximum size when the text already fits", () => {
    const fit = fitText({ ...base, text: "Short", maxHeight: 300, maxSize: 100, minSize: 40, maxLines: 2 });
    expect(fit.size).toBe(100);
    expect(fit.fits).toBe(true);
    expect(fit.lines).toEqual(["Short"]);
  });

  it("shrinks until it fits", () => {
    const fit = fitText({ ...base, text: "A fairly long course title here", maxHeight: 300, maxSize: 120, minSize: 40, maxLines: 1 });
    expect(fit.fits).toBe(true);
    expect(fit.size).toBeLessThan(120);
    expect(ruler(fit.lines[0], fit.size)).toBeLessThanOrEqual(800);
  });

  it("reports `fits: false` at the minimum size instead of pretending", () => {
    const fit = fitText({ ...base, text: "word ".repeat(400), maxHeight: 200, maxSize: 60, minSize: 40, maxLines: 3 });
    expect(fit.fits).toBe(false);
    expect(fit.size).toBe(40);
  });
});

describe("planLandscape", () => {
  const data = (displayName: string, courseTitle: string, completionDateLabel: string | null = "Completed 9 October 2026") => ({
    displayName,
    courseTitle,
    completionDateLabel,
  });
  const measure = (_role: string, text: string, size: number) => ruler(text, size);

  it("lays out a normal name and title on one line each, with the date", () => {
    const plan = planLandscape(data("Alhaji Bangura", "Intro to Programming"), measure);
    expect(plan.name.lines).toEqual(["Alhaji Bangura"]);
    expect(plan.title.lines).toEqual(["Intro to Programming"]);
    expect(plan.date?.text).toBe("Completed 9 October 2026");
  });

  it("wraps a long name instead of ellipsizing, preserving every character", () => {
    const name = "Mariama Fatmata Kamara-Sesay Johnson-Williams Bangura";
    const plan = planLandscape(data(name, "Intro"), measure);
    expect(plan.name.lines.length).toBeGreaterThan(1);
    expect(joined(plan.name.lines)).toBe(name);
    expect(plan.name.lines.join("")).not.toMatch(/…|\.\.\./);
  });

  it("shows a long course title in full, shrinking but staying readable", () => {
    const title =
      "Foundations of Applied Quantitative Methods, Statistical Reasoning, Data Visualisation and Evidence-Based Decision Making for Public Health";
    const plan = planLandscape(data("Ada Lovelace", title), measure);
    expect(joined(plan.title.lines)).toBe(title);
    expect(plan.title.size).toBeGreaterThanOrEqual(36);
  });

  it("keeps every block inside the flow zone between the wordmark and the footer", () => {
    const plan = planLandscape(
      data("Mariama Fatmata Kamara-Sesay Johnson-Williams", "Introduction to Data Structures, Algorithms and Computational Thinking"),
      measure
    );
    expect(plan.label.y).toBeGreaterThan(372);
    const last = plan.date ?? { y: plan.title.y + plan.title.height, size: 0 };
    expect(last.y + last.size).toBeLessThan(1392);
  });

  it("omits the date line when none was recorded", () => {
    expect(planLandscape(data("Ada", "Intro", null), measure).date).toBeNull();
  });

  it("refuses (rather than clips) text that cannot fit at a readable size", () => {
    const absurd = "word ".repeat(2000);
    expect(() => planLandscape(data("Ada", absurd), measure)).toThrow(CertificateTextOverflowError);
  });
});

describe("title length guard", () => {
  const data = { displayName: "Ada", courseTitle: "x", completionDateLabel: null };
  const measure = (_role: string, text: string, size: number) => ruler(text, size);

  it("refuses an absurdly long title immediately, in both formats", () => {
    const title = "a ".repeat(MAX_COURSE_TITLE_CHARS);
    const started = Date.now();
    expect(() => planLandscape({ ...data, courseTitle: title }, measure)).toThrow(CertificateTextOverflowError);
    expect(() => planStory({ ...data, courseTitle: title }, measure)).toThrow(CertificateTextOverflowError);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("still sets a long but realistic title (300 characters) in full", () => {
    const title = "Foundations of Applied Methods ".repeat(10).trim();
    expect(joined(planLandscape({ ...data, courseTitle: title }, measure).title.lines)).toBe(title);
  });
});

describe("planStory", () => {
  const data = (displayName: string, courseTitle: string, completionDateLabel: string | null = "Completed 9 October 2026") => ({
    displayName,
    courseTitle,
    completionDateLabel,
  });
  const measure = (_role: string, text: string, size: number) => ruler(text, size);

  it("keeps the mascot for typical content", () => {
    const plan = planStory(data("Alhaji Bangura", "Intro to Programming"), measure);
    expect(plan.mascot).not.toBeNull();
    expect(plan.card.x).toBe(80);
    expect(plan.card.w).toBe(920);
    expect(joined(plan.title.lines)).toBe("Intro to Programming");
  });

  it("lets decoration yield before text: long content drops the mascot but never the text", () => {
    const title = "Foundations of Applied Quantitative Methods and Statistical Reasoning for Public Health Agriculture Education ".repeat(2).trim();
    const name = "Mariama Fatmata Kamara-Sesay Johnson-Williams Bangura Conteh Turay";
    const plan = planStory(data(name, title), measure);
    expect(joined(plan.title.lines)).toBe(title);
    expect(joined(plan.name.lines)).toBe(name);
    // Inside the vertical safe area.
    expect(plan.card.y + plan.card.h).toBeLessThanOrEqual(1740);
    expect(plan.card.y).toBeGreaterThanOrEqual(180);
  });

  it("omits the date when there is none", () => {
    expect(planStory(data("Ada", "Intro", null), measure).date).toBeNull();
  });

  it("refuses text that cannot fit", () => {
    expect(() => planStory(data("Ada", "word ".repeat(3000)), measure)).toThrow(CertificateTextOverflowError);
  });
});
