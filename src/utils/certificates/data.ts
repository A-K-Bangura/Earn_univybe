import {
  CERTIFICATE_TEMPLATE_VERSION,
  type CertificateData,
  type CertificateFormat,
  type CompletionState,
} from "../../types/certificate";

/** Frontend layout limit for the printed name (code points, not UTF-16 units). */
export const MAX_DISPLAY_NAME_LENGTH = 120;

/** The completion day must not shift with the device's timezone. */
export const CERTIFICATE_TIME_ZONE = "Africa/Freetown";

// Line/paragraph separators, bidi embedding/override/isolate controls: these
// can reorder or break printed text, so they are rejected like control chars.
const UNSAFE_NAME_CHARS = /[\p{Cc}\u2028\u2029\u202A-\u202E\u2066-\u2069]/u;
const HAS_VISIBLE_CHAR = /[^\s\p{Cf}]/u;

const countCodePoints = (value: string): number => Array.from(value).length;

/** Trim and collapse runs of whitespace. Preserves Unicode, diacritics and emoji. */
export const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/gu, " ").trim();

interface NameSource {
  full_name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
}

/**
 * The student's name for a certificate: a non-empty `full_name`, else the
 * joined non-empty first/last names, else "" (the page then asks for one).
 * Control characters coming from the profile are replaced, not rejected.
 */
export const pickProfileName = (source: NameSource | null | undefined): string => {
  if (!source) return "";
  const clean = (value: string | null | undefined) =>
    collapseWhitespace((value ?? "").replace(UNSAFE_NAME_CHARS, " "));

  const full = clean(source.full_name);
  if (full) return full;
  return [clean(source.firstname), clean(source.lastname)]
    .filter(Boolean)
    .join(" ");
};

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; reason: "blank" | "too-long" | "unsafe" };

/** Validates the "Name on certificate" field. Accepts any script; rejects only layout-breaking input. */
export const validateDisplayName = (raw: string): NameCheck => {
  const trimmed = raw.trim();
  if (UNSAFE_NAME_CHARS.test(trimmed)) return { ok: false, reason: "unsafe" };
  const name = collapseWhitespace(trimmed).normalize("NFC");
  if (!name || !HAS_VISIBLE_CHAR.test(name)) return { ok: false, reason: "blank" };
  if (countCodePoints(name) > MAX_DISPLAY_NAME_LENGTH) {
    return { ok: false, reason: "too-long" };
  }
  return { ok: true, name };
};

export const nameErrorMessage = (reason: Exclude<NameCheck, { ok: true }>["reason"]) => {
  switch (reason) {
    case "blank":
      return "Enter the name you'd like on your certificate.";
    case "too-long":
      return `Use ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`;
    case "unsafe":
      return "Remove line breaks or special control characters from the name.";
  }
};

const parseTimestamp = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "9 October 2026" in Africa/Freetown, or null when `completedAt` isn't a usable date. */
export const formatCompletionDate = (completedAt: string | null | undefined): string | null => {
  const date = parseTimestamp(completedAt);
  if (!date) return null;
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  try {
    return new Intl.DateTimeFormat("en-GB", {
      ...options,
      timeZone: CERTIFICATE_TIME_ZONE,
    }).format(date);
  } catch {
    // Freetown is UTC+0 all year, so UTC gives the same calendar day.
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
  }
};

export const completionDateLabel = (completedAt: string | null | undefined): string | null => {
  const formatted = formatCompletionDate(completedAt);
  return formatted ? `Completed ${formatted}` : null;
};

/** Returns `completedAt` only when it parses; an unusable value is dropped, never replaced with today. */
export const usableCompletedAt = (value: unknown): string | null =>
  parseTimestamp(value) ? (value as string) : null;

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return undefined;
};

/**
 * Eligibility comes from the server's own completion record — never from a
 * progress percentage, XP, coins or a route/query flag.
 *
 * `is_completed` is serialized from `completed_at` (docs/STUDENT_API_PAYLOADS.md
 * §13), so a present `completed_at` alone is enough when the flag is absent.
 * A record whose flag says "not completed" while carrying a date contradicts
 * itself and is reported as a mismatch, never minted.
 */
export const evaluateCompletion = (record: {
  is_completed?: unknown;
  completed_at?: unknown;
}): CompletionState => {
  const flag = toBoolean(record.is_completed);
  const hasDate =
    typeof record.completed_at === "string" && record.completed_at.trim() !== "";
  if (flag === true) return "complete";
  if (flag === false) return hasDate ? "mismatch" : "incomplete";
  return hasDate ? "complete" : "incomplete";
};

export interface NormalizeInput {
  studentId: string | number;
  courseId: string | number;
  courseTitle: string | null | undefined;
  profileName: string;
  /** Already-validated corrected name; omitted/blank means "use the profile name". */
  displayName?: string | null;
  completedAt?: string | null;
}

/**
 * Builds the shared renderer input, or null when a required value is missing
 * (no course title, or no name to print). Callers must not export on null.
 */
export const normalizeCertificateData = (input: NormalizeInput): CertificateData | null => {
  const courseTitle = collapseWhitespace((input.courseTitle ?? "").replace(UNSAFE_NAME_CHARS, " "));
  if (!courseTitle) return null;

  const nameCheck = validateDisplayName(input.displayName?.trim() ? input.displayName : input.profileName);
  if (!nameCheck.ok) return null;

  const completedAt = usableCompletedAt(input.completedAt);
  return {
    studentId: String(input.studentId),
    courseId: String(input.courseId),
    courseTitle,
    profileName: input.profileName,
    displayName: nameCheck.name,
    completedAt,
    completionDateLabel: completionDateLabel(completedAt),
    templateVersion: CERTIFICATE_TEMPLATE_VERSION,
  };
};

const FILENAME_COURSE_MAX = 60;

/**
 * `UniVybe_Intro-to-Programming_Certificate.png` / `_Story.png` / `.pdf`.
 * Filesystem-safe and length-limited; contains only the course title, never
 * the student's name or any ID.
 */
export const certificateFilename = (
  courseTitle: string,
  format: CertificateFormat,
  extension: "png" | "pdf"
): string => {
  const slug = courseTitle
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, FILENAME_COURSE_MAX)
    .replace(/-+$/g, "");
  const course = slug || "Course";
  const suffix = format === "story" ? "Story" : "Certificate";
  return `UniVybe_${course}_${suffix}.${extension}`;
};

export const certificateCaption = (courseTitle: string): string =>
  `I completed ${courseTitle} on UniVybe! A new vibe for learning.`;

export const FORMAT_LABELS: Record<CertificateFormat, string> = {
  landscape: "Certificate",
  story: "Story card",
};

/** Alt text for the preview image: course, student name and date. */
export const certificateAltText = (data: CertificateData, format: CertificateFormat): string => {
  const kind = format === "story" ? "Story card" : "Certificate of completion";
  const date = data.completionDateLabel
    ? ` on ${data.completionDateLabel.replace(/^Completed /, "")}`
    : "";
  return `${kind}: ${data.displayName} completed ${data.courseTitle}${date}.`;
};
