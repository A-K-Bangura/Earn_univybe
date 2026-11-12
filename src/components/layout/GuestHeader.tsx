import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { isAuthenticated } from "../../services/auth";
import { useUIStore } from "../../store/uiStore";
import { useFeedTabStore } from "../../store/feedTabStore";
import { LandingButton } from "../landing/LandingButton";
import { LandingImg } from "../landing/LandingImg";
import { pickImage } from "../landing/landingAssets";
import {
  COURSES_ROUTE,
  LOGIN_ROUTE,
  RESOURCES_ROUTE,
  SIGNUP_ROUTE,
} from "../landing/landingSections";

interface GuestHeaderProps {
  /**
   * `landing`: the public landing page. Responsive (hamburger menu on mobile)
   * and always light, independent of the in-app dark-mode toggle.
   * `app`: every other guest-facing page (courses, course detail, feed, auth).
   * Desktop only (`md+`; mobile guests keep the BottomNav), follows the
   * in-app dark mode, adds the dark-mode toggle, and marks the current page.
   */
  variant?: "landing" | "app";
}

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500";

/**
 * The landing page's public header, reused on every guest page. Fixed to the
 * top, transparent until the page scrolls and then translucent + blurred.
 * Being `fixed`, it takes no space: callers add a spacer (see TopNav) or top
 * padding (auth pages).
 */
export const GuestHeader = ({ variant = "landing" }: GuestHeaderProps) => {
  const themed = variant === "app";
  const darkMode = useUIStore((state) => state.darkMode);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Reopens whichever of Feed/Opportunities/Gigs was last visited this
  // session (defaults to "/feed") — see src/store/feedTabStore.ts.
  const lastVisitedFeedTab = useFeedTabStore((state) => state.lastVisitedFeedTab);
  // Only routes that exist in the app today (see App.tsx): public courses/feed/resources.
  const navLinks = [
    { to: COURSES_ROUTE, label: "Courses" },
    { to: lastVisitedFeedTab, label: "Feed" },
    { to: RESOURCES_ROUTE, label: "Resources" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Signed-in users get the app nav (TopNav), never the guest header.
  if (themed && isAuthenticated()) return null;

  const solid = scrolled || menuOpen;

  // Black/white wordmark rather than the colored one (the hero already shows
  // that large). The landing page is always light, so it always gets the black
  // variant; app pages follow the in-app theme.
  const logoName = themed && darkMode ? "logo-word-white" : "logo-word-black";

  // The landing page is always light, so it carries no `dark:` classes at all;
  // the app variant adds them. Class strings stay literal for Tailwind's scanner.
  const surface = solid
    ? themed
      ? "border-gray-200/70 bg-white/85 backdrop-blur-md dark:border-gray-700/70 dark:bg-gray-900/85"
      : "border-gray-200/70 bg-white/85 backdrop-blur-md"
    : "border-transparent bg-transparent";

  const linkColor = themed
    ? "text-gray-700 hover:text-azure-500 dark:text-gray-200 dark:hover:text-azure-700"
    : "text-gray-700 hover:text-azure-500";
  const linkActive = themed
    ? "text-azure-500 dark:text-azure-700"
    : "text-azure-500";
  const linkClass = `rounded-md px-1 py-1 font-bold transition-colors ${focusRing}`;
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `${linkClass} ${isActive ? linkActive : linkColor}`;

  return (
    // `landing-root` opts this header's links out of the global unlayered
    // `a { color; font-weight }` rule (see index.css), so the utilities apply.
    <header
      className={`landing-root fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        themed ? "hidden md:block" : ""
      } ${surface}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          aria-label="UniVybe home"
          className={`rounded-md focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-azure-500`}
        >
          <LandingImg
            image={pickImage(logoName)}
            alt="UniVybe"
            priority
            className="h-4 lg:h-8 w-auto sm:h-9"
          />
        </Link>

        <nav
          aria-label="Primary"
          className={`items-center gap-8 ${themed ? "flex" : "hidden md:flex"}`}
        >
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-5">
          <NavLink
            to={LOGIN_ROUTE}
            className={(state) =>
              `${themed ? "" : "hidden sm:inline "}${navClass(state)}`
            }
          >
            Log in
          </NavLink>
          <LandingButton
            to={SIGNUP_ROUTE}
            size="sm"
            variant={themed && darkMode ? "solid-light" : "solid-dark"}
          >
            Get started
          </LandingButton>
          {themed ? (
            <button
              type="button"
              aria-label="Toggle dark mode"
              aria-pressed={darkMode}
              onClick={() => useUIStore.getState().toggleDarkMode()}
              className={`grid h-10 w-10 place-items-center rounded-full bg-transparent p-0 text-gray-700 hover:bg-gray-900/5 dark:text-gray-200 dark:hover:bg-white/10 ${focusRing}`}
            >
              {darkMode ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className={`grid h-10 w-10 place-items-center rounded-full bg-transparent p-0 text-gray-900 hover:bg-gray-900/5 md:hidden ${focusRing}`}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {!themed && menuOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobile"
          className="border-t border-gray-200/70 bg-white px-4 py-4 shadow-lg md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {[...navLinks, { to: LOGIN_ROUTE, label: "Log in" }].map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block py-3 text-lg ${linkClass} ${linkColor}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
};
