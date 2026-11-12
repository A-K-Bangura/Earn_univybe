import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useCertificateAccount } from "../../hooks/useCertificateArtifact";
import { useCertificateCollection } from "../../hooks/useCertificateCollection";
import { CertificateTile } from "./CertificateTile";

const PREVIEW_COUNT = 3;

/**
 * Profile → Certificates. A compact preview of up to three certificates and
 * "View all". It deliberately never shows a total or "Recent completions": it
 * may stop before every enrolled-course page has been inspected.
 */
export const CertificatesProfileSection = () => {
  const accountId = useCertificateAccount();
  const collection = useCertificateCollection({
    accountId,
    autoLoadUntil: PREVIEW_COUNT,
    maxAutoPages: 3,
  });
  const shown = collection.certificates.slice(0, PREVIEW_COUNT);

  return (
    <section
      aria-labelledby="profile-certificates-heading"
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="profile-certificates-heading"
          className="text-xl font-bold text-gray-900 dark:text-white"
        >
          Certificates
        </h2>
        <Link
          to="/profile/certificates"
          className="own-links inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-azure-600 dark:text-azure-400"
        >
          View all
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {collection.isLoading || (shown.length === 0 && collection.isFetchingMore) ? (
        <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
          Checking your courses…
        </p>
      ) : collection.loadError ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>We couldn't load your certificates.</p>
          <button
            type="button"
            onClick={collection.retry}
            className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-transparent px-4 font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            Retry
          </button>
        </div>
      ) : shown.length > 0 ? (
        <>
          <h3 className="sr-only">Your certificates</h3>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {shown.map((certificate) => (
              <CertificateTile key={certificate.key} certificate={certificate} />
            ))}
          </ul>
        </>
      ) : collection.exhausted ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your certificates will appear here when you complete a course.{" "}
          <Link to="/courses" className="own-links font-semibold text-azure-600 dark:text-azure-400">
            Browse courses
          </Link>
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We haven't found a completed course in the courses checked so far.{" "}
          <Link to="/profile/certificates" className="own-links font-semibold text-azure-600 dark:text-azure-400">
            Check more courses
          </Link>
        </p>
      )}
    </section>
  );
};
