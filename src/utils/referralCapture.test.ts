import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearReferralCapture,
  getStoredReferralCapture,
  storeReferralCapture,
} from "./referralCapture";

const DAY_MS = 1000 * 60 * 60 * 24;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("referral capture storage", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredReferralCapture()).toBeNull();
  });

  it("stores and reads back a captured code", () => {
    storeReferralCapture("ABA2026");

    const stored = getStoredReferralCapture();
    expect(stored?.code).toBe("ABA2026");
  });

  it("replaces a previously stored capture — last valid link wins", () => {
    storeReferralCapture("FIRST");
    storeReferralCapture("SECOND");

    expect(getStoredReferralCapture()?.code).toBe("SECOND");
  });

  it("treats a capture older than the attribution window as absent, and deletes it", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    storeReferralCapture("ABA2026");

    vi.spyOn(Date, "now").mockReturnValue(now + 31 * DAY_MS);
    expect(getStoredReferralCapture(30)).toBeNull();

    // And it's actually gone, not just reported as absent this one time.
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(getStoredReferralCapture(30)).toBeNull();
  });

  it("keeps a capture that is exactly within the window", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    storeReferralCapture("ABA2026");

    vi.spyOn(Date, "now").mockReturnValue(now + 29 * DAY_MS);
    expect(getStoredReferralCapture(30)?.code).toBe("ABA2026");
  });

  it("drops a malformed stored value instead of throwing", () => {
    localStorage.setItem("referral_capture", "not json");
    expect(getStoredReferralCapture()).toBeNull();
    expect(localStorage.getItem("referral_capture")).toBeNull();
  });

  it("clears a stored capture", () => {
    storeReferralCapture("ABA2026");
    clearReferralCapture();
    expect(getStoredReferralCapture()).toBeNull();
  });
});
