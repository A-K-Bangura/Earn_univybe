import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type { ReferralValidation, ReferralHistoryItem } from "../types/referral";

// POST /referrals/validate — public, throttled per IP. Answers valid/not
// valid only; an unknown, malformed or deactivated code are indistinguishable
// and no ambassador identity is ever returned (docs/REFERRAL_AMBASSADOR_API.md).
export const validateReferralCode = async (
  code: string
): Promise<ReferralValidation> => {
  const response = await api.post<ApiResponse<ReferralValidation>>(
    "/referrals/validate",
    { code }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to check referral code");
  }

  return response.data.data;
};

type MetaEnvelope = { meta?: PageMeta };

// GET /student/ambassador/referrals — own limited referral history, newest
// first. Ambassadors only; 403 NOT_AN_AMBASSADOR otherwise.
export const getAmbassadorReferrals = async (
  page = 1,
  perPage = 15
): Promise<{ data: ReferralHistoryItem[]; meta: PageMeta }> => {
  const response = await api.get<
    ApiResponse<ReferralHistoryItem[]> & MetaEnvelope
  >(`/student/ambassador/referrals?page=${page}&per_page=${perPage}`);

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(
      response.data.message || "Failed to fetch referral history"
    );
  }

  return { data: response.data.data, meta: response.data.meta };
};
