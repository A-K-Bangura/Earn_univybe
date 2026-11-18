// The backend cannot see an anonymous `?ref=` visit — remembering it until
// sign-up is frontend work (docs/REFERRAL_AMBASSADOR_API.md "Frontend
// integration checklist" A). Stored client-side only; never synced anywhere
// until the student actually signs up.

const STORAGE_KEY = "referral_capture";
const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;

export interface StoredReferralCapture {
  code: string;
  /** Epoch ms, so age can be computed without re-parsing a date string. */
  captured_at: number;
}

/** Returns the stored capture, or `null` if there is none or it's past the attribution window (and deletes it in that case). */
export const getStoredReferralCapture = (
  windowDays: number = DEFAULT_ATTRIBUTION_WINDOW_DAYS
): StoredReferralCapture | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredReferralCapture>;
    if (!parsed.code || typeof parsed.captured_at !== "number") {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const ageDays = (Date.now() - parsed.captured_at) / (1000 * 60 * 60 * 24);
    if (ageDays > windowDays) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return { code: parsed.code, captured_at: parsed.captured_at };
  } catch {
    // Unparsable JSON — not a capture worth keeping around.
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

/** Replaces any previously stored capture — "last valid link wins". */
export const storeReferralCapture = (code: string): void => {
  try {
    const entry: StoredReferralCapture = { code, captured_at: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable (private mode, quota) — nothing to attribute, but
    // sign-up must still work without a referral.
  }
};

export const clearReferralCapture = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — see above.
  }
};
