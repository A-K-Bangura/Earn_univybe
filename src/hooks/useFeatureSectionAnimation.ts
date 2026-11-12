import { useLayoutEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "../utils/gsapSetup";

export type FeatureAnimationVariant =
  | "concept"
  | "learning"
  | "practical"
  | "coins"
  | "resources"
  | "opportunities"
  | "gigs"
  | "cta";

interface VariantTiming {
  mascotDuration: number;
  /** When supporting assets begin entering, in seconds. */
  itemStart: number;
  itemStagger: number;
  itemEase: string;
}

// Shared choreography, tuned per section: the mascot rises, then supporting
// assets arrive in DOM order. Variants only change timing/easing; the
// per-asset direction comes from each scene's `data-*` "from" values.
const TIMING: Record<FeatureAnimationVariant, VariantTiming> = {
  concept: { mascotDuration: 0.9, itemStart: 0.25, itemStagger: 0.1, itemEase: "power2.out" },
  learning: { mascotDuration: 0.8, itemStart: 0.3, itemStagger: 0.22, itemEase: "power2.out" },
  practical: { mascotDuration: 0.85, itemStart: 0.25, itemStagger: 0.1, itemEase: "power3.out" },
  coins: { mascotDuration: 0.8, itemStart: 0.4, itemStagger: 0.12, itemEase: "back.out(1.1)" },
  resources: { mascotDuration: 0.8, itemStart: 0.3, itemStagger: 0.12, itemEase: "power3.out" },
  opportunities: { mascotDuration: 0.8, itemStart: 0.35, itemStagger: 0.2, itemEase: "power2.out" },
  gigs: { mascotDuration: 0.8, itemStart: 0.35, itemStagger: 0.15, itemEase: "back.out(1.1)" },
  cta: { mascotDuration: 0.8, itemStart: 0.2, itemStagger: 0.1, itemEase: "power2.out" },
};

const num = (el: Element, attr: string, fallback: number): number => {
  const raw = el.getAttribute(attr);
  return raw === null ? fallback : Number(raw);
};

interface Options {
  variant: FeatureAnimationVariant;
  /**
   * `hover` (default): on desktop with a fine pointer the scene responds to
   * hover/focus of the whole section; touch and small screens use scroll.
   * `scroll`: always activate on scroll (used for calmer sections).
   */
  activation?: "hover" | "scroll";
}

/**
 * Drives a feature section's scene. Expected markup inside `rootRef`:
 *  - `[data-scene]`  the visual area (scroll trigger on touch/small screens)
 *  - `[data-mascot]` mascot wrapper (rises from the bottom edge)
 *  - `[data-item]`   supporting asset; optional `data-x|y|r|s` = start offsets
 *  - `[data-float]`  gently bobs once the section is active and in view
 *  - `[data-sway]`   mascot idle sway, `[data-spin]` slow rotation
 *  - `[data-accent]` title accent bar, `[data-draw]` SVG path to draw in,
 *    `[data-glint]`  element that pulses once after the scene settles
 *
 * The CSS (un-animated) state of every element is its final, readable state.
 * Idle/hidden values are applied by GSAP only when motion is allowed, so
 * reduced-motion users (and anyone without JS) always see the finished scene.
 */
export const useFeatureSectionAnimation = (
  rootRef: RefObject<HTMLElement | null>,
  { variant, activation = "hover" }: Options,
) => {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        hoverCapable:
          "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
      },
      (context) => {
        const { motion, hoverCapable } = context.conditions as {
          motion: boolean;
          hoverCapable: boolean;
        };
        if (!motion) return;

        const useHover = activation === "hover" && hoverCapable;
        const q = gsap.utils.selector(root);
        const scene = root.querySelector<HTMLElement>("[data-scene]");
        const mascot = q("[data-mascot]");
        const items = q("[data-item]");
        const accent = q("[data-accent]");
        const draws = q("[data-draw]");
        const glints = q("[data-glint]");
        const floats = q("[data-float]");
        const sways = q("[data-sway]");
        const spins = q("[data-spin]");
        const timing = TIMING[variant];

        // Idle state. Desktop keeps the mascot peeking (~30% visible) so the
        // section never looks empty; touch/scroll mode starts further up and
        // faded because the scene is normally already rising as it scrolls in.
        gsap.set(mascot, useHover ? { yPercent: 70 } : { yPercent: 30, opacity: 0 });
        gsap.set(accent, { scaleX: 0.35, transformOrigin: "left center" });
        gsap.set(draws, { strokeDashoffset: 1 });
        items.forEach((el) => {
          gsap.set(el, {
            x: num(el, "data-x", 0),
            y: num(el, "data-y", 24),
            rotation: num(el, "data-r", 0),
            scale: num(el, "data-s", 0.85),
            opacity: 0,
          });
        });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
        tl.to(mascot, { yPercent: 0, opacity: 1, duration: timing.mascotDuration }, 0)
          .to(accent, { scaleX: 1, duration: 0.6 }, 0.1)
          .to(
            items,
            {
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              opacity: 1,
              duration: 0.7,
              stagger: timing.itemStagger,
              ease: timing.itemEase,
            },
            timing.itemStart,
          )
          .to(
            draws,
            { strokeDashoffset: 0, duration: 0.9, ease: "power1.inOut" },
            timing.itemStart + 0.2,
          )
          .to(
            glints,
            { scale: 1.35, rotation: 18, duration: 0.22, yoyo: true, repeat: 1, ease: "power1.inOut" },
            ">-0.1",
          );

        // Continuous motion: tiny amplitudes, only a few elements, and only
        // while the section is on screen and fully settled.
        const idle: gsap.core.Tween[] = [
          ...floats.map((el, i) =>
            gsap.to(el, {
              y: num(el, "data-float-amp", i % 2 ? 6 : -6),
              duration: 2.4 + (i % 3) * 0.5,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              paused: true,
            }),
          ),
          ...sways.map((el) =>
            gsap.to(el, {
              rotation: 1.2,
              transformOrigin: "50% 100%",
              duration: 3.2,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
              paused: true,
            }),
          ),
          ...spins.map((el) =>
            gsap.to(el, {
              rotation: 360,
              duration: 12,
              ease: "none",
              repeat: -1,
              paused: true,
            }),
          ),
        ];

        let inView = false;
        const syncIdle = () => {
          const on = inView && tl.progress() === 1;
          idle.forEach((tween) => (on ? tween.play() : tween.pause()));
        };
        tl.eventCallback("onComplete", syncIdle);
        tl.eventCallback("onReverseComplete", syncIdle);
        ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            inView = self.isActive;
            syncIdle();
          },
        });

        if (useHover) {
          const play = () => void tl.play();
          const reverse = () => void tl.reverse();
          const onFocusOut = (event: FocusEvent) => {
            if (!root.contains(event.relatedTarget as Node | null)) reverse();
          };
          root.addEventListener("mouseenter", play);
          root.addEventListener("mouseleave", reverse);
          root.addEventListener("focusin", play);
          root.addEventListener("focusout", onFocusOut);
          return () => {
            root.removeEventListener("mouseenter", play);
            root.removeEventListener("mouseleave", reverse);
            root.removeEventListener("focusin", play);
            root.removeEventListener("focusout", onFocusOut);
          };
        }

        // Touch / small screens: play when the visual scrolls into the active
        // zone and settle back only when scrolling back above it, so jitter
        // around the boundary can't cause repeated replays.
        ScrollTrigger.create({
          trigger: scene ?? root,
          start: "top 82%",
          animation: tl,
          toggleActions: "play none play reverse",
        });
      },
      root,
    );

    return () => mm.revert();
  }, [rootRef, variant, activation]);
};
