import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { CertificateTile } from "../components/certificates/CertificateTile";
import { useCertificateAccount } from "../hooks/useCertificateArtifact";
import { useCertificateCollection } from "../hooks/useCertificateCollection";

const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-transparent px-5 font-semibold text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800";
const solidButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-azure-500 px-5 font-semibold text-white hover:bg-azure-400";

/**
 * Profile → Certificates → all. Completed courses are gathered page by page
 * from the enrolled-course list: "no certificates" is only said once every page
 * has been read, and a partial list is never labelled as the whole history.
 */
export const CertificatesPage = () => {
  const navigate = useNavigate();
  const accountId = useCertificateAccount();
  const collection = useCertificateCollection({ accountId, autoLoadUntil: 1, maxAutoPages: 3 });
  const { certificates } = collection;

  const loadMore = collection.hasMore && (
    <div className="mt-6 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={collection.loadMore}
        disabled={collection.isFetchingMore}
        className={outlineButton}
      >
        {collection.isFetchingMore ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking more courses…
          </>
        ) : (
          "Load more courses"
        )}
      </button>
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Showing certificates from the courses checked so far.
      </p>
    </div>
  );

  let body: React.ReactNode;
  if (collection.isLoading) {
    body = (
      <div role="status" aria-busy="true">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Checking your courses…</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  } else if (collection.loadError) {
    body = (
      <div
        role="alert"
        className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
      >
        <p className="font-semibold text-gray-900 dark:text-white">We couldn't load your certificates.</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Check your connection and try again.
        </p>
        <button type="button" onClick={collection.retry} className={`${solidButton} mt-4`}>
          Retry
        </button>
      </div>
    );
  } else if (certificates.length > 0) {
    body = (
      <>
        <h2 className="sr-only">Your certificates</h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <CertificateTile key={certificate.key} certificate={certificate} />
          ))}
        </ul>
        {collection.moreError && (
          <div role="alert" className="mt-6 text-center text-sm text-red-600 dark:text-red-400">
            We couldn't check more courses.{" "}
            <button
              type="button"
              onClick={collection.retry}
              className="bg-transparent p-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}
        {loadMore}
        {collection.exhausted && (
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Certificates are generated from your current course progress, so they're available for
            courses you're enrolled in.
          </p>
        )}
      </>
    );
  } else if (collection.exhausted) {
    body = (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your certificates will appear here when you complete a course
        </h2>
        <div className="own-links mt-5">
          <Link to="/courses" className={solidButton}>
            Browse courses
          </Link>
        </div>
      </div>
    );
  } else {
    // Nothing completed in the pages read so far — but more courses remain, so this is not "no certificates".
    body = (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold text-gray-900 dark:text-white">
          No completed courses in the courses checked so far.
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Your older courses may still be waiting on the next page.
        </p>
        {loadMore}
      </div>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="mb-4 inline-flex min-h-11 items-center gap-2 bg-transparent p-0 text-gray-600 transition-colors hover:text-azure-500 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back to profile
        </button>
        <h1 className="mb-1 text-3xl font-bold text-gray-900 dark:text-white">Your certificates</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">Celebrate what you've learned.</p>
        {body}
      </div>
    </PageShell>
  );
};
