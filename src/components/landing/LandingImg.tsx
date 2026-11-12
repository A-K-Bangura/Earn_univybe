import type { LandingImage } from "./landingAssets";

interface LandingImgProps {
  image: LandingImage | undefined;
  /** Leave empty for purely decorative art. */
  alt?: string;
  className?: string;
  /** Above-the-fold hero art only; everything else lazy-loads. */
  priority?: boolean;
}

export const LandingImg = ({
  image,
  alt = "",
  className,
  priority = false,
}: LandingImgProps) => {
  if (!image) return null;
  return (
    <img
      src={image.src}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={className}
    />
  );
};
