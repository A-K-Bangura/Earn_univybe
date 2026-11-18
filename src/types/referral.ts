// Campus Ambassador & Referrals (Round 15) — docs/REFERRAL_AMBASSADOR_API.md.
// Tracking and reporting only: no commission, payout, Vybe Coin or XP is
// attached to a referral anywhere in this feature.

export interface ReferralValidation {
  valid: boolean;
  /** Canonical, upper-case form of the code — this is what to store/send, not what the student typed. */
  code: string | null;
  attribution_window_days: number;
}

/** `send-otp`'s `data.referral.status`. */
export type SendOtpReferralStatus = "none" | "locked" | "ignored";

/** `verify-otp`'s `data.referral.status`. */
export type VerifyOtpReferralStatus = "none" | "confirmed";

export interface AmbassadorStats {
  verified_registrations: number;
  completed_onboardings: number;
  activated_learners: number;
  /** Percentage, one decimal; `null` until there is a verified registration. */
  onboarding_conversion_rate: number | null;
  /** Percentage, one decimal; `null` until there is a verified registration. */
  learning_activation_rate: number | null;
}

export interface AmbassadorProfile {
  status: "active" | "inactive";
  /** `false` for a deactivated ambassador, or one whose own account is suspended/deleted — hide share/QR, keep code/numbers/history. */
  accepting_referrals: boolean;
  code: string;
  referral_link: string;
  appointed_at: string;
  stats: AmbassadorStats;
}

export interface ReferralHistoryItem {
  id: string;
  referred_at: string;
  /** `null` until the referred student finishes onboarding — show "New student". */
  first_name: string | null;
  university: { id: number; name: string } | null;
  onboarding_completed: boolean;
  learning_activated: boolean;
}
