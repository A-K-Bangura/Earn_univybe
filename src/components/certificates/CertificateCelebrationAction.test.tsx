import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../services/certificates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/certificates")>()),
  getCertificateEligibility: vi.fn(),
}));

import { CertificateCelebrationAction } from "./CertificateCelebrationAction";
import { getCertificateEligibility } from "../../services/certificates";

const eligibility = vi.mocked(getCertificateEligibility);

const renderAction = (expectedComplete = true) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CertificateCelebrationAction courseId="course-uuid" expectedComplete={expectedComplete} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("auth_token", "t");
  localStorage.setItem("user", JSON.stringify({ id: "acct-1", email: "s@x.com" }));
  eligibility.mockReset();
});

describe("CertificateCelebrationAction", () => {
  it("shows a preparing state until the server confirms completion, then 'View certificate'", async () => {
    let confirm!: (v: { state: "complete"; courseTitle: string; completedAt: string }) => void;
    eligibility.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      })
    );
    renderAction();
    expect(screen.getByText(/preparing your certificate/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view certificate/i })).not.toBeInTheDocument();

    confirm({ state: "complete", courseTitle: "Intro", completedAt: "2026-10-09T10:00:00Z" });
    const link = await screen.findByRole("link", { name: /view certificate/i });
    expect(link).toHaveAttribute("href", "/profile/certificates/course-uuid");
  });

  it("verifies the course against the server rather than trusting the celebration's own data", async () => {
    eligibility.mockResolvedValue({ state: "complete", courseTitle: "Intro", completedAt: null });
    renderAction();
    await screen.findByRole("link", { name: /view certificate/i });
    expect(eligibility).toHaveBeenCalledWith("course-uuid");
  });

  it("appears for a completion with no coins at all (free course): coins are never consulted", async () => {
    eligibility.mockResolvedValue({ state: "complete", courseTitle: "Free course", completedAt: "2026-10-09T10:00:00Z" });
    renderAction();
    expect(await screen.findByRole("link", { name: /view certificate/i })).toBeInTheDocument();
  });

  it("stays quiet when the course simply isn't complete and no completion was expected", async () => {
    eligibility.mockResolvedValue({ state: "incomplete", courseTitle: "Intro", completedAt: null });
    const { container } = renderAction(false);
    await vi.waitFor(() => expect(eligibility).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("link", { name: /view certificate/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("offers Retry when the server can't confirm a completion that was reported", async () => {
    eligibility.mockResolvedValueOnce({ state: "incomplete", courseTitle: "Intro", completedAt: null });
    renderAction(true);
    expect(await screen.findByText(/couldn't confirm your certificate/i)).toBeInTheDocument();

    eligibility.mockResolvedValue({ state: "complete", courseTitle: "Intro", completedAt: "2026-10-09T10:00:00Z" });
    await userEvent.click(screen.getByRole("button", { name: /retry certificate/i }));
    expect(await screen.findByRole("link", { name: /view certificate/i })).toBeInTheDocument();
  });

  it("offers Retry when verification fails with a network error", async () => {
    // The query retries once on its own; fail both attempts so Retry is offered.
    eligibility.mockRejectedValue(new Error("offline"));
    renderAction(false);
    expect(
      await screen.findByRole("button", { name: /retry certificate/i }, { timeout: 4000 })
    ).toBeInTheDocument();
  });

  it("renders nothing for a signed-out visitor", () => {
    localStorage.clear();
    const { container } = renderAction();
    expect(container).toBeEmptyDOMElement();
    expect(eligibility).not.toHaveBeenCalled();
  });
});
