import { useMemo } from "react";
import {
  LANDSCAPE_COVER,
  PORTRAIT_COVER,
  buildCourseFallbackCover,
  type CoverShape,
} from "../../utils/courseCover";

interface CourseFallbackCoverProps {
  /** Stable identity (slug / uuid / id); the cover is a pure function of it. */
  seed: string;
  /** Source of the monogram. */
  title: string;
  variant?: "landscape" | "portrait";
  className?: string;
}

const renderShape = (shape: CoverShape, index: number) => {
  const { kind, x, y, size, rotate, color, opacity } = shape;
  const transform = `rotate(${rotate} ${x} ${y})`;
  switch (kind) {
    case "circle":
      return <circle key={index} cx={x} cy={y} r={size / 2} fill={color} opacity={opacity} />;
    case "ring":
      return (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={size / 2}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(3, size * 0.16)}
          opacity={opacity}
        />
      );
    case "square":
      return (
        <rect
          key={index}
          x={x - size / 2}
          y={y - size / 2}
          width={size}
          height={size}
          rx={size * 0.22}
          fill={color}
          opacity={opacity}
          transform={transform}
        />
      );
    case "pill":
      return (
        <rect
          key={index}
          x={x - size * 0.8}
          y={y - size * 0.27}
          width={size * 1.6}
          height={size * 0.54}
          rx={size * 0.27}
          fill={color}
          opacity={opacity}
          transform={transform}
        />
      );
    case "dots":
      return (
        <g key={index} fill={color} opacity={opacity} transform={transform}>
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={x + (col - 1) * size * 0.4}
                cy={y + (row - 1) * size * 0.4}
                r={size * 0.07}
              />
            ))
          )}
        </g>
      );
  }
};

/**
 * Abstract branded cover for anything without a thumbnail: brand colours,
 * simple shapes and a monogram from the title. Pure CSS/SVG — nothing is
 * fetched, and the same seed always renders the same cover.
 */
export const CourseFallbackCover = ({
  seed,
  title,
  variant = "landscape",
  className = "",
}: CourseFallbackCoverProps) => {
  const cover = useMemo(
    () =>
      buildCourseFallbackCover(
        seed,
        title,
        variant === "portrait" ? PORTRAIT_COVER : LANDSCAPE_COVER
      ),
    [seed, title, variant]
  );

  return (
    <div
      aria-hidden
      className={`relative isolate overflow-hidden [container-type:inline-size] ${className}`}
      style={{
        backgroundImage: `linear-gradient(${cover.angle}deg, ${cover.base} 0%, color-mix(in srgb, ${cover.base} 62%, ${cover.accent}) 100%)`,
      }}
    >
      <svg
        viewBox={`0 0 ${cover.width} ${cover.height}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
        {cover.shapes.map(renderShape)}
      </svg>
      {/* Landscape covers centre the monogram; portrait ones (roadmap tiles) keep
          it in the upper part, clear of the title overlaid on the bottom. */}
      <span
        className={`absolute inset-x-0 flex justify-center font-title leading-none tracking-wide drop-shadow-sm select-none ${
          variant === "portrait"
            ? "top-[16%] text-5xl sm:text-6xl"
            : "inset-y-0 items-center text-4xl sm:text-5xl"
        }`}
        // Scales with the cover (a 64px thumbnail and a 400px hero share this
        // component); the text-* classes are the fallback where `cqw` is unsupported.
        style={{
          color: cover.ink,
          fontSize: variant === "portrait" ? "24cqw" : "16cqw",
        }}
      >
        {cover.initials}
      </span>
    </div>
  );
};
