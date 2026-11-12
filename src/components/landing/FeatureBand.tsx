import { useRef, type ReactNode } from "react";
import { useFeatureSectionAnimation } from "../../hooks/useFeatureSectionAnimation";
import { LandingButton } from "./LandingButton";
import type { FeatureSectionConfig } from "./landingSections";

interface FeatureBandProps extends FeatureSectionConfig {
  visual: ReactNode;
}

/**
 * Full-width colour band: copy on one side, mascot scene on the other.
 * Desktop alternates sides via `visualSide`; mobile always stacks copy first,
 * scene below. The scene sits flush on the band's bottom edge so the mascot
 * can rise out of it (the band clips overflow, which also guarantees no
 * horizontal page overflow from decorative art).
 */
export const FeatureBand = ({
  id,
  eyebrow,
  title,
  description,
  background,
  tone,
  cta,
  visualSide,
  animationVariant,
  visual,
}: FeatureBandProps) => {
  const rootRef = useRef<HTMLElement>(null);
  useFeatureSectionAnimation(rootRef, { variant: animationVariant });

  const light = tone === "light";

  return (
    <section
      id={id}
      ref={rootRef}
      aria-labelledby={`${id}-title`}
      className={`relative isolate overflow-clip ${background} ${
        light ? "text-white" : "text-gray-900"
      }`}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-2 px-5 pt-14 sm:px-8 lg:min-h-[640px] lg:grid-cols-2 lg:gap-10 lg:pt-0 xl:min-h-[700px]">
        <div
          className={`pb-8 lg:py-24 ${
            visualSide === "left" ? "lg:order-2" : ""
          }`}
        >
          {eyebrow && (
            <p
              className={`mb-4 inline-block rounded-full px-4 py-1 font-accent text-lg tracking-widest ${
                light ? "bg-white/20" : "bg-black/10"
              }`}
            >
              {eyebrow}
            </p>
          )}
          <h2
            id={`${id}-title`}
            className="max-w-xl text-balance font-title text-4xl font-normal leading-[1.08] sm:text-5xl xl:text-6xl"
          >
            {title}
          </h2>
          <span
            data-accent
            aria-hidden
            className="mt-5 block h-1.5 w-24 rounded-full bg-current opacity-70"
          />
          {/* White body copy on the saturated blue/pink bands is ~3.5:1, below
              the AA bar for regular text, so light-tone copy is set bold
              (large-text threshold is 3:1). Dark-tone bands pass at any weight. */}
          <p
            className={`mt-5 max-w-md text-lg leading-relaxed sm:text-xl ${
              light ? "font-bold" : "font-medium"
            }`}
          >
            {description}
          </p>
          <div className="mt-8">
            <LandingButton
              to={cta.href}
              variant={light ? "solid-light" : "solid-dark"}
              size="lg"
              arrow
            >
              {cta.label}
            </LandingButton>
          </div>
        </div>

        <div className={`self-end ${visualSide === "left" ? "lg:order-1" : ""}`}>
          {visual}
        </div>
      </div>
    </section>
  );
};
