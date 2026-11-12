import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "../../utils/gsapSetup";
import { LandingButton } from "./LandingButton";
import { LandingImg } from "./LandingImg";
import { pickImage } from "./landingAssets";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "./landingSections";

interface HeroAssetProps {
  /** Positioning/size classes. */
  className: string;
  /** Pointer-parallax travel in px (desktop only). */
  depth?: number;
  float?: boolean;
  children: ReactNode;
}

// Three nested layers so entrance (outer), pointer parallax (middle) and the
// idle float (inner) each own a separate transform and never fight.
const HeroAsset = ({ className, depth = 0, float = false, children }: HeroAssetProps) => (
  <div data-hero="asset" className={`pointer-events-none absolute z-0 ${className}`}>
    <div data-depth={depth || undefined}>
      {float ? <div data-hero-float>{children}</div> : children}
    </div>
  </div>
);

export const HeroSection = () => {
  const rootRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        pointer: "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
      },
      (context) => {
        const { motion, pointer } = context.conditions as {
          motion: boolean;
          pointer: boolean;
        };
        if (!motion) return; // reduced motion: render the finished layout

        const q = gsap.utils.selector(root);
        const wordmark = q('[data-hero="wordmark"]');
        const headline = q('[data-hero="headline"]');
        const copy = q('[data-hero="copy"]');
        const cta = q('[data-hero="cta"]');
        const assets = q('[data-hero="asset"]');
        const floats = q("[data-hero-float]");

        gsap.set(wordmark, { y: 28, opacity: 0, scale: 0.97 });
        gsap.set([headline, copy, cta], { y: 20, opacity: 0 });
        gsap.set(assets, { y: 24, opacity: 0, scale: 0.92 });

        const bobs = floats.map((el, i) =>
          gsap.to(el, {
            y: i % 2 ? 7 : -7,
            duration: 2.6 + i * 0.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            paused: true,
          }),
        );
        let inView = true;
        let settled = false;
        const syncBobs = () =>
          bobs.forEach((tween) => (inView && settled ? tween.play() : tween.pause()));

        // Wordmark -> headline -> copy -> CTAs -> mascot and floating assets.
        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.out" },
          onComplete: () => {
            settled = true;
            syncBobs();
          },
        });
        tl.to(wordmark, { y: 0, opacity: 1, scale: 1, duration: 0.8 })
          .to(headline, { y: 0, opacity: 1, duration: 0.6 }, "-=0.4")
          .to(copy, { y: 0, opacity: 1, duration: 0.6 }, "-=0.35")
          .to(cta, { y: 0, opacity: 1, duration: 0.6 }, "-=0.3")
          .to(assets, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1 }, "-=0.4");

        // Don't animate before the wordmark exists, or the entrance plays on
        // nothing; cap the wait so a slow connection never blocks the reveal.
        let started = false;
        const start = () => {
          if (started) return;
          started = true;
          tl.play();
        };
        const img = wordmarkRef.current;
        const fallback = window.setTimeout(start, 900);
        if (!img || img.complete) {
          start();
        } else {
          img.addEventListener("load", start, { once: true });
          img.addEventListener("error", start, { once: true });
        }

        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            inView = self.isActive;
            syncBobs();
          },
        });

        let removePointer: (() => void) | undefined;
        if (pointer) {
          const layers = q<HTMLElement>("[data-depth]").map((el) => ({
            depth: Number(el.dataset.depth),
            x: gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" }),
          }));
          const onMove = (event: PointerEvent) => {
            const nx = (event.clientX / window.innerWidth - 0.5) * 2;
            const ny = (event.clientY / window.innerHeight - 0.5) * 2;
            layers.forEach((layer) => {
              layer.x(nx * layer.depth);
              layer.y(ny * layer.depth);
            });
          };
          root.addEventListener("pointermove", onMove);
          removePointer = () => root.removeEventListener("pointermove", onMove);
        }

        return () => {
          window.clearTimeout(fallback);
          img?.removeEventListener("load", start);
          img?.removeEventListener("error", start);
          removePointer?.();
          trigger.kill();
        };
      },
      root,
    );

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[85svh] flex-col items-center overflow-clip bg-white pt-24 text-center sm:pt-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(58,134,255,0.14),transparent_70%),radial-gradient(40%_40%_at_92%_78%,rgba(255,0,110,0.08),transparent_70%),radial-gradient(40%_40%_at_6%_72%,rgba(0,245,212,0.14),transparent_70%)]"
      />

      <HeroAsset
        className="left-[13%] top-[19%] hidden w-24 -rotate-12 xl:block"
        depth={16}
        float
      >
        <LandingImg image={pickImage("float-cap")} className="h-auto w-full" />
      </HeroAsset>
      <HeroAsset
        className="right-[14%] top-[17%] hidden w-16 rotate-6 xl:block"
        depth={26}
        float
      >
        <LandingImg image={pickImage("float-spark")} className="h-auto w-full" />
      </HeroAsset>
      <HeroAsset
        className="left-[11%] top-[58%] hidden w-24 rotate-6 xl:block"
        depth={22}
      >
        <LandingImg image={pickImage("float-headset")} className="h-auto w-full" />
      </HeroAsset>
      {/* <HeroAsset
        className="bottom-[10%] left-[19%] hidden w-16 -rotate-6 xl:block"
        depth={12}
        float
      >
        <LandingImg image={pickImage("float-confetti")} className="h-auto w-full" />
      </HeroAsset> */}

      <div className="relative z-10 my-auto w-full max-w-3xl px-4 pb-8 xl:pb-16">
        <div data-hero="wordmark">
          <img
            ref={wordmarkRef}
            src={pickImage("logo-colors")?.src}
            width={pickImage("logo-colors")?.width}
            height={pickImage("logo-colors")?.height}
            alt="UniVybe"
            fetchPriority="high"
            decoding="async"
            className="mx-auto h-auto w-[57vw] sm:w-[min(88vw,760px,92svh)]"
          />
        </div>

        <h1
          id="hero-title"
          data-hero="headline"
          className="mt-6 text-balance font-accent text-3xl leading-none tracking-wider text-gray-900 sm:text-3xl lg:text-4xl xl:text-5xl"
        >
          A <span className="text-rose-500">new vibe</span> for{" "}
          <span className="text-azure-500">learning</span> and{" "}
          <span className="text-blue-violet-500">student life</span>
        </h1>

        <p
          data-hero="copy"
          className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-relaxed text-gray-600 sm:text-lg"
        >
          UniVibe brings learning, practical experiences, resources, rewards,
          and opportunities together in one vibrant platform built for
          university students.
        </p>

        <div
          data-hero="cta"
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <LandingButton to={SIGNUP_ROUTE} size="lg" arrow>
            Get started
          </LandingButton>
          <LandingButton to={LOGIN_ROUTE} size="lg" variant="outline-dark">
            Log in
          </LandingButton>
        </div>
      </div>

      {/* Mascot: peeks up from the section's bottom edge below xl; at xl it
          stands beside the wordmark composition. */}
      <div
        data-hero="asset"
        className="pointer-events-none relative z-0 mx-auto h-44 w-36 shrink-0 overflow-hidden xl:absolute xl:bottom-0 xl:right-[2%] xl:mx-0 xl:h-[min(52vh,470px)] xl:w-auto xl:aspect-[606/900] xl:overflow-visible"
      >
        <div data-depth="10" className="h-full w-full">
          <LandingImg
            image={pickImage("mascot-hi")}
            alt="Vybe, the UniVybe mascot, waving hello"
            priority
            className="block h-auto w-full xl:h-full"
          />
        </div>
      </div>
    </section>
  );
};
