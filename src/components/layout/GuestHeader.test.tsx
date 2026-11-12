import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useUIStore } from "../../store/uiStore";

vi.mock("../../services/auth", () => ({ isAuthenticated: vi.fn() }));

import { isAuthenticated } from "../../services/auth";
import { GuestHeader } from "./GuestHeader";
import { TopNav } from "./TopNav";

const asGuest = () => vi.mocked(isAuthenticated).mockReturnValue(false);
const asStudent = () => vi.mocked(isAuthenticated).mockReturnValue(true);

const renderAt = (path: string, ui: React.ReactElement) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

beforeEach(() => {
  useUIStore.setState({ darkMode: false });
});

describe("GuestHeader (app variant)", () => {
  it("shows the landing menu: logo, Courses, Feed, Log in, Get started", () => {
    asGuest();
    renderAt("/courses", <GuestHeader variant="app" />);

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "UniVybe home" })).toHaveAttribute("href", "/");
    expect(within(banner).getByRole("link", { name: "Courses" })).toHaveAttribute("href", "/courses");
    expect(within(banner).getByRole("link", { name: "Feed" })).toHaveAttribute("href", "/feed");
    expect(within(banner).getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/auth/login");
    expect(within(banner).getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/auth/signup");
  });

  it("is desktop-only and has no mobile hamburger", () => {
    asGuest();
    renderAt("/courses", <GuestHeader variant="app" />);

    // Hidden below md (mobile guests keep BottomNav); never a hamburger.
    expect(screen.getByRole("banner")).toHaveClass("hidden", "md:block");
    expect(screen.queryByRole("button", { name: /open menu/i })).not.toBeInTheDocument();
  });

  it("marks the current page", () => {
    asGuest();
    renderAt("/feed", <GuestHeader variant="app" />);

    expect(screen.getByRole("link", { name: "Feed" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Courses" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the dark-mode toggle that guests had in the old TopNav", async () => {
    asGuest();
    const user = userEvent.setup();
    renderAt("/courses", <GuestHeader variant="app" />);

    const toggle = screen.getByRole("button", { name: /toggle dark mode/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(useUIStore.getState().darkMode).toBe(true);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("renders nothing for a signed-in student", () => {
    asStudent();
    renderAt("/login", <GuestHeader variant="app" />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});

describe("GuestHeader (landing variant)", () => {
  it("stays responsive and light-only: hamburger, no dark-mode toggle", () => {
    asGuest();
    renderAt("/", <GuestHeader />);

    expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /toggle dark mode/i })).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).not.toHaveClass("hidden");
  });
});

describe("GuestHeader logo", () => {
  const logoSrc = () =>
    screen.getByRole("link", { name: "UniVybe home" }).querySelector("img")?.getAttribute("src");

  it("uses the black wordmark, not the colored one", () => {
    asGuest();
    renderAt("/courses", <GuestHeader variant="app" />);

    expect(logoSrc()).toContain("logo-word-black");
    expect(logoSrc()).not.toContain("logo-colors");
  });

  it("switches to the white wordmark in dark mode on app pages", () => {
    asGuest();
    useUIStore.setState({ darkMode: true });
    renderAt("/courses", <GuestHeader variant="app" />);

    expect(logoSrc()).toContain("logo-word-white");
  });

  it("stays black on the always-light landing page even if dark mode is saved", () => {
    asGuest();
    useUIStore.setState({ darkMode: true });
    renderAt("/", <GuestHeader />);

    expect(logoSrc()).toContain("logo-word-black");
  });
});

describe("TopNav", () => {
  it("shows guests the landing-style header and reserves its height", () => {
    asGuest();
    const { container } = renderAt("/courses", <TopNav />);

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Get started" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /leaderboard/i })).not.toBeInTheDocument();
    // The header is fixed, so a spacer keeps page content below it.
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass("h-[65px]");
  });

  it("shows the signed-in app nav (Resources in place of Leaderboard)", () => {
    asStudent();
    renderAt("/dashboard", <TopNav />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    for (const name of ["Home", "Feed", "Courses", "Resources", "Profile"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
  });
});
