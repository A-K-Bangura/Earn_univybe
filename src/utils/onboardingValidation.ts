import type { OnboardingFormData } from "../types/onboarding";

// Field-level rules for each onboarding step, kept pure (no API, no React) so
// the page, the draft-restore clamp and the tests all agree. Whether the chosen
// university/faculty/department still exist in the live lists is a separate,
// async check done by the page (see pages/Onboarding.tsx).

export const LAST_ONBOARDING_STEP = 3;

/** Levels 100-500 belong to a university -> faculty -> department. */
export const isRegularLevel = (level: string): boolean =>
  ["100", "200", "300", "400", "500"].includes(level);

/** UnderGrad/graduate students optionally pick an organization instead. */
export const isSpecialLevel = (level: string): boolean =>
  ["UnderGrad", "graduate"].includes(level);

const PHONE_PATTERN = /^\+?[1-9]\d{1,14}$/;

/** The message blocking `step`, or null when its fields are fine. */
export const stepFieldMessage = (
  step: number,
  data: OnboardingFormData
): string | null => {
  if (step === 0) {
    if (!data.firstname.trim()) return "First name is required";
    if (!data.lastname.trim()) return "Last name is required";
    if (!data.phone.trim()) return "Phone number is required";
    if (!PHONE_PATTERN.test(data.phone.replace(/\s/g, ""))) {
      return "Please enter a valid phone number";
    }
  } else if (step === 1) {
    if (!data.level) return "Please select your level";
  } else if (step === 2) {
    if (isRegularLevel(data.level)) {
      if (!data.university_id) return "Please select a university";
      if (!data.faculty_id) return "Please select a faculty";
      if (!data.department_id) return "Please select a department";
      // Required by the backend for levels 100-500 (docs/STUDENT_API_PAYLOADS.md
      // "Complete Onboarding" request fields) even though the form used to
      // label it "(optional)" — omitting it was a silent 422 at final submit.
      if (!data.student_id || !data.student_id.trim()) {
        return "Please enter your student ID";
      }
    } else if (!isSpecialLevel(data.level)) {
      return "Please select your level";
    }
    // UnderGrad/graduate: organization is optional.
  } else if (step === 3) {
    if (!data.password || data.password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (data.password !== data.password_confirmation) {
      return "Passwords do not match";
    }
  }
  return null;
};

/**
 * Furthest step a (restored) draft may open on: the first earlier step whose
 * fields are incomplete, else `wanted`. The password step is never "complete"
 * from a draft — passwords aren't stored — so it never blocks reaching it.
 */
export const reachableStep = (
  wanted: number,
  data: OnboardingFormData
): number => {
  const target = Math.min(Math.max(wanted, 0), LAST_ONBOARDING_STEP);
  for (let step = 0; step < target; step += 1) {
    if (stepFieldMessage(step, data) !== null) return step;
  }
  return target;
};
