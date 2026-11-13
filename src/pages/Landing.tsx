import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { FeatureBand } from "../components/landing/FeatureBand";
import {
  ConceptScene,
  CoinsScene,
  GigsScene,
  LearningScene,
  OpportunitiesScene,
  PracticalScene,
  ResourcesScene,
} from "../components/landing/FeatureScenes";
import { FinalCtaSection } from "../components/landing/FinalCtaSection";
import { HeroSection } from "../components/landing/HeroSection";
import { LandingFooter } from "../components/landing/LandingFooter";
import { GuestHeader } from "../components/layout/GuestHeader";
import { BottomSheet } from "../components/common/BottomSheet";
import { LEARN_URL } from "../components/common/LearnHandoff";
import {
  featureSections,
  type FeatureSectionId,
} from "../components/landing/landingSections";
import { ScrollTrigger } from "../utils/gsapSetup";

const scenes: Record<FeatureSectionId, ReactNode> = {
  concept: <ConceptScene />,
  learning: <LearningScene />,
  practical: <PracticalScene />,
  coins: <CoinsScene />,
  resources: <ResourcesScene />,
  opportunities: <OpportunitiesScene />,
  gigs: <GigsScene />,
};

/**
 * Public landing page for guests (route `/`). A standalone brand surface:
 * it deliberately doesn't use PageShell (the app's top/bottom nav) and is
 * always light, independent of the in-app dark-mode toggle.
 */
export const Landing = () => {
  const [learnFeature, setLearnFeature] = useState<string | null>(null);
  const suggestLearn = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    const features: Record<string, string> = {
      '/courses': 'Courses', '/resources': 'Academic resources',
      '/practical-sessions': 'Practical sessions', '/wallet': 'Vybe Coins',
    };
    const feature = features[url.pathname];
    if (!feature) return;
    event.preventDefault();
    setLearnFeature(feature);
  };
  // Web fonts swap in after first paint and can shift section heights;
  // recompute scroll trigger positions once they've loaded.
  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div onClickCapture={suggestLearn} className="landing-root min-h-screen w-full overflow-x-clip bg-white text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-gray-900 focus:px-5 focus:py-3 focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <GuestHeader />
      <main id="main">
        <HeroSection />
        {featureSections.map((section) => (
          <FeatureBand
            key={section.id}
            {...section}
            visual={scenes[section.id]}
          />
        ))}
        <FinalCtaSection />
      </main>
      <LandingFooter />
      <BottomSheet open={learnFeature !== null} onClose={() => setLearnFeature(null)} title="Find this on UniVybe Learn">
        <p className="mb-5 text-gray-700">Explore {learnFeature} on the main UniVybe platform. Visit UniVybe Learn to explore it. Opportunities, gigs and community are available here on Earn.</p>
        <a className="earn-button" href={LEARN_URL} target="_blank" rel="noopener noreferrer">Go to UniVybe Learn ↗</a>
        <button className="earn-button-secondary mt-3 w-full" onClick={() => setLearnFeature(null)}>Stay on Earn</button>
      </BottomSheet>
    </div>
  );
};
