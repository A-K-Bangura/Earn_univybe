import { useState } from "react";
import { CourseFallbackCover } from "./CourseFallbackCover";

interface CourseCoverProps {
  title: string;
  /** Stable identity for the fallback (slug / uuid / id). */
  seed: string;
  thumbnailUrl?: string | null;
  variant?: "landscape" | "portrait";
  /** Size/shape of the box; applied to the image or the fallback alike. */
  className?: string;
  /** `eager` only for above-the-fold art. */
  loading?: "lazy" | "eager";
}

/**
 * A course/roadmap thumbnail that falls back to the abstract branded cover
 * when there is no URL or the image fails to load (so a broken or blocked
 * image never leaves an empty grey box).
 */
export const CourseCover = ({
  title,
  seed,
  thumbnailUrl,
  variant = "landscape",
  className = "",
  loading = "lazy",
}: CourseCoverProps) => {
  // Remember *which* URL failed, so a different URL is tried afresh.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (thumbnailUrl && failedUrl !== thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        loading={loading}
        decoding="async"
        onError={() => setFailedUrl(thumbnailUrl)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <CourseFallbackCover
      seed={seed}
      title={title}
      variant={variant}
      className={className}
    />
  );
};
