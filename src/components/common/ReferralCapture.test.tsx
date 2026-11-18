import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../services/referrals", () => ({
  validateReferralCode: vi.fn(),
}));

import { validateReferralCode } from "../../services/referrals";
import { getStoredReferralCapture } from "../../utils/referralCapture";
import { ReferralCapture } from "./ReferralCapture";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ReferralCapture />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  vi.mocked(validateReferralCode).mockReset();
});

describe("ReferralCapture", () => {
  it("does nothing on a direct visit with no ?ref=", () => {
    renderAt("/");

    expect(validateReferralCode).not.toHaveBeenCalled();
    expect(getStoredReferralCapture()).toBeNull();
  });

  it("stores the canonical code from a valid ?ref= link", async () => {
    vi.mocked(validateReferralCode).mockResolvedValue({
      valid: true,
      code: "ABA2026",
      attribution_window_days: 30,
    });

    renderAt("/?ref=aba2026");

    await waitFor(() => expect(validateReferralCode).toHaveBeenCalledWith("aba2026"));
    await waitFor(() =>
      expect(getStoredReferralCapture()?.code).toBe("ABA2026")
    );
  });

  it("ignores an invalid code and keeps whatever was already stored", async () => {
    localStorage.setItem(
      "referral_capture",
      JSON.stringify({ code: "OLDCODE", captured_at: Date.now() })
    );
    vi.mocked(validateReferralCode).mockResolvedValue({
      valid: false,
      code: null,
      attribution_window_days: 30,
    });

    renderAt("/?ref=bogus");

    await waitFor(() => expect(validateReferralCode).toHaveBeenCalled());
    expect(getStoredReferralCapture()?.code).toBe("OLDCODE");
  });

  it("leaves storage untouched when the validation call itself fails", async () => {
    vi.mocked(validateReferralCode).mockRejectedValue(new Error("network"));

    renderAt("/?ref=aba2026");

    await waitFor(() => expect(validateReferralCode).toHaveBeenCalled());
    expect(getStoredReferralCapture()).toBeNull();
  });
});
