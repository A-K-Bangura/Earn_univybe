import { useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCircle2, MapPin } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { CourseFallbackCover } from "../components/course/CourseFallbackCover";
import { GigContactSheet } from "../components/gigs/GigContactSheet";
import { RatingStars } from "../components/gigs/RatingStars";
import { getGig, isGigNotFoundError } from "../services/gigs";
import { isAuthenticated } from "../services/auth";
import { formatDate } from "../utils/format";

export const GigDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const signedIn = isAuthenticated();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justContacted, setJustContacted] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["gigs", "detail", id, signedIn],
    queryFn: () => getGig(id),
    enabled: !!id,
    retry: (failureCount, error) => !isGigNotFoundError(error) && failureCount < 1,
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
    const missing = isGigNotFoundError(detailQuery.error);
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-4xl px-4 py-8">
          <EmptyState
            title={missing ? "This gig is no longer available" : "We couldn't load this gig"}
            description={
              missing
                ? "It may have been removed, closed, or never approved."
                : "Check your connection and try again."
            }
            action={
              <div className="flex items-center justify-center gap-4">
                {!missing && (
                  <button
                    type="button"
                    onClick={() => detailQuery.refetch()}
                    className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
                  >
                    Try again
                  </button>
                )}
                <Link
                  to="/feed/gigs"
                  className="text-sm font-semibold text-aquamarine-200 hover:text-aquamarine-300"
                >
                  Back to gigs
                </Link>
              </div>
            }
          />
        </div>
      </PageShell>
    );
  }

  const gig = detailQuery.data;
  const viewer = gig.viewer;

  // Button-state matrix (design guide §8) — viewer.can_contact is
  // authoritative for a signed-in student even over public is_accepting_interest.
  let contactAction: ReactNode;
  if (!signedIn) {
    contactAction = gig.contact_action?.available ? (
      <Link
        to={`/auth/login?redirect=${encodeURIComponent(`/feed/gigs/${id}`)}`}
        className="flex w-full items-center justify-center rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400"
      >
        Sign in to express interest
      </Link>
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">No longer accepting interest.</p>
    );
  } else if (viewer && !viewer.is_student) {
    contactAction = (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Only students can express interest in gigs.
      </p>
    );
  } else if (viewer?.is_own_gig) {
    contactAction = (
      <Link
        to={`/feed/gigs/posted/${gig.id}`}
        className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        Manage your gig
      </Link>
    );
  } else if (viewer?.can_contact) {
    contactAction = (
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-aquamarine-500 px-5 py-3 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400"
      >
        {justContacted || viewer.has_expressed_interest ? (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Contact creator
          </>
        ) : (
          "Interested — contact creator"
        )}
      </button>
    );
  } else {
    contactAction = (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {gig.is_accepting_interest === false
          ? "No longer accepting interest."
          : "This account can't express interest right now."}
      </p>
    );
  }

  const actionPanel = (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{gig.price_label}</p>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-gray-500 dark:text-gray-400">Work mode</dt>
          <dd className="text-gray-900 dark:text-white">{gig.work_mode_label}</dd>
        </div>
        {gig.location && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span className="text-gray-900 dark:text-white">
              {gig.location}
              {gig.address ? ` — ${gig.address}` : ""}
            </span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="text-gray-900 dark:text-white">
            {gig.application_deadline
              ? `Apply by ${formatDate(new Date(gig.application_deadline))}`
              : "No deadline listed"}
          </span>
        </div>
        {(gig.expected_start_date || gig.expected_completion_date) && (
          <div>
            <dt className="font-semibold text-gray-500 dark:text-gray-400">Expected work dates</dt>
            <dd className="text-gray-900 dark:text-white">
              {gig.expected_start_date ? formatDate(new Date(gig.expected_start_date)) : "—"}
              {gig.expected_completion_date
                ? ` – ${formatDate(new Date(gig.expected_completion_date))}`
                : ""}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-700">
        {gig.creator.avatar_url ? (
          <img src={gig.creator.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {gig.creator.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{gig.creator.name}</p>
          {gig.creator.type === "student" ? (
            gig.creator.gig_rating?.rating_count ? (
              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <RatingStars value={gig.creator.gig_rating.average_rating} size="sm" />(
                {gig.creator.gig_rating.rating_count})
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">No ratings yet</span>
            )
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{gig.creator.role_label}</span>
          )}
        </div>
      </div>

      {contactAction}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Discuss the work and payment directly with the creator. UniVybe records interest;
        conversations and payments happen outside the platform.
      </p>
    </div>
  );

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/feed/gigs"
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-aquamarine-200 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Back to Gigs
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
          <div className="order-2 md:order-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-aquamarine-900 px-2.5 py-0.5 text-xs font-semibold text-aquamarine-200 dark:bg-aquamarine-100 dark:text-aquamarine-300">
                {gig.category.name}
              </span>
              {!gig.is_accepting_interest && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Closed
                </span>
              )}
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
              {gig.title}
            </h1>

            {gig.cover_image ? (
              <div className="mb-6 aspect-video overflow-hidden rounded-xl">
                <img src={gig.cover_image.url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="mb-6 hidden aspect-video max-w-xs overflow-hidden rounded-xl sm:block">
                <CourseFallbackCover seed={gig.uuid} title={gig.title} className="h-full w-full" />
              </div>
            )}

            <div className="mb-6 md:hidden">{actionPanel}</div>

            <p className="mb-4 whitespace-pre-line text-gray-700 dark:text-gray-300">
              {gig.description || gig.short_description}
            </p>

            {gig.requirements && (
              <div className="mb-4">
                <h2 className="mb-1.5 font-semibold text-gray-900 dark:text-white">Requirements</h2>
                <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {gig.requirements}
                </p>
              </div>
            )}

            {(gig.skills.length > 0 || gig.tags.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[...gig.skills, ...gig.tags].map((value) => (
                  <span
                    key={value}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {value}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="order-1 hidden md:order-2 md:block">{actionPanel}</div>
        </div>
      </div>

      <GigContactSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        gig={gig}
        onContacted={() => setJustContacted(true)}
      />
    </PageShell>
  );
};
