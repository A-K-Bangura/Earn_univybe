import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../services/profile", () => ({ getUserProfile: vi.fn(), updateProfile: vi.fn() }));
vi.mock("../services/certificates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/certificates")>()),
  getCertificateEligibility: vi.fn(),
}));
vi.mock("../utils/certificates/render", () => ({
  FORMAT_SIZES: { landscape: { width: 2400, height: 1697 }, story: { width: 1080, height: 1920 } },
  renderCertificateBlob: vi.fn(
    async (data: { displayName: string }, format: string) =>
      new Blob([`png:${format}:${data.displayName}`], { type: "image/png" })
  ),
  renderCertificatePdfBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
}));

import { CertificatePreviewPage } from "./CertificatePreviewPage";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { getUserProfile, updateProfile } from "../services/profile";
import {
  CertificateMismatchError,
  CertificateUnavailableError,
  getCertificateEligibility,
} from "../services/certificates";
import { renderCertificateBlob, renderCertificatePdfBlob } from "../utils/certificates/render";
import { certificateArtifacts } from "../utils/certificates/artifactCache";
import { clearCertificateSession } from "../utils/certificates/session";

const eligibility = vi.mocked(getCertificateEligibility);
const profileApi = vi.mocked(getUserProfile);
const renderPng = vi.mocked(renderCertificateBlob);
const renderPdf = vi.mocked(renderCertificatePdfBlob);

const sessionUser = (id: string) => ({
  id,
  email: "s@x.com",
  firstname: "Ada",
  lastname: "Lovelace",
  level: "200",
});

const signIn = (id = "acct-1") => {
  localStorage.setItem("auth_token", "token");
  localStorage.setItem("user", JSON.stringify(sessionUser(id)));
};

const completed = (over: Partial<{ courseTitle: string | null; completedAt: string | null }> = {}) => ({
  state: "complete" as const,
  courseTitle: "Intro to Programming",
  completedAt: "2026-10-09T14:30:00Z",
  ...over,
});

const baseProfile = { id: "student-uuid-1", email: "s@x.com", full_name: "Ada Lovelace" };

const created: string[] = [];
const revoked: string[] = [];
let anchorClicks: Array<{ download: string; href: string }> = [];

const renderPage = (path = "/profile/certificates/course-1") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/profile/certificates/:courseId"
            element={
              <ProtectedRoute requireOnboarding>
                <CertificatePreviewPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/certificates" element={<p>Collection page</p>} />
          <Route path="/auth/login" element={<p>Login page</p>} />
          <Route path="/onboarding" element={<p>Onboarding page</p>} />
          <Route path="/course/:courseId" element={<p>Course page</p>} />
          <Route path="/courses/enrolled" element={<p>My courses page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const setNavigator = (props: Record<string, unknown>) => {
  for (const key of ["share", "canShare", "clipboard"]) {
    Object.defineProperty(navigator, key, { value: undefined, configurable: true, writable: true });
  }
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
};

const readyImage = async () => screen.findByRole("img", { name: /Certificate of completion/i });

beforeEach(() => {
  localStorage.clear();
  created.length = 0;
  revoked.length = 0;
  anchorClicks = [];
  let n = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:cert/${++n}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    anchorClicks.push({ download: this.download, href: this.href });
  });
  setNavigator({});
  signIn();
  eligibility.mockReset().mockResolvedValue(completed());
  profileApi.mockReset().mockResolvedValue(baseProfile as never);
  renderPng.mockClear();
  renderPdf.mockClear();
});

afterEach(() => {
  certificateArtifacts.clear();
  vi.restoreAllMocks();
});

describe("eligibility gate (direct route)", () => {
  it("sends a signed-out visitor to login without reading any course data", () => {
    localStorage.clear();
    renderPage();
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(eligibility).not.toHaveBeenCalled();
  });

  it("sends a not-yet-onboarded student back to onboarding", () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("user", JSON.stringify({ id: "x", email: "x@x.com", firstname: null, lastname: null, level: null }));
    renderPage();
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("verifies completion on the server for the route's course before showing anything", async () => {
    renderPage("/profile/certificates/free-course-uuid");
    expect(await readyImage()).toBeInTheDocument();
    expect(eligibility).toHaveBeenCalledWith("free-course-uuid");
  });

  it("offers a certificate for a completed paid course exactly like a free one (no coins involved)", async () => {
    // The response carries nothing about price or coins: completion alone decides.
    eligibility.mockResolvedValue(completed({ courseTitle: "Paid: Advanced Excel" }));
    renderPage("/profile/certificates/paid-course-uuid");
    expect(await readyImage()).toHaveAccessibleName(/Advanced Excel/);
    expect(screen.getByRole("button", { name: /download image/i })).toBeEnabled();
  });

  it("rejects an incomplete course: explains, links back, and offers no export", async () => {
    eligibility.mockResolvedValue({ state: "incomplete", courseTitle: "Intro", completedAt: null });
    renderPage();
    expect(await screen.findByText(/available once you complete a course/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download|share/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(renderPng).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("link", { name: /back to the course/i }));
    expect(screen.getByText("Course page")).toBeInTheDocument();
  });

  it("does not let a route parameter or title query mint a certificate for a course the server doesn't confirm", async () => {
    eligibility.mockRejectedValue(new CertificateUnavailableError());
    renderPage("/profile/certificates/someone-elses-course?title=Fake%20Course");
    expect(await screen.findByText(/this certificate isn't available/i)).toBeInTheDocument();
    expect(renderPng).not.toHaveBeenCalled();
    expect(screen.queryByText(/Fake Course/)).not.toBeInTheDocument();
  });

  it("reports a contradictory completion record instead of minting from it", async () => {
    eligibility.mockRejectedValue(new CertificateMismatchError());
    renderPage();
    expect(await screen.findByText(/couldn't confirm your completion/i)).toBeInTheDocument();
    expect(renderPng).not.toHaveBeenCalled();
  });

  it("shows Retry (not a fabricated completion) when the API is unreachable, then recovers", async () => {
    // The page retries a failed read once on its own; fail both so the Retry button shows.
    eligibility
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(completed());
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /^retry$/i }, { timeout: 4000 }));
    expect(await readyImage()).toBeInTheDocument();
  });

  it("needs the course title from the verified progress record", async () => {
    eligibility.mockResolvedValue(completed({ courseTitle: null }));
    renderPage();
    expect(await screen.findByText(/couldn't read this course's title/i)).toBeInTheDocument();
    expect(renderPng).not.toHaveBeenCalled();
  });
});

describe("rendering and the recorded date", () => {
  it("renders with the profile name, the verified title and the recorded completion date", async () => {
    renderPage();
    await readyImage();
    const data = renderPng.mock.calls[0][0];
    expect(data.displayName).toBe("Ada Lovelace");
    expect(data.courseTitle).toBe("Intro to Programming");
    expect(data.completedAt).toBe("2026-10-09T14:30:00Z");
    expect(data.completionDateLabel).toBe("Completed 9 October 2026");
    expect(renderPng.mock.calls[0][1]).toBe("landscape");
  });

  it("never substitutes today's date when none was recorded", async () => {
    eligibility.mockResolvedValue(completed({ completedAt: null }));
    renderPage();
    await readyImage();
    const data = renderPng.mock.calls[0][0];
    expect(data.completedAt).toBeNull();
    expect(data.completionDateLabel).toBeNull();
    expect(screen.queryByText("Completion")).not.toBeInTheDocument();
  });

  it("keeps the same data object contents for PNG and PDF (same name, course and date)", async () => {
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(renderPdf).toHaveBeenCalledTimes(1));
    expect(renderPdf.mock.calls[0][0]).toEqual(renderPng.mock.calls[0][0]);
  });

  it("exposes the certificate's content as real text beside the image", async () => {
    renderPage();
    await readyImage();
    const details = screen.getByText("Awarded to").closest("dl")!;
    expect(within(details).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(details).getByText("Intro to Programming")).toBeInTheDocument();
    expect(within(details).getByText("9 October 2026")).toBeInTheDocument();
  });

  it("prepares Unicode names and long titles as given (no truncation before rendering)", async () => {
    const longTitle = "Introduction to Data Structures, Algorithms and Computational Thinking for Sierra Leone Universities";
    eligibility.mockResolvedValue(completed({ courseTitle: longTitle }));
    profileApi.mockResolvedValue({ ...baseProfile, full_name: "Zoë Müller-Åberg 李小龍" } as never);
    renderPage();
    await readyImage();
    const data = renderPng.mock.calls[0][0];
    expect(data.displayName).toBe("Zoë Müller-Åberg 李小龍");
    expect(data.courseTitle).toBe(longTitle);
  });

  it("asks for a name when the profile has none, and exports nothing until one is given", async () => {
    profileApi.mockResolvedValue({ id: "s", email: "s@x.com" } as never);
    renderPage();
    expect((await screen.findAllByText(/enter the name you'd like on your certificate/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /download image/i })).toBeDisabled();
    expect(renderPng).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/name on certificate/i), "Isatu Conteh");
    await readyImage();
    expect(renderPng.mock.calls.at(-1)![0].displayName).toBe("Isatu Conteh");
  });
});

describe("name correction", () => {
  it("defaults to the profile name, re-renders with the correction, and never updates the profile", async () => {
    renderPage();
    await readyImage();
    const input = screen.getByLabelText(/name on certificate/i);
    expect(input).toHaveValue("Ada Lovelace");
    expect(screen.getByText(/changes the name on this certificate only/i)).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, "Ada K. Lovelace");
    await waitFor(() => expect(renderPng.mock.calls.at(-1)![0].displayName).toBe("Ada K. Lovelace"), { timeout: 3000 });

    expect(updateProfile).not.toHaveBeenCalled();
    expect(profileApi).toHaveBeenCalledTimes(1);
    expect(renderPng.mock.calls.at(-1)![0].profileName).toBe("Ada Lovelace");
  });

  it("invalidates the prepared image the moment the name changes: no download of the old name", async () => {
    renderPage();
    await readyImage();
    await userEvent.type(screen.getByLabelText(/name on certificate/i), "X");
    // Old artifact is gone from the UI immediately; exports are disabled while the new one prepares.
    expect(screen.queryByRole("img", { name: /Certificate of completion/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download image/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /share/i })).toBeDisabled();
    const image = await screen.findByRole("img", { name: /Ada LovelaceX/ }, { timeout: 3000 });
    expect(image).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download image/i })).toBeEnabled();
  });

  it("downloads the corrected name's file, not a stale one", async () => {
    renderPage();
    await readyImage();
    await userEvent.type(screen.getByLabelText(/name on certificate/i), "Z");
    await screen.findByRole("img", { name: /Ada LovelaceZ/ }, { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: /download image/i }));
    // The downloaded blob URL is the corrected image's, rendered for the new name.
    expect(anchorClicks.at(-1)!.href).toBe(created.at(-1));
    expect(renderPng.mock.calls.at(-1)![0].displayName).toBe("Ada LovelaceZ");
  });

  it("resets to the profile name", async () => {
    renderPage();
    await readyImage();
    const input = screen.getByLabelText(/name on certificate/i);
    await userEvent.type(input, " Jr");
    await userEvent.click(screen.getByRole("button", { name: /reset to profile name/i }));
    expect(input).toHaveValue("Ada Lovelace");
    await screen.findByRole("img", { name: /Ada Lovelace completed/ }, { timeout: 3000 });
  });

  it("rejects blank and line-break names and disables export", async () => {
    renderPage();
    await readyImage();
    const input = screen.getByLabelText(/name on certificate/i);
    await userEvent.clear(input);
    expect(await screen.findByRole("alert")).toHaveTextContent(/enter the name/i);
    expect(screen.getByRole("button", { name: /download image/i })).toBeDisabled();

    await userEvent.click(input);
    await userEvent.paste("a".repeat(121));
    expect(await screen.findByRole("alert")).toHaveTextContent(/120 characters or fewer/i);
  });

  it("does not remember a correction after leaving: the next visit starts from the profile name", async () => {
    const first = renderPage();
    await readyImage();
    await userEvent.type(screen.getByLabelText(/name on certificate/i), " Jr");
    first.unmount();
    certificateArtifacts.clear();
    renderPage();
    await readyImage();
    expect(screen.getByLabelText(/name on certificate/i)).toHaveValue("Ada Lovelace");
  });
});

describe("formats", () => {
  it("defaults to the landscape certificate, switches to the story card, and renders only the selected format", async () => {
    renderPage();
    await readyImage();
    expect(screen.getByRole("radio", { name: "Certificate" })).toBeChecked();
    expect(renderPng).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("radio", { name: "Story card" }));
    expect(await screen.findByRole("img", { name: /^Story card/ })).toBeInTheDocument();
    expect(renderPng.mock.calls.at(-1)![1]).toBe("story");
    expect(renderPng).toHaveBeenCalledTimes(2);
  });

  it("offers the PDF for the landscape certificate only", async () => {
    renderPage();
    await readyImage();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Story card" }));
    await screen.findByRole("img", { name: /^Story card/ });
    expect(screen.queryByRole("button", { name: /download pdf/i })).not.toBeInTheDocument();
    expect(screen.getByText(/1080 × 1920 PNG/)).toBeInTheDocument();
  });

  it("switches format with the arrow keys", async () => {
    renderPage();
    await readyImage();
    screen.getByRole("radio", { name: "Certificate" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Story card" })).toBeChecked();
  });

  it("reuses an already prepared format instead of rendering it again", async () => {
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("radio", { name: "Story card" }));
    await screen.findByRole("img", { name: /^Story card/ });
    await userEvent.click(screen.getByRole("radio", { name: "Certificate" }));
    await readyImage();
    expect(renderPng).toHaveBeenCalledTimes(2);
  });
});

describe("render failures", () => {
  it("keeps the inputs and offers Retry when rendering fails", async () => {
    renderPng.mockRejectedValueOnce(new Error("boom"));
    renderPage();
    expect(await screen.findByText(/couldn't prepare your certificate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name on certificate/i)).toHaveValue("Ada Lovelace");
    expect(screen.getByRole("button", { name: /download image/i })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /^retry$/i }));
    expect(await readyImage()).toBeInTheDocument();
  });

  it("shows the specific message when text is too long to fit, with no partial export", async () => {
    const { CertificateTextOverflowError } = await import("../utils/certificates/layout");
    renderPng.mockRejectedValueOnce(new CertificateTextOverflowError("name or course title"));
    renderPage();
    expect(await screen.findByText(/too long to fit on a certificate/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download image/i })).toBeDisabled();
  });

  it("reports a PDF failure without losing the PNG", async () => {
    renderPdf.mockRejectedValueOnce(new Error("pdf boom"));
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    expect(await screen.findByText(/couldn't prepare the pdf/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download image/i })).toBeEnabled();
  });
});

describe("downloads", () => {
  it("downloads the PNG with a safe, ID-free filename", async () => {
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /download image/i }));
    expect(anchorClicks.at(-1)!.download).toBe("UniVybe_Intro-to-Programming_Certificate.png");
    expect(anchorClicks.at(-1)!.download).not.toMatch(/student|acct|uuid/i);
    expect(screen.getByText(/download started/i)).toBeInTheDocument();
  });

  it("downloads the PDF on demand, once, and names it .pdf", async () => {
    renderPage();
    await readyImage();
    expect(renderPdf).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(anchorClicks.some((c) => c.download.endsWith(".pdf"))).toBe(true));
    expect(anchorClicks.find((c) => c.download.endsWith(".pdf"))!.download).toBe(
      "UniVybe_Intro-to-Programming_Certificate.pdf"
    );
    // A second click reuses the cached PDF.
    await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    await waitFor(() => expect(anchorClicks.filter((c) => c.download.endsWith(".pdf"))).toHaveLength(2));
    expect(renderPdf).toHaveBeenCalledTimes(1);
  });

  it("does not claim the image was saved to the gallery", async () => {
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /download image/i }));
    expect(document.body.textContent).not.toMatch(/saved to (your )?(gallery|photos)/i);
    expect(screen.getByText(/press and hold it/i)).toBeInTheDocument();
  });
});

describe("sharing", () => {
  it("shares the prepared PNG file through the native sheet, straight from the click", async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => true);
    setNavigator({ share, canShare });
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /^share$/i }));
    expect(share).toHaveBeenCalledTimes(1);
    const shared = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(shared.files).toHaveLength(1);
    expect(shared.files![0].name).toBe("UniVybe_Intro-to-Programming_Certificate.png");
    expect(shared.files![0].type).toBe("image/png");
    expect(shared).not.toHaveProperty("url");
    // No fake "posted" claim afterwards.
    expect(document.body.textContent).not.toMatch(/posted|published/i);
    // Preparation happened before the click: the render call count didn't change on share.
    expect(renderPng).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the student closes the share sheet", async () => {
    setNavigator({
      share: vi.fn(async () => {
        throw new DOMException("closed", "AbortError");
      }),
      canShare: vi.fn(() => true),
    });
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /^share$/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(anchorClicks).toHaveLength(0); // no automatic download either
  });

  it("offers 'Share image' again and a download after a real failure", async () => {
    setNavigator({
      share: vi.fn(async () => {
        throw new DOMException("denied", "NotAllowedError");
      }),
      canShare: vi.fn(() => true),
    });
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /^share$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/sharing didn't start/i);
    expect(screen.getByRole("button", { name: /share image/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download image/i })).toBeEnabled();
  });

  it("without file sharing, Share explains the manual route and offers download + caption — not a text link", async () => {
    const writeText = vi.fn(async () => undefined);
    setNavigator({ clipboard: { writeText } });
    renderPage();
    await readyImage();
    await userEvent.click(screen.getByRole("button", { name: /^share$/i }));
    expect(screen.getByText(/download the image, then upload it to your status or story/i)).toBeInTheDocument();
    const panel = screen.getByText(/can't share image files directly/i).closest("div")!;
    await userEvent.click(within(panel).getByRole("button", { name: /copy caption/i }));
    expect(writeText).toHaveBeenCalledWith("I completed Intro to Programming on UniVybe! A new vibe for learning.");
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/posted to|published/i);
  });

  it("does not claim direct posting to WhatsApp Status or any social account", async () => {
    setNavigator({ share: vi.fn(async () => undefined), canShare: vi.fn(() => true) });
    renderPage();
    await readyImage();
    expect(document.body.textContent).not.toMatch(/whatsapp status|posted to whatsapp/i);
  });

  it("falls back to a manual caption box when the clipboard is blocked", async () => {
    setNavigator({ clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) } });
    document.execCommand = vi.fn(() => false);
    renderPage();
    await readyImage();
    await userEvent.click(screen.getAllByRole("button", { name: /copy caption/i })[0]);
    expect(await screen.findByLabelText(/copy this caption manually/i)).toHaveValue(
      "I completed Intro to Programming on UniVybe! A new vibe for learning."
    );
  });
});

describe("logout and account switching", () => {
  it("clears prepared files and revokes their URLs when the session ends", async () => {
    renderPage();
    await readyImage();
    expect(certificateArtifacts.size).toBe(1);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    clearCertificateSession();
    expect(certificateArtifacts.size).toBe(0);
    expect(revoked).toEqual(expect.arrayContaining(created));
    // The protected page doesn't linger on a signed-out session.
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("never shows the previous account's certificate to the next account", async () => {
    profileApi.mockResolvedValue({ ...baseProfile, id: "student-A", full_name: "Student Alpha" } as never);
    const first = renderPage();
    await screen.findByRole("img", { name: /Student Alpha/ });
    first.unmount();

    // Another student signs in on the same tab without the artifact cache being cleared first.
    signIn("acct-2");
    profileApi.mockResolvedValue({ ...baseProfile, id: "student-B", full_name: "Student Beta" } as never);
    renderPage();
    await screen.findByRole("img", { name: /Student Beta/ });
    expect(screen.queryByRole("img", { name: /Student Alpha/ })).not.toBeInTheDocument();
    // Alpha's file is gone from memory.
    expect(certificateArtifacts.size).toBe(1);
  });
});
