import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Roadmap, RoadmapCourseItem } from "../types/roadmap";

vi.mock("../services/auth", () => ({ isAuthenticated: vi.fn() }));
vi.mock("../services/roadmaps", () => ({
  getRoadmap: vi.fn(),
  getRoadmapCourses: vi.fn(),
}));

import { isAuthenticated } from "../services/auth";
import { getRoadmap, getRoadmapCourses } from "../services/roadmaps";
import { RoadmapJourney } from "./RoadmapJourney";

const meta = (page: number, last: number) => ({
  current_page: page,
  last_page: last,
  per_page: 8,
  total: 10,
  from: 1,
  to: 8,
});

const item = (
  position: number,
  status: RoadmapCourseItem["status"],
  extra: Partial<RoadmapCourseItem> = {}
): RoadmapCourseItem => ({
  position,
  is_current: false,
  status,
  is_enrolled: status !== "not_enrolled",
  progress_percent: status === "completed" ? 100 : status === "in_progress" ? 40 : 0,
  completed_at: status === "completed" ? "2026-10-01T00:00:00Z" : null,
  course: {
    id: position,
    uuid: `uuid-${position}`,
    slug: `course-${position}`,
    title: `Course title ${position}`,
    description: "About this course",
    level: "200",
    thumbnail_url: null,
    is_paid: false,
    price: null,
  } as RoadmapCourseItem["course"],
  ...extra,
});

const roadmap = (overrides: Partial<Roadmap> = {}): Roadmap => ({
  id: 1,
  uuid: "rm-uuid",
  slug: "se-path",
  title: "Software Engineering Path",
  description: "From first program to deployed app.",
  thumbnail_url: null,
  published_at: null,
  level: "200",
  semester: null,
  university: null,
  faculty: null,
  department: { id: 1, name: "Computer Science" },
  organization: null,
  total_courses: 10,
  is_participant: true,
  is_completed: false,
  progress: { completed_courses: 1, total_courses: 10, percent: 10 },
  current_course: {
    position: 2,
    page: 1,
    course: { id: 2, uuid: "uuid-2", slug: "course-2", title: "Course title 2", thumbnail_url: null, is_paid: false, price: null },
  },
  badge: {
    id: 1,
    uuid: "b",
    name: "Roadmap Completed: SE",
    description: "d",
    icon_url: null,
    rarity: "rare",
    earned: false,
    earned_at: null,
  },
  ...overrides,
});

const stageOne = [
  item(1, "completed"),
  item(2, "in_progress", { is_current: true }),
  item(3, "not_enrolled"),
  item(4, "not_enrolled"),
];

const fullStage = Array.from({ length: 8 }, (_, i) => item(i + 1, "not_enrolled"));

const renderJourney = (path = "/roadmaps/se-path") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/roadmaps/:roadmapId" element={<RoadmapJourney />} />
          <Route path="/course/:id" element={<p>course page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/** Make `matchMedia` answer true for the queries `isMatch` accepts. */
const stubMedia = (isMatch: (query: string) => boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: isMatch(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

const originalMatchMedia = window.matchMedia;
const decorOnScreen = () => document.querySelectorAll("[data-journey-decor]");

beforeEach(() => {
  vi.mocked(isAuthenticated).mockReturnValue(true);
  vi.mocked(getRoadmap).mockResolvedValue({
    roadmap: roadmap(),
    courses: stageOne,
    meta: meta(1, 2),
  });
  // Reduced motion: stage changes apply immediately (no GSAP timing in tests).
  stubMedia((q) => q.includes("prefers-reduced-motion: reduce"));
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.clearAllMocks();
});

describe("RoadmapJourney", () => {
  it("shows the roadmap title and one node per course", async () => {
    renderJourney();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Software Engineering Path" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Course \d+:/ })).toHaveLength(4);

    // Asked for the page holding the student's current course.
    expect(getRoadmap).toHaveBeenCalledWith("se-path", { page: "current", per_page: 8 });
  });

  it("keeps the title bar to one compact row, with the details behind a chevron", async () => {
    const user = userEvent.setup();
    renderJourney();

    const chevron = await screen.findByRole("button", { name: "Show roadmap details" });
    expect(chevron).toHaveAttribute("aria-expanded", "false");
    // Collapsed: just the title and a couple of small tags.
    expect(screen.getByText("200 Level")).toBeInTheDocument();
    expect(screen.queryByText("From first program to deployed app.")).not.toBeInTheDocument();
    expect(screen.queryByText("1 of 10 courses")).not.toBeInTheDocument();
    // A thin progress line is the only progress shown while collapsed.
    expect(screen.getByRole("progressbar", { name: "Roadmap progress" })).toHaveAttribute(
      "aria-valuenow",
      "10"
    );

    await user.click(chevron);

    expect(screen.getByRole("button", { name: "Hide roadmap details" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByText("From first program to deployed app.")).toBeInTheDocument();
    expect(screen.getByText("1 of 10 courses")).toBeInTheDocument();
    // The full set of details lives in the panel (the bar only carries the level + place).
    const panel = screen.getByText("From first program to deployed app.").parentElement!;
    expect(within(panel).getByText("10 courses")).toBeInTheDocument();
    expect(within(panel).getByText("Computer Science")).toBeInTheDocument();
    expect(within(panel).getByText("200 Level")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide roadmap details" }));
    expect(screen.queryByText("From first program to deployed app.")).not.toBeInTheDocument();
  });

  it("has no Explore/Continue roadmap button; a participant can jump to their current course from the details", async () => {
    const user = userEvent.setup();
    renderJourney();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: /explore roadmap|continue roadmap/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show roadmap details" }));
    const jump = screen.getByRole("button", { name: "Go to current course" });
    await user.click(jump);

    // Jumping only positions the page: details close, nothing is joined, no navigation.
    expect(screen.queryByText("From first program to deployed app.")).not.toBeInTheDocument();
    expect(screen.queryByText("course page")).not.toBeInTheDocument();
    expect(getRoadmapCourses).not.toHaveBeenCalled();
  });

  it("says every state in words, and marks the current course", async () => {
    renderJourney();

    expect(
      await screen.findByRole("link", { name: /Course 1: Course title 1\. Completed\./ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Course 2: Course title 2\. In progress, 40%\. Continue here\./,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Course 3: Course title 3\. Not started\./ })
    ).toBeInTheDocument();
    expect(screen.getByText("Continue here")).toBeInTheDocument();
  });

  it("never locks a course because earlier ones are unfinished, and has no 'join roadmap'", async () => {
    renderJourney();
    await screen.findByRole("heading", { level: 1 });

    // Course 4 sits behind unfinished courses 2 and 3, yet is a plain link.
    const fourth = screen.getByRole("link", { name: /Course 4:/ });
    expect(fourth).toHaveAttribute("href", "/course/uuid-4");
    expect(fourth).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText(/locked/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /join|enrol/i })).not.toBeInTheDocument();
  });

  it("explains, for a guest, that there is nothing to join (details, not a button)", async () => {
    vi.mocked(isAuthenticated).mockReturnValue(false);
    vi.mocked(getRoadmap).mockResolvedValue({
      roadmap: roadmap({ is_participant: false, progress: null, current_course: null }),
      courses: stageOne.map((i) => ({ ...i, is_current: false, status: "not_enrolled" as const })),
      meta: meta(1, 2),
    });
    const user = userEvent.setup();
    renderJourney();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("progressbar", { name: "Roadmap progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /explore roadmap/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show roadmap details" }));
    expect(screen.getByText(/Sign up to keep track of your progress/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to current course" })).not.toBeInTheDocument();
  });

  it("opens course details in a bottom sheet on tap, instead of navigating", async () => {
    const user = userEvent.setup();
    renderJourney();

    await user.click(await screen.findByRole("link", { name: /Course 2:/ }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "Course title 2" })).toBeInTheDocument();
    // In-progress courses resume in the player.
    expect(within(sheet).getByRole("link", { name: "Continue course" })).toHaveAttribute(
      "href",
      "/course/uuid-2/play"
    );
    expect(screen.queryByText("course page")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a floating preview on hover and navigates on click when a mouse is available", async () => {
    stubMedia((q) => q.includes("hover: hover") || q.includes("prefers-reduced-motion: reduce"));
    const user = userEvent.setup();
    renderJourney();

    const node = await screen.findByRole("link", { name: /Course 3:/ });
    await user.hover(node);
    const preview = await screen.findByRole("group", { name: "Course 3 preview" });
    expect(within(preview).getByText("Course title 3")).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "View course" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: "Course 3 preview" })).not.toBeInTheDocument();

    await user.click(node);
    expect(await screen.findByText("course page")).toBeInTheDocument();
  });

  it("pages through a long roadmap by stage; the badge, collapsed and simple, is the last stop", async () => {
    vi.mocked(getRoadmapCourses).mockResolvedValue({
      data: [item(9, "not_enrolled"), item(10, "not_enrolled")],
      meta: meta(2, 2),
    });
    const user = userEvent.setup();
    renderJourney();

    expect(await screen.findByText("Stage 1 of 2")).toBeInTheDocument();
    // The badge is the destination: not on the first stage.
    expect(screen.queryByText("Roadmap badge")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Final stage/ }));

    expect(await screen.findByText("Stage 2 of 2")).toBeInTheDocument();
    expect(getRoadmapCourses).toHaveBeenCalledWith("se-path", { page: 2, per_page: 8 });
    expect(await screen.findByRole("link", { name: /Course 9:/ })).toBeInTheDocument();

    // Unfinished roadmap: one slim row, collapsed.
    const toggle = screen.getByRole("button", { name: /Roadmap badge/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(toggle).getByText("Complete all courses to earn it")).toBeInTheDocument();
    expect(screen.queryByText("Roadmap Completed: SE")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Roadmap Completed: SE")).toBeInTheDocument();
    expect(screen.getByText(/9 courses to go\. Any order works\./)).toBeInTheDocument();
  });

  it("opens the badge by default once it has been earned", async () => {
    vi.mocked(getRoadmap).mockResolvedValue({
      roadmap: roadmap({
        is_completed: true,
        current_course: null,
        progress: { completed_courses: 4, total_courses: 4, percent: 100 },
        total_courses: 4,
        badge: {
          id: 1, uuid: "b", name: "Roadmap Completed: SE", description: "d", icon_url: null,
          rarity: "rare", earned: true, earned_at: "2026-10-01T10:00:00Z",
        },
      }),
      courses: stageOne.map((i) => ({ ...i, status: "completed" as const, is_current: false })),
      meta: meta(1, 1),
    });
    renderJourney();

    const toggle = await screen.findByRole("button", { name: /Roadmap badge/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(toggle).getByText(/Earned on/)).toBeInTheDocument();
    expect(screen.getByText("Roadmap Completed: SE")).toBeInTheDocument();
    expect(screen.queryByText("Complete all courses to earn it")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Roadmap stages" })).not.toBeInTheDocument();
  });

  it("gives each stage its own stable theme colour", async () => {
    const user = userEvent.setup();
    vi.mocked(getRoadmapCourses).mockResolvedValue({
      data: [item(9, "not_enrolled")],
      meta: meta(2, 2),
    });
    renderJourney();

    const next = await screen.findByRole("button", { name: /Final stage/ });
    const stageOneColour = next.style.backgroundColor;
    expect(stageOneColour).not.toBe("");

    await user.click(next);
    await screen.findByText("Stage 2 of 2");
    expect(screen.getByRole("button", { name: /Journey's end/ }).style.backgroundColor).not.toBe(
      stageOneColour
    );
  });

  it("explains a missing roadmap instead of crashing", async () => {
    vi.mocked(getRoadmap).mockRejectedValue({ response: { status: 404 } });
    renderJourney("/roadmaps/nope");

    expect(await screen.findByText("We couldn't find that roadmap")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse roadmaps" })).toHaveAttribute("href", "/roadmaps");
  });
});

describe("RoadmapJourney: Vybe around the nodes", () => {
  const fullStageResponse = () => ({
    roadmap: roadmap(),
    courses: fullStage,
    meta: meta(1, 1),
  });

  it("puts at most 2 poses/loops on a phone-sized journey", async () => {
    vi.mocked(getRoadmap).mockResolvedValue(fullStageResponse());
    renderJourney();
    await screen.findAllByRole("link", { name: /^Course \d+:/ });

    // jsdom: no media query matches, so this is the phone layout.
    expect(decorOnScreen().length).toBe(2);
  });

  it("puts no more than 5 (here 4) on a desktop-sized journey", async () => {
    stubMedia((q) => q.includes("min-width: 640px") || q.includes("prefers-reduced-motion: reduce"));
    vi.mocked(getRoadmap).mockResolvedValue(fullStageResponse());
    renderJourney();
    await screen.findAllByRole("link", { name: /^Course \d+:/ });

    const count = decorOnScreen().length;
    expect(count).toBeGreaterThan(2);
    expect(count).toBeLessThanOrEqual(5);
  });

  it("keeps them decorative: hidden from assistive tech, empty alt, never interactive", async () => {
    vi.mocked(getRoadmap).mockResolvedValue(fullStageResponse());
    renderJourney();
    await screen.findAllByRole("link", { name: /^Course \d+:/ });

    for (const decor of decorOnScreen()) {
      expect(decor.closest("[aria-hidden='true']")).not.toBeNull();
      expect(decor.querySelector("img")).toHaveAttribute("alt", "");
      expect(decor.closest("a, button")).toBeNull();
    }
  });

  it("shows a still instead of an animation when the student prefers reduced motion", async () => {
    stubMedia((q) => q.includes("min-width: 640px") || q.includes("prefers-reduced-motion: reduce"));
    vi.mocked(getRoadmap).mockResolvedValue(fullStageResponse());
    renderJourney();
    await screen.findAllByRole("link", { name: /^Course \d+:/ });

    const loops = Array.from(decorOnScreen()).filter((el) =>
      el.getAttribute("data-journey-decor")?.startsWith("loop-")
    );
    for (const loop of loops) {
      expect(loop.querySelector("img")?.getAttribute("src")).toContain("poster");
    }
  });

  it("plays the loops when motion is fine", async () => {
    stubMedia((q) => q.includes("min-width: 640px")); // desktop, no reduced-motion match
    vi.mocked(getRoadmap).mockResolvedValue(fullStageResponse());
    renderJourney();
    await screen.findAllByRole("link", { name: /^Course \d+:/ });

    const loops = Array.from(decorOnScreen()).filter((el) =>
      el.getAttribute("data-journey-decor")?.startsWith("loop-")
    );
    for (const loop of loops) {
      expect(loop.querySelector("img")?.getAttribute("src")).not.toContain("poster");
    }
  });
});
