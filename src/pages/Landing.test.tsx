import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Landing } from "./Landing";

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );

const hrefOf = (name: string | RegExp, scope: HTMLElement) =>
  within(scope).getByRole("link", { name }).getAttribute("href");

describe("Landing page", () => {
  it("leads with the headline and the hero calls to action", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /a new vibe for learning and student life/i,
      }),
    ).toBeInTheDocument();

    const hero = screen
      .getByRole("heading", { level: 1 })
      .closest("section") as HTMLElement;
    // The full-colour wordmark is the hero's centrepiece.
    expect(within(hero).getByRole("img", { name: "UniVybe" })).toBeInTheDocument();
    expect(hrefOf(/get started/i, hero)).toBe("/auth/signup");
    expect(hrefOf(/log in/i, hero)).toBe("/auth/login");
  });

  it("shows the seven feature sections in story order, then the final CTA", () => {
    renderLanding();

    const titles = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titles).toEqual([
      "One platform. Every student. Every university.",
      "Bite-sized learning that keeps you moving",
      "Physical meetups, practical sessions",
      "Learn. Complete. Earn.",
      "All the resources you need, easily accessible",
      "Discover opportunities beyond the classroom",
      "Pick up gigs, earn on your own schedule",
      "Bring a new vibe to your student life",
    ]);
  });

  it("sets the seven feature titles in the Super Greatly title font", () => {
    renderLanding();

    const featureTitles = screen
      .getAllByRole("heading", { level: 2 })
      .slice(0, 7);
    for (const heading of featureTitles) {
      expect(heading).toHaveClass("font-title");
    }
  });

  it("points CTAs at existing routes only", () => {
    renderLanding();

    const section = (title: RegExp) =>
      screen.getByRole("heading", { level: 2, name: title }).closest("section") as HTMLElement;

    // Courses, Resources, Opportunities and Gigs are real, public routes.
    expect(hrefOf(/explore courses/i, section(/bite-sized/i))).toBe("/courses");
    expect(hrefOf(/browse resources/i, section(/all the resources/i))).toBe("/resources");
    expect(hrefOf(/explore opportunities/i, section(/discover opportunities/i))).toBe(
      "/feed/opportunities",
    );
    expect(hrefOf(/find gigs/i, section(/pick up gigs/i))).toBe("/feed/gigs");
    // No practical-sessions page exists yet, so it sends guests to sign-up
    // rather than to a dead route.
    expect(hrefOf(/discover practical sessions/i, section(/physical meetups/i))).toBe("/auth/signup");
  });

  it("keeps decorative scene art out of the accessibility tree", () => {
    renderLanding();

    // Informative mascots carry descriptive alt text; floating accents are "".
    const images = screen.getAllByRole("img", { hidden: true });
    expect(images.length).toBeGreaterThan(8);
    for (const img of document.querySelectorAll("img")) {
      expect(img.hasAttribute("alt")).toBe(true);
      expect(img).toHaveAttribute("width");
      expect(img).toHaveAttribute("height");
    }
    const lazy = [...document.querySelectorAll("img")].filter(
      (img) => img.getAttribute("loading") === "lazy",
    );
    expect(lazy.length).toBeGreaterThan(8);
  });

  it("opens and closes the mobile menu with the button and Escape", async () => {
    const user = userEvent.setup();
    renderLanding();

    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user.click(toggle);
    const menu = screen.getByRole("navigation", { name: "Mobile" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(hrefOf("Courses", menu)).toBe("/courses");
    expect(hrefOf("Feed", menu)).toBe("/feed");
    expect(hrefOf("Log in", menu)).toBe("/auth/login");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
