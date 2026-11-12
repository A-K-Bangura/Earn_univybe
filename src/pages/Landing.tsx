import { useEffect, type ReactNode } from "react";
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
    <div className="landing-root min-h-screen w-full overflow-x-clip bg-white text-gray-900">
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
    </div>
  );
};
