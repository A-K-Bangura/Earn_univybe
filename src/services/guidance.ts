import api from "./api";
import type { ApiResponse } from "../types";
import type {
  GuidanceInquiryPayload,
  GuidanceOptions,
  GuidanceResponse,
  OnboardingHelpPayload,
} from "../types/guidance";

// GET /student/guidance/options — the Get Help form: categories + the
// student's own academic context to prefill it. Works even before onboarding
// is finished (a token straight after verify-otp is enough).
export const getGuidanceOptions = async (): Promise<GuidanceOptions> => {
  const response = await api.get<ApiResponse<GuidanceOptions>>(
    "/student/guidance/options"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch guidance options"
    );
  }

  return response.data.data;
};

// POST /student/guidance/inquiries — the general "Get help" inquiry.
export const submitGuidanceInquiry = async (
  payload: GuidanceInquiryPayload
): Promise<GuidanceResponse> => {
  const response = await api.post<ApiResponse<GuidanceResponse>>(
    "/student/guidance/inquiries",
    payload
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to submit guidance inquiry"
    );
  }

  return response.data.data;
};

// POST /student/guidance/onboarding-help — the "Can't find your
// university/faculty/department?" links. A short request-specific timeout
// (well under the shared client's 30s default) so a slow/hanging network
// never stalls the fallback this call must never block onboarding on — see
// docs/DECISIONS.md.
export const getOnboardingHelpContact = async (
  payload: OnboardingHelpPayload
): Promise<GuidanceResponse> => {
  const response = await api.post<ApiResponse<GuidanceResponse>>(
    "/student/guidance/onboarding-help",
    payload,
    { timeout: 6000 }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch onboarding help contact"
    );
  }

  return response.data.data;
};
