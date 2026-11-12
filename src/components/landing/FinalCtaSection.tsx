import { useRef } from "react";
import { useFeatureSectionAnimation } from "../../hooks/useFeatureSectionAnimation";
import { LandingButton } from "./LandingButton";
import { LandingImg } from "./LandingImg";
import { pickImage } from "./landingAssets";
import { CoinToken } from "./SceneCards";
import { SceneItem, SceneMascot } from "./SceneParts";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "./landingSections";

// Brand-colour accents that echo the feature bands (concept yellow, learning
// blue, practical teal, coins pink, resources purple) without becoming a
// second big illustration.
const ACCENTS = [
  { className: "left-[6%] top-[34%] h-[16%] w-[16%] bg-azure-500", from: { x: 40, s: 0.4 } },
  { className: "left-[18%] top-[6%] h-[11%] w-[11%] bg-amber-500", from: { y: 40, s: 0.4 } },
  { className: "right-[10%] top-[4%] h-[14%] w-[14%] bg-aquamarine-500", from: { y: 40, s: 0.4 } },
  { className: "right-[2%] top-[38%] h-[18%] w-[18%] bg-rose-500", from: { x: -40, s: 0.4 } },
  { className: "left-[2%] top-[66%] h-[9%] w-[9%] bg-blue-violet-500", from: { x: 40, s: 0.4 } },
];

export const FinalCtaSection = () => {
  const rootRef = useRef<HTMLElement>(null);
  // Calmer than the feature bands: always scroll-activated, never hover.
  useFeatureSectionAnimation(rootRef, { variant: "cta", activation: "scroll" });

  return (
    <section
      ref={rootRef}
      aria-labelledby="final-cta-title"
      className="relative isolate overflow-clip bg-white"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-2 px-5 pt-16 sm:px-8 lg:min-h-[560px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-0">
        <div className="pb-8 text-center lg:py-24 lg:text-left">
          <h2
            id="final-cta-title"
            className="text-balance font-accent text-4xl leading-none tracking-wider text-gray-900 sm:text-5xl lg:text-6xl"
          >
            Bring a{" "}
            <span className="bg-gradient-to-r from-azure-500 via-rose-500 to-blue-violet-500 bg-clip-text text-transparent">
              new vibe
            </span>{" "}
            to your student life
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium leading-relaxed text-gray-600 sm:text-xl lg:mx-0">
            Learn differently, put knowledge into practice, access the
            resources you need, earn rewards, and discover new opportunities —
            all with UniVibe.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <LandingButton to={SIGNUP_ROUTE} size="lg" arrow>
              Get started
            </LandingButton>
            <LandingButton to={LOGIN_ROUTE} size="lg" variant="outline-dark">
              Log in
            </LandingButton>
          </div>
        </div>

        <div
          data-scene
          className="relative mx-auto h-[320px] w-full max-w-[440px] self-end sm:h-[400px] lg:h-[480px]"
        >
          {ACCENTS.map((accent) => (
            <SceneItem
              key={accent.className}
              className={`z-0! rounded-full ${accent.className}`}
              from={accent.from}
            >
              <span className="block h-full w-full" />
            </SceneItem>
          ))}
          <SceneMascot
            image={pickImage("mascot-hi")}
            alt="Vybe, the UniVybe mascot, waving and welcoming you"
            heightPct={96}
          />
          <SceneItem
            className="left-[1%] top-[14%] w-[13%]"
            from={{ y: -60, r: -90, s: 0.6 }}
            float
          >
            <CoinToken />
          </SceneItem>
          <SceneItem
            className="right-[16%] top-[22%] w-[12%]"
            from={{ x: -30, s: 0.5 }}
          >
            <LandingImg image={pickImage("float-spark")} className="h-auto w-full" />
          </SceneItem>
        </div>
      </div>
    </section>
  );
};
