import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Landing } from "./Landing";

function Location() { return <output aria-label="Current route">{useLocation().pathname}</output>; }

beforeEach(() => localStorage.clear());

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Landing /><Location/>
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
      "/opportunities",
    );
    expect(hrefOf(/find gigs/i, section(/pick up gigs/i))).toBe("/gigs");
    // No practical-sessions page exists yet, so it sends guests to sign-up
    // rather than to a dead route.
    expect(hrefOf(/discover practical sessions/i, section(/physical meetups/i))).toBe("/practical-sessions");
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
    expect(hrefOf("Opportunities", menu)).toBe("/opportunities");
    expect(hrefOf("Feed", menu)).toBe("/feed");
    expect(hrefOf("Log in", menu)).toBe("/auth/login");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});

describe('Learn suggestions from Earn', () => {
 it.each([
  ['Bite-sized learning that keeps you moving','Explore courses','Courses'],
  ['Physical meetups, practical sessions','Discover practical sessions','Practical sessions'],
  ['Learn. Complete. Earn.','Get started','Vybe Coins'],
  ['All the resources you need, easily accessible','Browse resources','Academic resources'],
 ])('opens a dismissible handoff for %s without navigating away',async(title,label,feature)=>{
  const user=userEvent.setup();renderLanding();
  const section=screen.getByRole('heading',{name:title}).closest('section')!;
  await user.click(within(section).getByRole('link',{name:label}));
  const dialog=screen.getByRole('dialog',{name:'Find this on UniVybe Learn'});
  expect(dialog).toHaveTextContent('Explore '+feature+' on the main UniVybe platform');
  expect(within(dialog).getByRole('link',{name:/Go to UniVybe Learn/})).toHaveAttribute('href','https://univybesl.com');
  expect(screen.getByLabelText('Current route')).toHaveTextContent('/');
  await user.click(within(dialog).getByRole('button',{name:'Stay on Earn'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 });
 it('keeps opportunity and gig navigation local',async()=>{
  const user=userEvent.setup();renderLanding();
  const section=screen.getByRole('heading',{name:'Discover opportunities beyond the classroom'}).closest('section')!;
  await user.click(within(section).getByRole('link',{name:/Explore opportunities/}));
  expect(screen.getByLabelText('Current route')).toHaveTextContent('/opportunities');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 });
});

it('uses Earn destinations in the landing header and footer',()=>{
 renderLanding();
 const primary=within(screen.getByRole('navigation',{name:'Primary'}));
 expect(primary.getAllByRole('link').map(link=>link.textContent)).toEqual(['Discover','Opportunities','Gigs','Feed','Profile']);
 expect(primary.queryByRole('link',{name:'Courses'})).not.toBeInTheDocument();
 const footer=within(screen.getByRole('navigation',{name:'Footer'}));
 for(const label of ['Discover','Opportunities','Gigs','Feed','Profile']) expect(footer.getByRole('link',{name:label})).toBeInTheDocument();
});
