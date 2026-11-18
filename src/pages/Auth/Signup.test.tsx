import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => false),
  login: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../../services/auth", () => mocks);

vi.mock("../../services/referrals", () => ({
  validateReferralCode: vi.fn(),
}));

import { validateReferralCode } from "../../services/referrals";
import { storeReferralCapture } from "../../utils/referralCapture";
import { Signup } from "./Signup";

const renderSignup = () => {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const okReferral = { message: "OTP sent successfully", expiry_minutes: 10, referral: { status: "none", code: null } };

beforeEach(() => {
  localStorage.clear();
  vi.mocked(mocks.sendOtp).mockReset().mockResolvedValue(okReferral);
  vi.mocked(validateReferralCode).mockReset();
});

const fillEmailAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText("student@example.com"), "student@example.com");
  await user.click(screen.getByRole("button", { name: "Sign Up" }));
};

// React Query's mutationFn is invoked with a second, internal context
// argument alongside the real variables — assert on just the variables.
const sentParams = () => mocks.sendOtp.mock.calls.at(-1)?.[0];

describe("Signup — referral code (Round 15)", () => {
  it("sends neither referral field when the student has no code at all", async () => {
    const user = userEvent.setup();
    renderSignup();

    await fillEmailAndSubmit(user);

    await waitFor(() =>
      expect(sentParams()).toEqual({ email: "student@example.com" })
    );
  });

  it("starts the referral field collapsed, revealed by 'Have a referral code?'", async () => {
    const user = userEvent.setup();
    renderSignup();

    expect(screen.queryByPlaceholderText("e.g. ABA2026")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Have a referral code?" }));
    expect(screen.getByPlaceholderText("e.g. ABA2026")).toBeInTheDocument();
  });

  it("sends a stored, unedited capture together with its captured time", async () => {
    const capturedAt = Date.now() - 1000;
    vi.spyOn(Date, "now").mockReturnValue(capturedAt);
    storeReferralCapture("ABA2026");
    vi.mocked(Date.now).mockRestore();

    const user = userEvent.setup();
    renderSignup();

    // Pre-filled and already open, since a capture exists.
    expect(screen.getByDisplayValue("ABA2026")).toBeInTheDocument();

    await fillEmailAndSubmit(user);

    await waitFor(() =>
      expect(sentParams()).toEqual({
        email: "student@example.com",
        referral_code: "ABA2026",
        referral_captured_at: new Date(capturedAt).toISOString(),
      })
    );
  });

  it("treats a typed/edited code as explicit — sent alone, with no captured time", async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByRole("button", { name: "Have a referral code?" }));
    await user.type(screen.getByPlaceholderText("e.g. ABA2026"), "TYPED1");
    await fillEmailAndSubmit(user);

    await waitFor(() =>
      expect(sentParams()).toEqual({
        email: "student@example.com",
        referral_code: "TYPED1",
      })
    );
  });

  it("edits over a stored capture, overriding what gets sent", async () => {
    storeReferralCapture("STORED1");
    const user = userEvent.setup();
    renderSignup();

    const input = screen.getByDisplayValue("STORED1");
    await user.clear(input);
    await user.type(input, "OVERRIDE");
    await fillEmailAndSubmit(user);

    await waitFor(() =>
      expect(sentParams()).toEqual({
        email: "student@example.com",
        referral_code: "OVERRIDE",
      })
    );
  });

  it("shows live feedback for a code the student types, without blocking sign-up", async () => {
    vi.mocked(validateReferralCode).mockResolvedValue({
      valid: true,
      code: "ABA2026",
      attribution_window_days: 30,
    });
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByRole("button", { name: "Have a referral code?" }));
    await user.type(screen.getByPlaceholderText("e.g. ABA2026"), "aba2026");

    expect(
      await screen.findByText(/Code applied/, {}, { timeout: 2000 })
    ).toBeInTheDocument();
  });

  it("shows an invalid-code message but still lets sign-up continue", async () => {
    vi.mocked(validateReferralCode).mockResolvedValue({
      valid: false,
      code: null,
      attribution_window_days: 30,
    });
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByRole("button", { name: "Have a referral code?" }));
    await user.type(screen.getByPlaceholderText("e.g. ABA2026"), "bogus");

    expect(
      await screen.findByText("This referral code is not valid.", {}, { timeout: 2000 })
    ).toBeInTheDocument();

    await fillEmailAndSubmit(user);
    await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalled());
  });
});
