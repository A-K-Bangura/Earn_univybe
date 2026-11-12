import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { CourseFallbackCover } from "../course/CourseFallbackCover";
import { formatDate } from "../../utils/format";
import type { Opportunity } from "../../types/opportunity";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export const OpportunityCard = ({ opportunity }: OpportunityCardProps) => {
  const deadlineLabel = opportunity.application_deadline
    ? formatDate(new Date(opportunity.application_deadline))
    : "No deadline listed";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Mobile: a wide banner above everything else, only when a real cover
          exists — no fallback art here (the fallback is desktop-thumbnail only). */}
      {opportunity.cover_image && (
        <div className="block aspect-[2/1] w-full overflow-hidden sm:hidden">
          <img
            src={opportunity.cover_image.url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex gap-4 p-4 sm:p-5">
        <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl sm:block">
          {opportunity.cover_image ? (
            <img
              src={opportunity.cover_image.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <CourseFallbackCover
              seed={opportunity.uuid}
              title={opportunity.title}
              className="h-full w-full"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full bg-blue-violet-900 px-2.5 py-0.5 text-xs font-semibold text-blue-violet-500 dark:bg-blue-violet-100 dark:text-blue-violet-700">
              {opportunity.opportunity_type_label}
            </span>
            {!opportunity.is_open && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Closed
                {opportunity.closed_reason === "deadline_passed" && " — deadline passed"}
                {opportunity.closed_reason === "manually_closed" && ""}
              </span>
            )}
          </div>

          <h3 className="mb-1 line-clamp-2 text-base font-bold text-gray-900 dark:text-white">
            {opportunity.title}
          </h3>
          <p className="mb-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {opportunity.short_description}
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {opportunity.organization_name && <span>{opportunity.organization_name}</span>}
            {opportunity.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {opportunity.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {opportunity.application_deadline ? `Deadline: ${deadlineLabel}` : deadlineLabel}
            </span>
          </div>

          <Link
            to={`/feed/opportunities/${opportunity.uuid}`}
            className="inline-flex items-center rounded-lg bg-blue-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-violet-400"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
};
