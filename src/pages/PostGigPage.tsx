import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { PostGigForm } from "../components/gigs/PostGigForm";
import { getPostedGig } from "../services/gigs";

export const PostGigPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const gigQuery = useQuery({
    queryKey: ["posted-gig", id],
    queryFn: () => getPostedGig(id!),
    enabled: isEdit,
  });

  if (isEdit && gigQuery.isLoading) {
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-3xl px-4 py-8">
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </PageShell>
    );
  }

  if (isEdit && (!gigQuery.data || !gigQuery.data.permissions.can_edit)) {
    return (
      <PageShell>
        <div className="own-links mx-auto max-w-3xl px-4 py-8">
          <EmptyState
            title="This gig can't be edited right now"
            description="Only a draft or a rejected gig can be edited."
            action={
              <Link
                to="/feed/gigs/posted"
                className="rounded-xl bg-aquamarine-500 px-5 py-2.5 text-sm font-semibold text-aquamarine-100 hover:bg-aquamarine-400"
              >
                Back to my posted gigs
              </Link>
            }
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="own-links mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? "Edit gig" : "Post a gig"}
        </h1>
        <PostGigForm mode={isEdit ? "edit" : "create"} initial={isEdit ? gigQuery.data : undefined} />
      </div>
    </PageShell>
  );
};
