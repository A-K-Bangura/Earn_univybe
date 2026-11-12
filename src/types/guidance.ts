// Student Help & Guidance (Round 13, 2026-11-10) — see docs/GUIDANCE_API.md.
// UniVybe only ever *provides a contact*: there is no chat, no message
// sending, no delivery/read tracking. A routing record means "this contact
// was handed to the student", nothing more.

/** The least academic detail a category needs from the student (`none` = none). */
export type GuidanceRequiredContext =
  | "none"
  | "university"
  | "faculty"
  | "department";

export interface GuidanceCategory {
  id: number;
  /** Non-null only on the four built-in categories (general_inquiries, missing_university, missing_faculty, missing_department). */
  key: string | null;
  slug: string;
  name: string;
  description: string | null;
  required_context: GuidanceRequiredContext;
}

export interface GuidanceContextItem {
  id: number;
  name: string;
}

export interface GuidanceContext {
  university: GuidanceContextItem | null;
  faculty: GuidanceContextItem | null;
  department: GuidanceContextItem | null;
}

export interface GuidanceOptions {
  /** Only active categories, in display order — render what you receive, never hard-code. */
  categories: GuidanceCategory[];
  /** From the student's profile; every part `null` before onboarding. */
  profile_context: GuidanceContext;
  question_max_length: number;
}

export type GuidanceContactType = "guide" | "central";
export type GuidanceSource = "general" | "onboarding";

export interface GuidanceRouting {
  id: string;
  routed_at: string;
  source: GuidanceSource;
  category: GuidanceCategory;
  context: GuidanceContext;
  contact_type: GuidanceContactType;
  is_central_fallback: boolean;
  /** Same category + context asked again within 10 minutes — nothing new recorded. */
  is_repeat: boolean;
}

export interface GuidanceContact {
  type: GuidanceContactType;
  /** The guide's name, or "UniVybe Support" for the central contact. */
  name: string;
  whatsapp: {
    number: string;
    /** `https://wa.me/<digits>?text=<encoded>` — open it exactly as given. */
    url: string;
  };
  /** Same text as `whatsapp.url`'s `text`, for building a custom button. */
  message: string;
}

export interface GuidanceResponse {
  routing: GuidanceRouting;
  contact: GuidanceContact;
  /** One-line reminder that nothing is sent for the student. */
  notice: string;
}

export interface GuidanceInquiryPayload {
  category_id: number;
  /** Omit all three to use the profile; send any of them and only what you send counts. */
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  question?: string;
}

/** Which onboarding link was clicked — selects the category server-side. */
export type OnboardingHelpIssue = "university" | "faculty" | "department";

export interface OnboardingHelpPayload {
  issue: OnboardingHelpIssue;
  /** Whatever the student has already chosen on the onboarding form. */
  university_id?: number;
  faculty_id?: number;
}
