import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Link2, Youtube, CheckCircle2 } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { ResourceUsagePanel } from "../components/resources/ResourceUsagePanel";
import { ResourceAccessDialog } from "../components/resources/ResourceAccessDialog";
import { getResource, getResourceVocabulary, isNotFoundError } from "../services/resources";
import { useResourceAccess } from "../hooks/useResourceAccess";
import { resolveFormatLabel } from "../utils/resourceFormat";
import { formatFileSize } from "../utils/format";
import { isAuthenticated } from "../services/auth";

export const ResourceDetail = () => {
  const { resourceId = "" } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const signedIn = isAuthenticated();

  const detailQuery = useQuery({
    queryKey: ["resources", "detail", resourceId, signedIn],
    queryFn: () => getResource(resourceId),
    enabled: !!resourceId,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });

  const { data: vocab } = useQuery({
    queryKey: ["resource-vocabulary"],
    queryFn: getResourceVocabulary,
    staleTime: 60 * 60 * 1000,
  });

  const { open, isAccessing, usageQuery, limitDetails, closeLimitDialog } =
    useResourceAccess();

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl px-4 py-8">
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
    const missing = isNotFoundError(detailQuery.error);
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <EmptyState
            title={
              missing
                ? "This resource is no longer available"
                : "We couldn't load this resource"
            }
            description={
              missing
                ? "It may have been removed or not yet approved."
                : "Check your connection and try again."
            }
            action={
              <div className="flex items-center justify-center gap-4">
                {!missing && (
                  <button
                    type="button"
                    onClick={() => detailQuery.refetch()}
                    className="rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
                  >
                    Try again
                  </button>
                )}
                <Link
                  to="/resources"
                  className="text-sm font-semibold text-azure-600 hover:text-azure-700 dark:text-azure-400"
                >
                  Back to resources
                </Link>
              </div>
            }
          />
        </div>
      </PageShell>
    );
  }

  const { resource } = detailQuery.data;
  const isPdf = resource.source_type === "file" && resource.format === "pdf";
  const isExternal = resource.source_type === "external";
  const isYoutube = resource.link_type?.startsWith("youtube");
  const Icon = isExternal ? (isYoutube ? Youtube : Link2) : FileText;
  const formatLabel = resolveFormatLabel(resource, vocab);

  const actionPanel = (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-azure-50 text-azure-600 dark:bg-azure-900/20 dark:text-azure-400">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {resource.resource_type_label} · {formatLabel}
          </p>
          {resource.accessed_today && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Opened today
            </p>
          )}
        </div>
      </div>

      {signedIn ? (
        <div className="space-y-2">
          {isExternal ? (
            <button
              type="button"
              onClick={() => open(resource, navigate)}
              disabled={isAccessing}
              className="w-full rounded-xl bg-azure-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAccessing ? "Opening…" : "Open link"}
            </button>
          ) : isPdf ? (
            <>
              <button
                type="button"
                onClick={() => open(resource, navigate, "inline")}
                disabled={isAccessing}
                className="w-full rounded-xl bg-azure-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAccessing ? "Opening…" : "Open PDF"}
              </button>
              <button
                type="button"
                onClick={() => open(resource, navigate, "attachment")}
                disabled={isAccessing}
                className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Download
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => open(resource, navigate, "attachment")}
              disabled={isAccessing}
              className="w-full rounded-xl bg-azure-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAccessing ? "Preparing download…" : "Download"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a student account to open or download this resource.
          </p>
          <Link
            to="/auth/signup"
            className="block w-full rounded-xl bg-azure-500 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-azure-600"
          >
            Sign Up
          </Link>
          <Link
            to={`/auth/login?redirect=${encodeURIComponent(`/resources/${resourceId}`)}`}
            className="block text-center text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Log in
          </Link>
        </div>
      )}

      {signedIn && (
        <ResourceUsagePanel usageQuery={usageQuery} compact />
      )}
    </div>
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/resources"
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-azure-500 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Back to Resources
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
          {/* Action panel appears first on mobile, right under the title area */}
          <div className="order-2 md:order-1">
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
              {resource.title}
            </h1>
            <div className="mb-6 md:hidden">{actionPanel}</div>

            {resource.description && (
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                {resource.description}
              </p>
            )}

            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {resource.author && (
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400">
                    Author
                  </dt>
                  <dd className="text-gray-900 dark:text-white">{resource.author}</dd>
                </div>
              )}
              {resource.subject && (
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400">
                    Subject
                  </dt>
                  <dd className="text-gray-900 dark:text-white">{resource.subject}</dd>
                </div>
              )}
              {resource.module && (
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400">
                    Module
                  </dt>
                  <dd className="text-gray-900 dark:text-white">{resource.module}</dd>
                </div>
              )}
              {resource.publication_year && (
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400">
                    Publication Year
                  </dt>
                  <dd className="text-gray-900 dark:text-white">
                    {resource.publication_year}
                  </dd>
                </div>
              )}
              {resource.source && (
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400">
                    Source
                  </dt>
                  <dd className="text-gray-900 dark:text-white">{resource.source}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-gray-500 dark:text-gray-400">
                  Uploaded by
                </dt>
                <dd className="text-gray-900 dark:text-white">{resource.uploaded_by}</dd>
              </div>
            </dl>

            {resource.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {resource.file && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
                <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  File information
                </h2>
                <dl className="space-y-1 text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between gap-4">
                    <dt>Filename</dt>
                    <dd className="truncate text-right">
                      {resource.file.original_filename}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Size</dt>
                    <dd>{formatFileSize(resource.file.size_bytes)}</dd>
                  </div>
                  {resource.file.version > 1 && (
                    <div className="flex justify-between gap-4">
                      <dt>Version</dt>
                      <dd>{resource.file.version}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          <div className="order-1 hidden md:order-2 md:block">{actionPanel}</div>
        </div>
      </div>

      <ResourceAccessDialog details={limitDetails} onClose={closeLimitDialog} />
    </PageShell>
  );
};
