import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, Loader2 } from "lucide-react";
import { useCertificateAccount } from "../../hooks/useCertificateArtifact";
import { CERTIFICATES_QUERY_KEY } from "../../hooks/useCertificateCollection";
import { getCertificateEligibility } from "../../services/certificates";

interface CertificateCelebrationActionProps {
  courseId: string;
  /** The completion POST said this course just finished: a "not complete" read then needs Retry, not silence. */
  expectedComplete: boolean;
}

const base =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold";

/**
 * "View certificate" for the course-completion celebration. It only appears
 * after the student's own server progress confirms completion — the
 * celebration's coin/XP fields and the local `course_completed` flag don't
 * unlock it — and never downloads, shares or opens a tab by itself.
 */
export const CertificateCelebrationAction = ({ courseId, expectedComplete }: CertificateCelebrationActionProps) => {
  const accountId = useCertificateAccount();
  const eligibility = useQuery({
    queryKey: [CERTIFICATES_QUERY_KEY, "eligibility", accountId, courseId],
    enabled: !!accountId,
    queryFn: () => getCertificateEligibility(courseId),
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });

  if (!accountId) return null;

  if (eligibility.isPending) {
    return (
      <p
        role="status"
        aria-live="polite"
        className={`${base} cursor-wait bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300`}
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Preparing your certificate…
      </p>
    );
  }

  const confirmed = eligibility.data?.state === "complete";
  if (confirmed) {
    return (
      <div className="own-links">
        <Link
          to={`/profile/certificates/${encodeURIComponent(courseId)}`}
          className={`${base} border-2 border-blue-violet-500 bg-white text-blue-violet-400 hover:bg-blue-violet-900 dark:bg-transparent dark:text-blue-violet-700 dark:hover:bg-blue-violet-100`}
        >
          <Award className="h-5 w-5" aria-hidden="true" />
          View certificate
        </Link>
      </div>
    );
  }

  // Not confirmed. A normal "not finished yet" read stays quiet; a failed or contradictory read offers Retry.
  if (eligibility.isError || expectedComplete) {
    return (
      <div role="alert" className="text-center text-sm text-gray-600 dark:text-gray-300">
        <p>We couldn't confirm your certificate just yet.</p>
        <button
          type="button"
          onClick={() => void eligibility.refetch()}
          disabled={eligibility.isFetching}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-transparent px-5 font-semibold text-gray-800 dark:border-gray-600 dark:text-gray-100"
        >
          {eligibility.isFetching ? "Checking…" : "Retry certificate"}
        </button>
      </div>
    );
  }
  return null;
};
