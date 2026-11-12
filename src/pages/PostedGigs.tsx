import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { getPostedGigs } from "../services/gigs";
import type { GigStatus } from "../types/gig";

const STATUS_LABELS: Record<GigStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  rejected: "Needs changes",
  published: "Published",
  closed: "Closed",
  unpublished: "Unpublished",
};

const STATUS_CLASSES: Record<GigStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  unpublished: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

export const PostedGigs = () => {
  const gigsQuery = useQuery({
    queryKey: ["posted-gigs", {}],
    queryFn: () => getPostedGigs(),
  });

  const gigs = gigsQuery.data?.data ?? [];

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">My posted gigs</h1>
            <p className="text-gray-600 dark:text-gray-400">Create, submit, and manage the gigs you've posted.</p>
          </div>
          <Link
            to="/feed/gigs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-aquamarine-500 px-4 py-2 text-sm font-semibold text-aquamarine-100 transition-colors hover:bg-aquamarine-400"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Post a gig
          </Link>
        </header>

        {gigsQuery.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <EmptyState
            title="You haven't posted any gigs yet"
            description="Post a small job and see who's interested."
            action={
              <Link
                to="/feed/gigs/new"
                className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
              >
                Post a gig
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {gigs.map((gig) => (
              <Link
                key={gig.id}
                to={`/feed/gigs/posted/${gig.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-aquamarine-300 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{gig.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{gig.price_label}</p>
                  {gig.status === "rejected" && gig.rejection_reason && (
                    <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                      {gig.rejection_reason}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[gig.status]}`}
                >
                  {STATUS_LABELS[gig.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};
