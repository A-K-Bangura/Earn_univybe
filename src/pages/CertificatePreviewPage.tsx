import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { CertificateActions } from "../components/certificates/CertificateActions";
import { CertificatePreview } from "../components/certificates/CertificatePreview";
import { FormatToggle } from "../components/certificates/FormatToggle";
import { useCertificateAccount, useCertificateArtifact } from "../hooks/useCertificateArtifact";
import { CERTIFICATES_QUERY_KEY } from "../hooks/useCertificateCollection";
import {
  CertificateMismatchError,
  CertificateUnavailableError,
  getCertificateEligibility,
} from "../services/certificates";
import { getUserProfile } from "../services/profile";
import type { CertificateFormat } from "../types/certificate";
import {
  FORMAT_LABELS,
  MAX_DISPLAY_NAME_LENGTH,
  nameErrorMessage,
  normalizeCertificateData,
  pickProfileName,
  validateDisplayName,
} from "../utils/certificates/data";

const NAME_INPUT_ID = "certificate-display-name";

const Notice = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div
    role="status"
    className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <div className="text-gray-700 dark:text-gray-300">{children}</div>
    {action && <div className="own-links mt-4 flex flex-wrap justify-center gap-3">{action}</div>}
  </div>
);

const linkButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-azure-500 px-5 font-semibold text-white hover:bg-azure-400";

/**
 * Protected certificate preview. Reaching it by URL proves nothing: the
 * student's own server progress is read here and decides whether anything can
 * be previewed or exported.
 */
export const CertificatePreviewPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const accountId = useCertificateAccount();

  const [format, setFormat] = useState<CertificateFormat>("landscape");
  // `null` = "use the profile name". Lives only for this page visit (V1).
  const [customName, setCustomName] = useState<string | null>(null);

  // Own, account-scoped query keys: the app's shared "user-profile" cache isn't
  // scoped per account, and this page prints a name.
  const profile = useQuery({
    queryKey: [CERTIFICATES_QUERY_KEY, "profile", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const student = await getUserProfile();
      return { id: String(student.id), name: pickProfileName(student) };
    },
    staleTime: 60_000,
  });

  const eligibility = useQuery({
    queryKey: [CERTIFICATES_QUERY_KEY, "eligibility", accountId, courseId],
    enabled: !!accountId && !!courseId,
    queryFn: () => getCertificateEligibility(courseId!),
    retry: (count, error) =>
      !(error instanceof CertificateUnavailableError || error instanceof CertificateMismatchError) && count < 1,
    // Always a fresh server read before an export.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const profileName = profile.data?.name ?? "";
  const nameInput = customName ?? profileName;
  const nameCheck = validateDisplayName(nameInput);
  const validName = nameCheck.ok ? nameCheck.name : null;

  const studentId = profile.data?.id;
  const completed = eligibility.data?.state === "complete";
  const courseTitle = eligibility.data?.courseTitle;
  const completedAt = eligibility.data?.completedAt ?? null;

  const data = useMemo(
    () =>
      completed && studentId !== undefined && validName && courseId
        ? normalizeCertificateData({
            studentId,
            courseId,
            courseTitle,
            profileName,
            displayName: validName,
            completedAt,
          })
        : null,
    [completed, studentId, validName, courseId, courseTitle, profileName, completedAt]
  );

  const artifact = useCertificateArtifact({ accountId, data, format });

  const goBack = () => {
    // `key === "default"` means this was the first entry (direct link): there is nothing to go back to.
    if (location.key !== "default") navigate(-1);
    else navigate("/profile/certificates");
  };

  // Signed out (e.g. in another tab): protected routes shouldn't linger.
  if (!accountId) return <Navigate to="/auth/login" replace />;

  const header = (
    <div className="mb-6">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex min-h-11 items-center gap-2 bg-transparent p-0 text-gray-600 transition-colors hover:text-azure-500 dark:text-gray-400"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your certificate</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">Celebrate what you've learned.</p>
    </div>
  );

  let body: React.ReactNode;

  if (eligibility.isPending || profile.isPending) {
    body = (
      <div role="status" aria-busy="true" aria-live="polite">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Verifying your course completion…</p>
        <div className="aspect-[2400/1697] w-full max-w-3xl animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  } else if (eligibility.error instanceof CertificateUnavailableError) {
    body = (
      <Notice
        action={
          <Link to="/courses/enrolled" className={linkButton}>
            Back to my courses
          </Link>
        }
      >
        <p className="font-semibold">This certificate isn't available.</p>
        <p className="mt-1 text-sm">{eligibility.error.message}</p>
      </Notice>
    );
  } else if (eligibility.error instanceof CertificateMismatchError) {
    body = (
      <Notice
        action={
          <button type="button" onClick={() => void eligibility.refetch()} className={linkButton}>
            Try again
          </button>
        }
      >
        <p className="font-semibold">We couldn't confirm your completion yet.</p>
        <p className="mt-1 text-sm">{eligibility.error.message}</p>
      </Notice>
    );
  } else if (eligibility.isError || profile.isError) {
    body = (
      <Notice
        action={
          <button
            type="button"
            onClick={() => {
              void eligibility.refetch();
              void profile.refetch();
            }}
            className={linkButton}
          >
            Retry
          </button>
        }
      >
        <p className="font-semibold">We couldn't load your certificate.</p>
        <p className="mt-1 text-sm">Check your connection and try again. Nothing has changed on your account.</p>
      </Notice>
    );
  } else if (eligibility.data.state !== "complete") {
    body = (
      <Notice
        action={
          <Link to={`/course/${courseId}`} className={linkButton}>
            Back to the course
          </Link>
        }
      >
        <p className="font-semibold">Certificates are available once you complete a course.</p>
        <p className="mt-1 text-sm">Finish the remaining lessons and this certificate will unlock.</p>
      </Notice>
    );
  } else if (!eligibility.data.courseTitle) {
    body = (
      <Notice
        action={
          <button type="button" onClick={() => void eligibility.refetch()} className={linkButton}>
            Retry
          </button>
        }
      >
        <p className="font-semibold">We couldn't read this course's title.</p>
        <p className="mt-1 text-sm">Please try again in a moment.</p>
      </Notice>
    );
  } else {
    const showReset = customName !== null && customName !== profileName;
    const nameError = !nameCheck.ok ? nameErrorMessage(nameCheck.reason) : null;
    const helperId = `${NAME_INPUT_ID}-help`;

    body = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section
          aria-label="Format and name"
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-start-2 lg:row-start-1 dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Format</p>
            <FormatToggle value={format} onChange={setFormat} />
          </div>

          <div>
            <label
              htmlFor={NAME_INPUT_ID}
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Name on certificate
            </label>
            <input
              id={NAME_INPUT_ID}
              type="text"
              value={nameInput}
              onChange={(event) => setCustomName(event.target.value)}
              autoComplete="off"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={helperId}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-azure-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p id={helperId} className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              This changes the name on this certificate only. It doesn't update your profile, and
              next time it starts from your profile name. Up to {MAX_DISPLAY_NAME_LENGTH} characters.
            </p>
            {nameError && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {nameError}
              </p>
            )}
            {showReset && (
              <button
                type="button"
                onClick={() => setCustomName(null)}
                className="mt-2 inline-flex min-h-11 items-center gap-2 bg-transparent p-0 text-sm font-semibold text-azure-600 hover:underline dark:text-azure-400"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {profileName ? "Reset to profile name" : "Clear name"}
              </button>
            )}
          </div>
        </section>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {data ? (
            <CertificatePreview
              data={data}
              format={format}
              status={artifact.status}
              image={artifact.image}
              error={artifact.error}
              onRetry={artifact.retry}
            />
          ) : (
            <div className="rounded-xl bg-slate-100 p-6 text-center text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              {nameError ?? "Add the name you'd like on your certificate to see the preview."}
            </div>
          )}
        </div>

        <section aria-label="Export" className="space-y-5 lg:col-start-2 lg:row-start-2">
          <CertificateActions
            data={data}
            format={format}
            status={data ? artifact.status : "idle"}
            image={artifact.image}
            preparePdf={artifact.preparePdf}
          />

          {data && (
            <dl className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
              <dt className="font-semibold text-gray-700 dark:text-gray-300">Awarded to</dt>
              <dd className="mb-2 break-words text-gray-900 dark:text-white">{data.displayName}</dd>
              <dt className="font-semibold text-gray-700 dark:text-gray-300">Course</dt>
              <dd className="mb-2 break-words text-gray-900 dark:text-white">{data.courseTitle}</dd>
              {data.completionDateLabel && (
                <>
                  <dt className="font-semibold text-gray-700 dark:text-gray-300">Completion</dt>
                  <dd className="mb-2 text-gray-900 dark:text-white">
                    {data.completionDateLabel.replace(/^Completed /, "")}
                  </dd>
                </>
              )}
              <dt className="font-semibold text-gray-700 dark:text-gray-300">Format</dt>
              <dd className="text-gray-900 dark:text-white">{FORMAT_LABELS[format]}</dd>
            </dl>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            A celebration of your learning on UniVybe. It is generated on your device from your course
            progress, and isn't an accredited qualification.
          </p>
        </section>
      </div>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {header}
        {body}
      </div>
    </PageShell>
  );
};
