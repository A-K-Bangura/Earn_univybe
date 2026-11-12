import { env } from "../config/env";

/** The three institution levels a student can ask support to add. */
export type MissingInstitutionKind = "university" | "faculty" | "department";

/** Longest name we put in a message — keeps the wa.me link comfortably short. */
export const MAX_INSTITUTION_NAME_LENGTH = 120;

/** E.164 allows 15 digits; the shortest real numbers are 7-8 with country code. */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/**
 * Reduce a configured number ("+232 76 123 456", "232-76-...") to the digits-only
 * form wa.me requires. Returns null when it doesn't look like a dialable
 * international number, so a typo in the env var shows "support unavailable"
 * instead of opening a link that goes nowhere.
 */
export const normalizeWhatsAppNumber = (
  raw: string | null | undefined
): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/[\s\-().+]/g, "");
  if (!/^[1-9]\d*$/.test(digits)) return null;
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return digits;
};

/** The configured support number, or null when unset/invalid. */
export const getSupportWhatsAppNumber = (): string | null =>
  normalizeWhatsAppNumber(env.SUPPORT_WHATSAPP_NUMBER);

/**
 * Student-typed text goes into a message body: flatten whitespace/newlines (so
 * it can't forge extra lines in the template) and cap the length.
 */
export const cleanInstitutionName = (value: string): string =>
  value.replace(/\s+/g, " ").trim().slice(0, MAX_INSTITUTION_NAME_LENGTH);

interface SupportMessageInput {
  kind: MissingInstitutionKind;
  /** What the student typed. */
  missingName: string;
  /** Selected parents, by display name. Required for faculty/department. */
  universityName?: string | null;
  facultyName?: string | null;
}

/** Which parent selections a request of this kind cannot be sent without. */
export const requiredParents = (
  kind: MissingInstitutionKind
): Array<"university" | "faculty"> => {
  if (kind === "faculty") return ["university"];
  if (kind === "department") return ["university", "faculty"];
  return [];
};

/**
 * The pre-filled WhatsApp text. Only institution names — never tokens,
 * passwords, OTPs, emails or ids — and the student reviews it before sending.
 * Returns null when a required parent or the name is missing.
 */
export const buildSupportMessage = ({
  kind,
  missingName,
  universityName,
  facultyName,
}: SupportMessageInput): string | null => {
  const name = cleanInstitutionName(missingName);
  if (!name) return null;

  const university = universityName ? cleanInstitutionName(universityName) : "";
  const faculty = facultyName ? cleanInstitutionName(facultyName) : "";
  const parents = requiredParents(kind);
  if (parents.includes("university") && !university) return null;
  if (parents.includes("faculty") && !faculty) return null;

  const lines = [
    `Hello UniVybe team. I'm completing my student onboarding, but I can't find my ${kind}.`,
    "",
  ];
  if (parents.includes("university")) lines.push(`University: ${university}`);
  if (parents.includes("faculty")) lines.push(`Faculty: ${faculty}`);
  lines.push(`Missing ${kind}: ${name}`);
  lines.push(
    "",
    "Please help me add it so I can complete my onboarding."
  );
  return lines.join("\n");
};

/** `https://wa.me/<digits>?text=<encoded>` — null when the number is unusable. */
export const buildWhatsAppUrl = (
  number: string | null | undefined,
  message: string
): string | null => {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};
