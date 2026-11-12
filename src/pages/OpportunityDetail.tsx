import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ExternalLink, MapPin } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { CourseFallbackCover } from "../components/course/CourseFallbackCover";
import { getOpportunity, isOpportunityNotFoundError } from "../services/opportunities";
import { formatDate } from "../utils/format";

export const OpportunityDetail = () => {
  const { id = "" } = useParams<{ id: string }>();

  const detailQuery = useQuery({
    queryKey: ["opportunities", "detail", id],
    queryFn: () => getOpportunity(id),
    enabled: !!id,
    retry: (failureCount, error) => !isOpportunityNotFoundError(error) && failureCount < 1,
  });

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    const missing = isOpportunityNotFoundError(detailQuery.error);
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-4xl px-4 py-8">
          <EmptyState
            title={missing ? "This opportunity is no longer available" : "We couldn't load this opportunity"}
            description={
              missing
                ? "It may have been removed, closed, or never published."
                : "Check your connection and try again."
            }
            action={
              <div className="flex items-center justify-center gap-4">
                {!missing && (
                  <button
                    type="button"
                    onClick={() => detailQuery.refetch()}
                    className="rounded-xl bg-blue-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-violet-400"
                  >
                    Try again
                  </button>
                )}
                <Link
                  to="/feed/opportunities"
                  className="text-sm font-semibold text-blue-violet-500 hover:text-blue-violet-400"
                >
                  Back to opportunities
                </Link>
              </div>
            }
          />
        </div>
      </PageShell>
    );
  }

  const opportunity = detailQuery.data;
  const secondaryActions = opportunity.actions.filter((action) => !action.is_primary);

  const actionPanel = (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <dl className="space-y-3 text-sm">
        {opportunity.organization_name && (
          <div>
            <dt className="font-semibold text-gray-500 dark:text-gray-400">Organization</dt>
            <dd className="text-gray-900 dark:text-white">{opportunity.organization_name}</dd>
          </div>
        )}
        {opportunity.location && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span className="text-gray-900 dark:text-white">{opportunity.location}</span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="text-gray-900 dark:text-white">
            {opportunity.application_deadline
              ? `Apply by ${formatDate(new Date(opportunity.application_deadline))}`
              : "No deadline listed"}
          </span>
        </div>
        {(opportunity.start_date || opportunity.end_date) && (
          <div>
            <dt className="font-semibold text-gray-500 dark:text-gray-400">Dates</dt>
            <dd className="text-gray-900 dark:text-white">
              {opportunity.start_date ? formatDate(new Date(opportunity.start_date)) : "—"}
              {opportunity.end_date ? ` – ${formatDate(new Date(opportunity.end_date))}` : ""}
            </dd>
          </div>
        )}
      </dl>

      {!opportunity.is_open && (
        <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          <p className="font-semibold">Closed</p>
          <p className="mt-0.5">
            {opportunity.closed_reason === "deadline_passed"
              ? "The application deadline has passed."
              : "This opportunity has been closed."}
          </p>
        </div>
      )}

      {opportunity.is_open && opportunity.primary_action && (
        <a
          href={opportunity.primary_action.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-violet-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-violet-400"
        >
          {opportunity.primary_action.label}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}

      {secondaryActions.length > 0 && (
        <div className="space-y-2">
          {secondaryActions.map((action) => (
            <a
              key={action.id}
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {action.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      )}

      {opportunity.actions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No action link provided.</p>
      )}

      {opportunity.is_open && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Applications and registration happen on the provider's website.
        </p>
      )}
    </div>
  );

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/feed/opportunities"
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-violet-500 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Back to Opportunities
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
          <div className="order-2 md:order-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-blue-violet-900 px-2.5 py-0.5 text-xs font-semibold text-blue-violet-500 dark:bg-blue-violet-100 dark:text-blue-violet-700">
                {opportunity.opportunity_type_label}
              </span>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
              {opportunity.title}
            </h1>

            {opportunity.cover_image && (
              <div className="mb-6 aspect-video overflow-hidden rounded-xl">
                <img
                  src={opportunity.cover_image.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="mb-6 md:hidden">{actionPanel}</div>

            <p className="mb-4 whitespace-pre-line text-gray-700 dark:text-gray-300">
              {opportunity.description || opportunity.short_description}
            </p>

            {opportunity.eligibility && (
              <div className="mb-4">
                <h2 className="mb-1.5 font-semibold text-gray-900 dark:text-white">Eligibility</h2>
                <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {opportunity.eligibility}
                </p>
              </div>
            )}

            {opportunity.requirements && (
              <div className="mb-4">
                <h2 className="mb-1.5 font-semibold text-gray-900 dark:text-white">Requirements</h2>
                <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {opportunity.requirements}
                </p>
              </div>
            )}

            {opportunity.contact_information && (
              <div className="mb-4">
                <h2 className="mb-1.5 font-semibold text-gray-900 dark:text-white">Contact</h2>
                <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {opportunity.contact_information}
                </p>
              </div>
            )}

            {opportunity.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {opportunity.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {!opportunity.cover_image && (
              <div className="mt-6 hidden aspect-video max-w-xs overflow-hidden rounded-xl sm:block">
                <CourseFallbackCover
                  seed={opportunity.uuid}
                  title={opportunity.title}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>

          <div className="order-1 hidden md:order-2 md:block">{actionPanel}</div>
        </div>
      </div>
    </PageShell>
  );
};
