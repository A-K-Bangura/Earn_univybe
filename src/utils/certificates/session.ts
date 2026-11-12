import { certificateArtifacts } from "./artifactCache";

/**
 * Ties certificate data to the signed-in account.
 *
 * The app keeps its signed-in `user` in localStorage (services/auth.ts). A
 * certificate carries a student's name, so every cache, query key and artifact
 * is scoped to that account id, and anything personal is dropped the moment the
 * session goes away or changes hands.
 */

const SESSION_EVENT = "univybe:certificate-session";

/** The signed-in (fully onboarded) account id, or null when signed out. */
export const getCertificateAccountScope = (): string | null => {
  try {
    if (!localStorage.getItem("auth_token")) return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string | number } | null;
    return user?.id !== undefined && user.id !== null ? String(user.id) : null;
  } catch {
    return null;
  }
};

/** Called on logout, an expired session, or a different account signing in. */
export const clearCertificateSession = (): void => {
  certificateArtifacts.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
};

/** Subscribe to account changes: this tab's sign-out/in (event) and other tabs' (storage). */
export const subscribeCertificateAccount = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === "auth_token" || event.key === "user") listener();
  };
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
};
