import type { ReactNode } from "react";
import { LandingImg } from "./LandingImg";
import type { LandingImage } from "./landingAssets";

interface SceneStageProps {
  /** Tailwind classes for the soft shape behind the mascot. */
  blob: string;
  children: ReactNode;
}

/**
 * The visual half of a feature band. Sits on the band's bottom edge so the
 * mascot can rise out of it; the band clips whatever is below.
 */
export const SceneStage = ({ blob, children }: SceneStageProps) => (
  <div
    data-scene
    className="relative mx-auto h-[380px] w-full max-w-[520px] sm:h-[460px] lg:h-[560px] lg:max-w-none"
  >
    <div
      aria-hidden
      className={`pointer-events-none absolute bottom-[-22%] left-1/2 aspect-square w-[80%] -translate-x-1/2 rounded-full ${blob}`}
    />
    {children}
  </div>
);

interface SceneMascotProps {
  image: LandingImage | undefined;
  alt: string;
  /** Mascot height as a percentage of the stage. */
  heightPct?: number;
  /** Width of the box the mascot is centred in, as a percentage of the stage. */
  widthPct?: number;
  /** Horizontal placement classes (default: centred). */
  position?: string;
}

export const SceneMascot = ({
  image,
  alt,
  heightPct = 92,
  widthPct = 88,
  position = "left-1/2 -translate-x-1/2",
}: SceneMascotProps) => (
  <div
    data-mascot
    style={{ height: `${heightPct}%`, width: `${widthPct}%` }}
    className={`pointer-events-none absolute bottom-0 z-10 ${position}`}
  >
    <div data-sway className="h-full w-full">
      <LandingImg
        image={image}
        alt={alt}
        className="h-full w-full object-contain object-bottom drop-shadow-[0_14px_18px_rgba(0,0,0,0.18)]"
      />
    </div>
  </div>
);

interface SceneItemProps {
  /** Positioning/size classes, e.g. `left-[2%] top-[20%] w-[34%]`. */
  className: string;
  /** Start offsets the asset animates in from (px / deg / scale). */
  from?: { x?: number; y?: number; r?: number; s?: number };
  /** Gently bob once the scene has settled. Use on at most a few assets. */
  float?: boolean;
  /** Bob distance in px (negative = up first). */
  floatAmp?: number;
  children: ReactNode;
}

/** A supporting asset. Decorative: never intercepts pointer events. */
export const SceneItem = ({
  className,
  from,
  float = false,
  floatAmp,
  children,
}: SceneItemProps) => (
  <div
    data-item
    data-x={from?.x}
    data-y={from?.y}
    data-r={from?.r}
    data-s={from?.s}
    className={`pointer-events-none absolute z-20 ${className}`}
  >
    {float ? (
      <div data-float data-float-amp={floatAmp}>
        {children}
      </div>
    ) : (
      children
    )}
  </div>
);
