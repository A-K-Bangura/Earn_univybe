import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AmbassadorProfile, ReferralHistoryItem } from "../../types/referral";
import type { PageMeta } from "../../types";

vi.mock("qrcode", () => ({ toDataURL: vi.fn() }));
vi.mock("../../services/referrals", () => ({
  getAmbassadorReferrals: vi.fn(),
}));

import { toDataURL } from "qrcode";
import { getAmbassadorReferrals } from "../../services/referrals";
import { AmbassadorProfileSection } from "./AmbassadorProfileSection";

// The real `toDataURL` has callback-based overloads TS would otherwise try
// (and fail) to match against `mockResolvedValue`'s string return.
const mockToDataURL = toDataURL as unknown as ReturnType<typeof vi.fn>;

const ambassador = (overrides: Partial<AmbassadorProfile> = {}): AmbassadorProfile => ({
  status: "active",
  accepting_referrals: true,
  code: "ABA2026",
  referral_link: "https://univybesl.com/?ref=ABA2026",
  appointed_at: "2026-11-17T23:28:26+00:00",
  stats: {
    verified_registrations: 2,
    completed_onboardings: 1,
    activated_learners: 1,
    onboarding_conversion_rate: 50,
    learning_activation_rate: 50,
  },
  ...overrides,
});

const meta = (overrides: Partial<PageMeta> = {}): PageMeta => ({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 1,
  from: 1,
  to: 1,
  ...overrides,
});

const historyItem = (overrides: Partial<ReferralHistoryItem> = {}): ReferralHistoryItem => ({
  id: "r-1",
  referred_at: "2026-11-17T23:28:26+00:00",
  first_name: "Fatmata",
  university: { id: 1, name: "Fourah Bay College" },
  onboarding_completed: true,
  learning_activated: true,
  ...overrides,
});

const renderSection = (profile = ambassador()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AmbassadorProfileSection ambassador={profile} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mockToDataURL.mockReset().mockResolvedValue("data:image/png;base64,abc");
  vi.mocked(getAmbassadorReferrals)
    .mockReset()
    .mockResolvedValue({ data: [historyItem()], meta: meta() });
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("AmbassadorProfileSection", () => {
  it("shows the code, link, stats and rates", async () => {
    renderSection();

    expect(screen.getByText("ABA2026")).toBeInTheDocument();
    expect(screen.getByText("https://univybesl.com/?ref=ABA2026")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // verified
    expect(screen.getAllByText("50%")).toHaveLength(2);
    await screen.findByAltText("QR code for your referral link");
  });

  it("shows a dash for rates that are still null", () => {
    renderSection(
      ambassador({
        stats: {
          verified_registrations: 0,
          completed_onboardings: 0,
          activated_learners: 0,
          onboarding_conversion_rate: null,
          learning_activation_rate: null,
        },
      })
    );

    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("copies the code to the clipboard", async () => {
    renderSection();

    fireEvent.click(screen.getAllByRole("button", { name: /copy/i })[0]);

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABA2026")
    );
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("hides share and QR, and shows a paused note, when accepting_referrals is false", async () => {
    renderSection(ambassador({ accepting_referrals: false }));

    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(
      screen.getByText(/isn't accepting new referrals right now/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
    expect(mockToDataURL).not.toHaveBeenCalled();
    // The code itself is still visible.
    expect(screen.getByText("ABA2026")).toBeInTheDocument();
  });

  it("shows 'New student' for a referral row with no first_name yet", async () => {
    vi.mocked(getAmbassadorReferrals).mockResolvedValue({
      data: [historyItem({ first_name: null, university: null })],
      meta: meta(),
    });
    renderSection();

    expect(await screen.findByText("New student")).toBeInTheDocument();
  });

  it("paginates the history", async () => {
    vi.mocked(getAmbassadorReferrals).mockImplementation(async (page = 1) => ({
      data: [historyItem({ id: `r-${page}` })],
      meta: meta({ current_page: page, last_page: 2, total: 2 }),
    }));
    const user = userEvent.setup();
    renderSection();

    await screen.findByText("1 / 2");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(getAmbassadorReferrals).toHaveBeenCalledWith(2, 15));
    await screen.findByText("2 / 2");
  });

  it("shows a retry option when the history fails to load", async () => {
    vi.mocked(getAmbassadorReferrals).mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderSection();

    expect(
      await screen.findByText("Couldn't load your referral history.")
    ).toBeInTheDocument();

    vi.mocked(getAmbassadorReferrals).mockResolvedValue({
      data: [historyItem()],
      meta: meta(),
    });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Fatmata")).toBeInTheDocument();
  });

  it("shows an empty state when there are no referrals yet", async () => {
    vi.mocked(getAmbassadorReferrals).mockResolvedValue({ data: [], meta: meta({ total: 0 }) });
    renderSection();

    expect(
      await screen.findByText("No referrals yet — share your link to get started.")
    ).toBeInTheDocument();
  });
});
