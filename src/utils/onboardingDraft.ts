import type {
  AcademicLevel,
  OnboardingDraftFields,
  OnboardingFormData,
} from "../types/onboarding";
import { LAST_ONBOARDING_STEP } from "./onboardingValidation";

// On-device draft for an interrupted onboarding, so a student who closes the
// tab, refreshes, or goes off to WhatsApp lands back on the same step with the
// same answers. Rules (see docs/DECISIONS.md, 2026-10-26):
//  - scoped to ONE account (the user id of the session) — never shared;
//  - versioned, so a future field change can't mis-restore an old shape;
//  - whitelisted fields only — never the password pair, OTPs or tokens;
//  - advisory: the server's profile and the live institution lists win.

export const ONBOARDING_DRAFT_VERSION = 1;
const KEY_PREFIX = "onboarding_draft:";
/** Pre-versioned key: unscoped and (bug) included the password. Purged on sight. */
const LEGACY_KEY = "onboarding_draft";

const LEVELS: AcademicLevel[] = [
  "UnderGrad",
  "100",
  "200",
  "300",
  "400",
  "500",
  "graduate",
];

interface StoredDraft {
  version: number;
  accountId: string;
  step: number;
  savedAt: number;
  fields: OnboardingDraftFields;
}

export interface RestoredDraft {
  step: number;
  fields: OnboardingDraftFields;
}

const keyFor = (accountId: string) => `${KEY_PREFIX}${accountId}`;

const asString = (value: unknown, max = 200): string =>
  typeof value === "string" ? value.slice(0, max) : "";

const asId = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;

/** Pull exactly the whitelisted fields out of anything, with safe types. */
const pickFields = (source: Partial<OnboardingFormData>): OnboardingDraftFields => ({
  firstname: asString(source.firstname),
  lastname: asString(source.lastname),
  phone: asString(source.phone, 32),
  level: LEVELS.includes(source.level as AcademicLevel)
    ? (source.level as AcademicLevel)
    : "",
  university_id: asId(source.university_id),
  faculty_id: asId(source.faculty_id),
  department_id: asId(source.department_id),
  organization_id: asId(source.organization_id),
  student_id: asString(source.student_id, 64),
});

/** Remove the old unscoped draft (it may contain a plaintext password). */
export const clearLegacyOnboardingDraft = (): void => {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
};

const isBlank = (fields: OnboardingDraftFields): boolean =>
  !fields.firstname &&
  !fields.lastname &&
  !fields.phone &&
  !fields.level &&
  !fields.university_id &&
  !fields.faculty_id &&
  !fields.department_id &&
  !fields.organization_id &&
  !fields.student_id;

export const saveOnboardingDraft = (
  accountId: string | null,
  step: number,
  data: Partial<OnboardingFormData>
): void => {
  if (!accountId) return;
  const fields = pickFields(data);
  // Nothing worth resuming (untouched form): do not leave a stub behind, and
  // drop any older draft the student has since cleared out.
  if (step <= 0 && isBlank(fields)) {
    clearOnboardingDraft(accountId);
    return;
  }
  const draft: StoredDraft = {
    version: ONBOARDING_DRAFT_VERSION,
    accountId,
    step: Math.min(Math.max(Math.trunc(step) || 0, 0), LAST_ONBOARDING_STEP),
    savedAt: Date.now(),
    fields,
  };
  try {
    localStorage.setItem(keyFor(accountId), JSON.stringify(draft));
  } catch {
    /* quota / private mode — the form still works, it just can't resume */
  }
};

/**
 * The saved draft for this account, or null if there is none, it belongs to
 * someone else, is from another version, or is corrupt.
 */
export const loadOnboardingDraft = (
  accountId: string | null
): RestoredDraft | null => {
  clearLegacyOnboardingDraft();
  if (!accountId) return null;
  try {
    const raw = localStorage.getItem(keyFor(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft> | null;
    if (
      !parsed ||
      parsed.version !== ONBOARDING_DRAFT_VERSION ||
      parsed.accountId !== accountId ||
      !parsed.fields
    ) {
      return null;
    }
    return {
      step: Math.min(Math.max(Math.trunc(Number(parsed.step)) || 0, 0), LAST_ONBOARDING_STEP),
      fields: pickFields(parsed.fields),
    };
  } catch {
    return null;
  }
};

export const clearOnboardingDraft = (accountId: string | null): void => {
  clearLegacyOnboardingDraft();
  if (!accountId) return;
  try {
    localStorage.removeItem(keyFor(accountId));
  } catch {
    /* ignore */
  }
};

/** Explicit sign-out on a shared device: forget every account's draft. */
export const clearAllOnboardingDrafts = (): void => {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key === LEGACY_KEY || key.startsWith(KEY_PREFIX))) {
        stale.push(key);
      }
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
};
