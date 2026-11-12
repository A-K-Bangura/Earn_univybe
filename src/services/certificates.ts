import type { AxiosError } from "axios";
import api from "./api";
import type { ApiResponse } from "../types";
import type { CertificateEligibility, EnrolledProgressPage } from "../types/certificate";
import { decodeEnrolledPage, decodeProgressPayload } from "../utils/certificates/enrolledPage";

/**
 * Certificates are generated in the browser from existing endpoints — there is
 * no certificate API. This module only reads:
 *   GET /student/courses/enrolled?page=N   (nested Laravel paginator)
 *   GET /student/courses/{course}/progress (single-course completion record)
 */

/** The course isn't available to this student any more (not enrolled, removed, or not theirs). */
export class CertificateUnavailableError extends Error {
  constructor() {
    super("This course isn't available in your enrolled courses.");
    this.name = "CertificateUnavailableError";
  }
}

/** The progress record contradicts itself and a second read did not resolve it. */
export class CertificateMismatchError extends Error {
  constructor() {
    super("We couldn't confirm this course's completion. Please try again later.");
    this.name = "CertificateMismatchError";
  }
}

/**
 * One page of the student's enrolled-course progress. The collection scans
 * pages incrementally because the docs don't offer a completed-only filter —
 * and none is invented here.
 */
export const getEnrolledProgressPage = async (page: number): Promise<EnrolledProgressPage> => {
  const response = await api.get<ApiResponse<unknown>>("/student/courses/enrolled", {
    params: { page },
  });
  if (!response.data.success || response.data.data === undefined) {
    throw new Error(response.data.message || "Failed to fetch enrolled courses");
  }
  return decodeEnrolledPage(response.data.data, page);
};

const readProgress = async (courseId: string): Promise<CertificateEligibility> => {
  let response;
  try {
    response = await api.get<ApiResponse<unknown>>(
      `/student/courses/${encodeURIComponent(courseId)}/progress`
    );
  } catch (error) {
    const status = (error as AxiosError).response?.status;
    if (status === 403 || status === 404) throw new CertificateUnavailableError();
    throw error;
  }
  if (!response.data.success || response.data.data === undefined) {
    throw new Error(response.data.message || "Failed to fetch course progress");
  }
  const decoded = decodeProgressPayload(response.data.data);
  if (!decoded) throw new Error("The course progress response was not in the expected format.");
  return decoded;
};

/**
 * The canonical completion check run before any preview or export. Eligibility
 * is the server's record, not a percentage, reward or route parameter. If the
 * record disagrees with itself it is re-read once; a second disagreement is
 * reported, never "resolved" locally.
 */
export const getCertificateEligibility = async (courseId: string): Promise<CertificateEligibility> => {
  const first = await readProgress(courseId);
  if (first.state !== "mismatch") return first;

  const second = await readProgress(courseId);
  if (second.state === "mismatch") throw new CertificateMismatchError();
  return second;
};
