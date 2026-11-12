import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../services/certificates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/certificates")>()),
  getEnrolledProgressPage: vi.fn(),
}));

import { CertificatesPage } from "./CertificatesPage";
import { CertificatesProfileSection } from "../components/certificates/CertificatesProfileSection";
import { getEnrolledProgressPage } from "../services/certificates";
import type { CertificateCandidate, EnrolledProgressPage } from "../types/certificate";

const fetchPage = vi.mocked(getEnrolledProgressPage);

const course = (key: string, completedAt: string | null, title = `Course ${key}`): CertificateCandidate => ({
  key,
  routeId: key,
  title,
  completedAt,
  state: completedAt ? "complete" : "incomplete",
});
const inProgress = (key: string) => course(key, null);

const page = (n: number, records: CertificateCandidate[], hasMore: boolean | null): EnrolledProgressPage => ({
  page: n,
  records,
  hasMore,
  perPage: 15,
  total: null,
});

const renderWith = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/profile/certificates"]}>
        <Routes>
          <Route path="/profile/certificates" element={ui} />
          <Route path="/profile/certificates/:courseId" element={<p>Preview page</p>} />
          <Route path="/profile" element={<p>Profile page</p>} />
          <Route path="/courses" element={<p>Courses page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("auth_token", "t");
  localStorage.setItem("user", JSON.stringify({ id: "acct-1", email: "s@x.com", firstname: "A", lastname: "B", level: "200" }));
  fetchPage.mockReset();
});

describe("CertificatesPage — collection across enrolled-course pages", () => {
  it("lists completed courses with full titles and recorded dates, one tile each", async () => {
    const long = "Introduction to Data Structures, Algorithms and Computational Thinking for Sierra Leone Universities";
    fetchPage.mockResolvedValue(
      page(1, [course("a", "2026-10-09T10:00:00Z", long), inProgress("b")], false)
    );
    renderWith(<CertificatesPage />);
    expect(await screen.findByRole("heading", { name: long })).toBeInTheDocument();
    expect(screen.getByText("Completed 9 October 2026")).toBeInTheDocument();
    expect(screen.queryByText("Course b")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view certificate/i })).toHaveLength(1);
    expect(screen.getByRole("link", { name: new RegExp(long.slice(0, 20)) })).toHaveAttribute(
      "href",
      "/profile/certificates/a"
    );
  });

  it("finds an older completion on a later page even though the earlier pages have none", async () => {
    fetchPage.mockImplementation(async (n) => {
      if (n === 1) return page(1, [inProgress("a"), inProgress("b")], true);
      if (n === 2) return page(2, [inProgress("c")], true);
      return page(3, [course("old", "2025-01-05T00:00:00Z", "Study Skills")], false);
    });
    renderWith(<CertificatesPage />);
    expect(await screen.findByRole("heading", { name: "Study Skills" })).toBeInTheDocument();
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
    // No "no certificates" claim anywhere.
    expect(screen.queryByText(/will appear here when you complete/i)).not.toBeInTheDocument();
  });

  it("does not announce 'no certificates' while source pages remain — it offers to load more instead", async () => {
    // Four empty-of-completions pages: the automatic scan stops after three, then asks the student.
    fetchPage.mockImplementation(async (n) =>
      n < 4 ? page(n, [inProgress(`p${n}`)], true) : page(4, [course("late", "2024-05-01T00:00:00Z", "Late finisher")], false)
    );
    renderWith(<CertificatesPage />);
    expect(await screen.findByText(/no completed courses in the courses checked so far/i)).toBeInTheDocument();
    expect(screen.queryByText(/will appear here when you complete/i)).not.toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledTimes(3);

    await userEvent.click(screen.getByRole("button", { name: /load more courses/i }));
    expect(await screen.findByRole("heading", { name: "Late finisher" })).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledTimes(4);
  });

  it("shows 'Checking more courses…' while loading and doesn't present a partial list as the full history", async () => {
    let release!: (p: EnrolledProgressPage) => void;
    fetchPage.mockImplementation(async (n) => {
      if (n === 1) return page(1, [course("a", "2026-10-09T10:00:00Z")], true);
      return new Promise<EnrolledProgressPage>((resolve) => {
        release = resolve;
      });
    });
    renderWith(<CertificatesPage />);
    await screen.findByRole("heading", { name: "Course a" });
    expect(screen.getByText(/showing certificates from the courses checked so far/i)).toBeInTheDocument();
    expect(screen.queryByText(/recent completions/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load more courses/i }));
    expect(await screen.findByRole("button", { name: /checking more courses/i })).toBeDisabled();
    release(page(2, [course("b", "2026-10-10T10:00:00Z")], false));
    await screen.findByRole("heading", { name: "Course b" });
  });

  it("sorts newest first only once every page has been read", async () => {
    fetchPage.mockImplementation(async (n) =>
      n === 1
        ? page(1, [course("older", "2026-01-01T00:00:00Z")], true)
        : page(2, [course("newer", "2026-09-01T00:00:00Z")], false)
    );
    renderWith(<CertificatesPage />);
    await screen.findByRole("heading", { name: "Course older" });
    // Partial: source order, not sorted.
    await userEvent.click(await screen.findByRole("button", { name: /load more courses/i }));
    await screen.findByRole("heading", { name: "Course newer" });
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Course newer", "Course older"]);
  });

  it("de-duplicates a course that shows up on two pages", async () => {
    fetchPage.mockImplementation(async (n) =>
      n === 1
        ? page(1, [course("dup", "2026-10-09T10:00:00Z")], true)
        : page(2, [course("dup", "2026-10-09T10:00:00Z"), course("x", "2026-10-01T10:00:00Z")], false)
    );
    renderWith(<CertificatesPage />);
    await userEvent.click(await screen.findByRole("button", { name: /load more courses/i }));
    await screen.findByRole("heading", { name: "Course x" });
    expect(screen.getAllByRole("heading", { name: "Course dup" })).toHaveLength(1);
  });

  it("says there are no certificates only after the list is exhausted, with a Browse courses way out", async () => {
    fetchPage.mockResolvedValue(page(1, [inProgress("a")], false));
    renderWith(<CertificatesPage />);
    expect(
      await screen.findByText("Your certificates will appear here when you complete a course")
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /browse courses/i }));
    expect(screen.getByText("Courses page")).toBeInTheDocument();
  });

  it("stops when the API ignores `page` and keeps returning the same records", async () => {
    fetchPage.mockResolvedValue(page(1, [course("a", "2026-10-09T10:00:00Z")], null));
    renderWith(<CertificatesPage />);
    await screen.findByRole("heading", { name: "Course a" });
    await userEvent.click(await screen.findByRole("button", { name: /load more courses/i }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /load more courses/i })).not.toBeInTheDocument());
    expect(screen.getAllByRole("heading", { name: "Course a" })).toHaveLength(1);
  });

  it("shows Retry, not an empty state, when the first page fails", async () => {
    fetchPage.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(page(1, [course("a", "2026-10-09T10:00:00Z")], false));
    renderWith(<CertificatesPage />);
    expect(await screen.findByText(/couldn't load your certificates/i)).toBeInTheDocument();
    expect(screen.queryByText(/will appear here when you complete/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("heading", { name: "Course a" })).toBeInTheDocument();
  });

  it("keeps what was found and offers Retry when a later page fails", async () => {
    fetchPage.mockImplementation(async (n) => {
      if (n === 1) return page(1, [course("a", "2026-10-09T10:00:00Z")], true);
      throw new Error("flaky");
    });
    renderWith(<CertificatesPage />);
    await userEvent.click(await screen.findByRole("button", { name: /load more courses/i }));
    expect(await screen.findByText(/couldn't check more courses/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Course a" })).toBeInTheDocument();
  });

  it("opens the preview route for a tile", async () => {
    fetchPage.mockResolvedValue(page(1, [course("a", "2026-10-09T10:00:00Z")], false));
    renderWith(<CertificatesPage />);
    await userEvent.click(await screen.findByRole("link", { name: /view certificate for course a/i }));
    expect(screen.getByText("Preview page")).toBeInTheDocument();
  });

  it("only reads the enrolled list for the signed-in account", async () => {
    localStorage.clear();
    fetchPage.mockResolvedValue(page(1, [], false));
    renderWith(<CertificatesPage />);
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchPage).not.toHaveBeenCalled();
  });
});

describe("CertificatesProfileSection — compact preview", () => {
  it("shows up to three certificates and View all, without labelling a total", async () => {
    fetchPage.mockResolvedValue(
      page(
        1,
        ["a", "b", "c", "d"].map((k, i) => course(k, `2026-0${i + 1}-01T00:00:00Z`)),
        true
      )
    );
    renderWith(<CertificatesProfileSection />);
    await screen.findByRole("heading", { name: "Course a" });
    expect(screen.getAllByRole("link", { name: /view certificate for/i })).toHaveLength(3);
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/profile/certificates");
    expect(document.body.textContent).not.toMatch(/\b\d+ certificates?\b|total|recent completions/i);
    // Enough found on the first page: no further automatic scanning.
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("keeps scanning pages (up to a cap) to find the first completions", async () => {
    fetchPage.mockImplementation(async (n) =>
      n < 3 ? page(n, [inProgress(`p${n}`)], true) : page(3, [course("found", "2026-10-09T10:00:00Z")], false)
    );
    renderWith(<CertificatesProfileSection />);
    expect(await screen.findByRole("heading", { name: "Course found" })).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("does not scan every enrollment on a Profile visit", async () => {
    fetchPage.mockImplementation(async (n) => page(n, [inProgress(`p${n}`)], true));
    renderWith(<CertificatesProfileSection />);
    expect(await screen.findByText(/haven't found a completed course in the courses checked so far/i)).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("link", { name: /check more courses/i })).toHaveAttribute("href", "/profile/certificates");
  });

  it("shows the empty message only when every page has been read", async () => {
    fetchPage.mockResolvedValue(page(1, [inProgress("a")], false));
    renderWith(<CertificatesProfileSection />);
    expect(await screen.findByText(/your certificates will appear here when you complete a course/i)).toBeInTheDocument();
  });

  it("offers Retry when loading fails", async () => {
    fetchPage.mockRejectedValue(new Error("offline"));
    renderWith(<CertificatesProfileSection />);
    expect(await screen.findByText(/couldn't load your certificates/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
