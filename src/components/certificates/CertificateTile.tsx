import { Link } from "react-router-dom";
import type { CertificateCandidate } from "../../types/certificate";
import { completionDateLabel } from "../../utils/certificates/data";
import { CertificateGlyph } from "./CertificateGlyph";

/** One completed course in a certificate list: full title (never truncated), recorded date, and the way in. */
export const CertificateTile = ({ certificate }: { certificate: CertificateCandidate }) => {
  const date = completionDateLabel(certificate.completedAt);
  return (
    <li className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <CertificateGlyph className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-gray-900 dark:text-white">
            {certificate.title}
          </h3>
          {date && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{date}</p>
          )}
        </div>
      </div>
      {/* `own-links`: keep the button's white text (global link colour would override it). */}
      <div className="own-links mt-4">
        <Link
          to={`/profile/certificates/${encodeURIComponent(certificate.routeId)}`}
          aria-label={`View certificate for ${certificate.title}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-azure-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-500"
        >
          View certificate
        </Link>
      </div>
    </li>
  );
};
