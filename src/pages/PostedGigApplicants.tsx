import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { GigApplicantsTable } from "../components/gigs/GigApplicantsTable";
import { getGigApplicants, getPostedGig } from "../services/gigs";

export const PostedGigApplicants = () => {
  const { id = "" } = useParams<{ id: string }>();

  const gigQuery = useQuery({
    queryKey: ["posted-gig", id],
    queryFn: () => getPostedGig(id),
    enabled: !!id,
  });

  const applicantsQuery = useQuery({
    queryKey: ["gig-applicants", id, {}],
    queryFn: () => getGigApplicants(id),
    enabled: !!id,
  });

  const applicants = applicantsQuery.data?.data ?? [];

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-3xl px-4 py-8">
        <Link
          to={`/feed/gigs/posted/${id}`}
          className="mb-6 inline-block text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back to gig
        </Link>

        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {gigQuery.data ? `Interested in "${gigQuery.data.title}"` : "Interested students"}
          </h1>
          <button
            type="button"
            onClick={() => applicantsQuery.refetch()}
            className="text-sm font-semibold text-aquamarine-200 hover:text-aquamarine-300"
          >
            Refresh
          </button>
        </div>

        {applicantsQuery.isLoading || gigQuery.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : applicants.length === 0 ? (
          <EmptyState
            title="No one has shown interest yet"
            description="Share the gig or check back soon."
          />
        ) : gigQuery.data ? (
          <GigApplicantsTable
            gigId={id}
            applicants={applicants}
            permissions={gigQuery.data.permissions}
          />
        ) : null}
      </div>
    </PageShell>
  );
};
