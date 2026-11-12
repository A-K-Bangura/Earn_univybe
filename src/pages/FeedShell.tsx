import { useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { useSwipeTabs } from "../hooks/useSwipeTabs";
import { useFeedTabStore } from "../store/feedTabStore";

interface TabConfig {
  path: string;
  label: string;
  heading: string;
  subtitle: string;
  activeClass: string;
}

const TABS: readonly TabConfig[] = [
  {
    path: "/feed",
    label: "Feed",
    heading: "Feed",
    subtitle: "Stay motivated with tips, discussions, and announcements.",
    activeClass: "text-azure-500 border-azure-500",
  },
  {
    path: "/feed/opportunities",
    label: "Opportunities",
    heading: "Opportunities",
    subtitle: "Discover scholarships, internships, programs, and more.",
    activeClass: "text-blue-violet-500 border-blue-violet-500",
  },
  {
    path: "/feed/gigs",
    label: "Gigs",
    heading: "Gigs",
    subtitle: "Find small jobs, put your skills to work, or post a gig.",
    activeClass: "text-aquamarine-200 border-aquamarine-200 dark:text-aquamarine-300 dark:border-aquamarine-300",
  },
] as const;

/**
 * Shared shell for the Feed / Opportunities / Gigs tabs (design guide §1-3).
 * Owns the single `PageShell`, the tab row, swipe-to-switch, and "reopen the
 * last tab" memory. Each tab's own filters/page live in that tab's own URL
 * search params (see Opportunities.tsx/Gigs.tsx) so they survive a switch.
 */
export const FeedShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setLastVisitedFeedTab = useFeedTabStore((state) => state.setLastVisitedFeedTab);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = useMemo(() => {
    const index = TABS.findIndex((tab) => tab.path === location.pathname);
    return index === -1 ? 0 : index;
  }, [location.pathname]);

  useEffect(() => {
    const match = TABS.find((tab) => tab.path === location.pathname);
    if (match) setLastVisitedFeedTab(match.path);
  }, [location.pathname, setLastVisitedFeedTab]);

  const goToTab = (index: number) => {
    navigate(TABS[index].path, { replace: true });
  };

  const { containerProps, isDragging } = useSwipeTabs({
    tabCount: TABS.length,
    activeIndex,
    onCommit: goToTab,
  });

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = Math.min(TABS.length - 1, index + 1);
    else if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToTab(index);
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const active = TABS[activeIndex];

  return (
    <PageShell>
      {/* `own-links`: this shell and its tab panels style their own <Link>s
          (see index.css) — opt out of the global unlayered `a { color }` rule. */}
      <div className="own-links mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div
          role="tablist"
          aria-label="Feed, Opportunities and Gigs"
          className="sticky top-0 z-10 -mx-4 flex bg-gray-50/95 px-4 backdrop-blur-sm dark:bg-gray-900/95 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none"
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.path}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`feed-tab-${index}`}
              aria-selected={index === activeIndex}
              aria-controls="feed-tabpanel"
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => goToTab(index)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={`flex-1 border-b-2 px-2 py-3 text-center text-sm font-semibold transition-colors sm:flex-none sm:px-6 ${
                index === activeIndex
                  ? tab.activeClass
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <header className="mt-6 mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900 dark:text-white">
            {active.heading}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{active.subtitle}</p>
        </header>

        <div
          id="feed-tabpanel"
          role="tabpanel"
          aria-labelledby={`feed-tab-${activeIndex}`}
          {...containerProps}
          className={isDragging ? "will-change-transform" : undefined}
        >
          <Outlet />
        </div>
      </div>
    </PageShell>
  );
};
