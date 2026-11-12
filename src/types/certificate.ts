/** The two exportable compositions. V1 has exactly one design for each. */
export type CertificateFormat = "landscape" | "story";

export const CERTIFICATE_TEMPLATE_VERSION = "v1" as const;

/**
 * The single normalized input both renderers draw from, so the preview and
 * every export always show the same name, course and date.
 *
 * `studentId` and `courseId` are private lookup/caching context: they are never
 * drawn onto an artifact and never put in a filename.
 */
export interface CertificateData {
  studentId: string;
  courseId: string;
  courseTitle: string;
  profileName: string;
  displayName: string;
  /** The API timestamp, unchanged. Never substituted with "today". */
  completedAt: string | null;
  /** e.g. "Completed 9 October 2026" (Africa/Freetown), or null when no usable date was recorded. */
  completionDateLabel: string | null;
  templateVersion: typeof CERTIFICATE_TEMPLATE_VERSION;
}

/**
 * What the server's progress record says about completion.
 * - `complete`: the server recorded this course as finished.
 * - `incomplete`: it did not.
 * - `mismatch`: the record contradicts itself (e.g. `is_completed: false` yet a
 *   `completed_at`). Never treated as eligible.
 */
export type CompletionState = "complete" | "incomplete" | "mismatch";

/** A verified read of one course's progress, via `GET /student/courses/{course}/progress`. */
export interface CertificateEligibility {
  state: CompletionState;
  courseTitle: string | null;
  completedAt: string | null;
}

/** One enrolled-course progress record, reduced to what the certificate list needs. */
export interface CertificateCandidate {
  /** Stable course identity used to de-duplicate (uuid, else numeric id). */
  key: string;
  /** What goes in the `/profile/certificates/:courseId` URL. */
  routeId: string;
  title: string;
  completedAt: string | null;
  state: CompletionState;
}

/** A page of the enrolled-course list, decoded from whichever paginator shape the API sent. */
export interface EnrolledProgressPage {
  page: number;
  records: CertificateCandidate[];
  /**
   * Whether a later page exists. `true`/`false` when the response said so;
   * `null` when it carried no pagination information at all.
   */
  hasMore: boolean | null;
  perPage: number | null;
  total: number | null;
}

/** The artifact the UI and share/download actions operate on. */
export interface PreparedCertificateImage {
  url: string;
  file: File;
  width: number;
  height: number;
  filename: string;
}
