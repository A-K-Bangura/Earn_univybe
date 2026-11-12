import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, MapPin } from "lucide-react";
import { CourseFallbackCover } from "../course/CourseFallbackCover";
import { RatingStars } from "./RatingStars";
import { formatDate } from "../../utils/format";
import type { Gig } from "../../types/gig";

interface GigCardProps {
  gig: Gig;
}

export const GigCard = ({ gig }: GigCardProps) => {
  const capacityLabel =
    gig.capacity_type === "open"
      ? "Open interest"
      : gig.spots_remaining !== null
        ? `${gig.spots_remaining} interest slot${gig.spots_remaining === 1 ? "" : "s"} left`
        : "Open interest";

  return (
    <div className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl sm:block">
        {gig.cover_image ? (
          <img src={gig.cover_image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <CourseFallbackCover seed={gig.uuid} title={gig.title} className="h-full w-full" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded-full bg-aquamarine-900 px-2.5 py-0.5 text-xs font-semibold text-aquamarine-200 dark:bg-aquamarine-100 dark:text-aquamarine-300">
            {gig.category.name}
          </span>
          {gig.viewer?.has_expressed_interest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Interested
            </span>
          )}
        </div>

        <h3 className="mb-1 line-clamp-2 text-base font-bold text-gray-900 dark:text-white">
          {gig.title}
        </h3>
        <p className="mb-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {gig.short_description}
        </p>

        <p className="mb-2 text-base font-bold text-gray-900 dark:text-white">{gig.price_label}</p>

        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{gig.work_mode_label}</span>
          {gig.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {gig.location}
            </span>
          )}
          {gig.application_deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Deadline: {formatDate(new Date(gig.application_deadline))}
            </span>
          )}
          <span>{capacityLabel}</span>
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {gig.creator.avatar_url ? (
            <img src={gig.creator.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {gig.creator.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span>{gig.creator.name}</span>
          {gig.creator.type === "student" ? (
            gig.creator.gig_rating?.rating_count ? (
              <span className="inline-flex items-center gap-1">
                <RatingStars value={gig.creator.gig_rating.average_rating} size="sm" />(
                {gig.creator.gig_rating.rating_count})
              </span>
            ) : (
              <span>No ratings yet</span>
            )
          ) : (
            <span>{gig.creator.role_label}</span>
          )}
        </div>

        <Link
          to={`/feed/gigs/${gig.uuid}`}
          className="inline-flex items-center rounded-lg bg-aquamarine-500 px-4 py-2 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400"
        >
          View gig
        </Link>
      </div>
    </div>
  );
};
