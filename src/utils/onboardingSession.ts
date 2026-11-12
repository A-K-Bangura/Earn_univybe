import type { User } from "../types";

// Reads of the stored session that don't need the API layer, so the route
// guard, the auth hook and the onboarding page agree on one definition of
// "which account is this" and "has it finished onboarding".

const readUser = (key: "user" | "pending_user"): User | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

/**
 * Whether an account has finished onboarding. The API has no `is_onboarded`
 * flag (docs/STUDENT_API_PAYLOADS.md); `level` is only ever set by Complete
 * Onboarding, so names + level together are the reliable signal for both
 * university- and organization-affiliated students.
 */
export const isOnboardingComplete = (
  user: Pick<User, "firstname" | "lastname" | "level"> | null | undefined
): boolean => !!(user?.firstname && user?.lastname && user?.level);

/** A verified-but-not-onboarded session holds its token under `pending_auth_token`. */
export const hasPendingOnboardingSession = (): boolean =>
  !!localStorage.getItem("pending_auth_token");

/**
 * The user of the session requests are actually made as. The axios interceptor
 * prefers the pending token, so this prefers the pending user too.
 */
export const getActiveSessionUser = (): User | null =>
  hasPendingOnboardingSession() ? readUser("pending_user") : readUser("user");

/** Id used to scope the onboarding draft to one account; null when signed out. */
export const getOnboardingAccountId = (): string | null => {
  const id = getActiveSessionUser()?.id;
  return id === undefined || id === null || id === "" ? null : String(id);
};
