// Gigs (Round 9) — small jobs other students (and tutors/educators/
// contributors/admins) post for UniVybe students to take on: logo design, a
// web page, maths tutoring, event photography, proofreading, an errand.
// Browsing is public; "Interested" records an applicant and hands back the
// creator's WhatsApp/email — UniVybe is the notice board only, payment and
// conversation happen outside the platform. A student can also post gigs of
// their own. See docs/STUDENT_API_PAYLOADS.md §84-92, docs/GIGS_API.md and
// docs/STUDENT_FRONTEND_API_CHANGES.md Round 9.

import type { PageMeta } from "./index";

export type GigWorkMode = "remote" | "physical" | "hybrid";
export type GigPricingType = "fixed" | "negotiable";
export type GigCapacityType = "open" | "limited";
export type GigContactMethod = "whatsapp" | "email";
export type GigClosedReason =
  | "capacity_reached"
  | "deadline_passed"
  | "manually_closed"
  | null;
export type GigStatus =
  | "draft"
  | "pending_approval"
  | "rejected"
  | "published"
  | "closed"
  | "unpublished";

export interface GigVocabEntry {
  value: string;
  label: string;
}

/** `GET /gigs/options` — vocabularies, currency and limits for filters/forms. */
export interface GigOptions {
  pricing_types: GigVocabEntry[];
  work_modes: GigVocabEntry[];
  capacity_types: GigVocabEntry[];
  contact_methods: GigVocabEntry[];
  cover_image_sources: GigVocabEntry[];
  statuses: GigVocabEntry[];
  closed_reasons: GigVocabEntry[];
  currency: string;
  rating: { min: number; max: number; review_max_length: number };
  limits: { max_skills: number; max_tags: number; max_applicant_limit: number };
}

/** `GET /gigs/categories` — admin-managed, active only; use `slug` (or `id`) as the filter value. */
export interface GigCategoryOption {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

/** The lean category reference embedded on a gig itself. */
export interface GigCategoryRef {
  id: number;
  slug: string;
  name: string;
}

export interface GigCoverImage {
  source: "cloudinary" | "external";
  url: string;
  public_id: string | null;
}

export interface GigRatingSummary {
  average_rating: number | null;
  rating_count: number;
}

/** A student creator shows `university`+`gig_rating`; a creation-user creator shows `role`/`role_label`, no rating. */
export interface GigCreatorRef {
  type: "student" | "creation_user";
  id: string;
  name: string;
  avatar_url: string | null;
  university?: string | null;
  gig_rating?: GigRatingSummary | null;
  role?: string;
  role_label?: string;
}

/** Only present with a Bearer token; `null` for a guest. */
export interface GigViewerFlags {
  type: "student" | "creation_user";
  is_student: boolean;
  is_own_gig: boolean;
  has_expressed_interest: boolean;
  /** Authoritative for a signed-in student, even over the gig's public `is_accepting_interest`. */
  can_contact: boolean;
}

/** Detail-only, guest-safe summary of whether the Interested button should be enabled. */
export interface GigContactAction {
  available: boolean;
  requires_sign_in: boolean;
  student_only: boolean;
}

/**
 * A gig as returned by the public list/detail endpoints. `description`,
 * `requirements`, `address` and `contact_action` are detail-only (absent on
 * list items). `price_label`/`work_mode_label`/`pricing_type_label` are
 * already display-ready.
 */
export interface Gig {
  id: number;
  uuid: string;
  title: string;
  short_description: string;
  category: GigCategoryRef;
  pricing_type: GigPricingType;
  pricing_type_label: string;
  price_amount: number | null;
  price_max: number | null;
  currency: string;
  price_label: string;
  work_mode: GigWorkMode;
  work_mode_label: string;
  location: string | null;
  /** ISO 8601 instant, or `null` = no deadline. Distinct from `expected_*_date` below. */
  application_deadline: string | null;
  /** Plain calendar dates about the work itself, not what closes the gig. */
  expected_start_date: string | null;
  expected_completion_date: string | null;
  capacity_type: GigCapacityType;
  applicant_limit: number | null;
  applicant_count: number;
  /** `null` for open capacity. */
  spots_remaining: number | null;
  status: "open" | "closed";
  is_accepting_interest: boolean;
  closed_reason: GigClosedReason;
  published_at: string;
  skills: string[];
  tags: string[];
  cover_image: GigCoverImage | null;
  contact_methods: GigContactMethod[];
  contact_method: "whatsapp" | "email" | "both";
  creator: GigCreatorRef;
  viewer: GigViewerFlags | null;
  updated_at: string;
  // Detail-only:
  description?: string | null;
  requirements?: string | null;
  address?: string | null;
  contact_action?: GigContactAction;
}

export interface GigFilters {
  search?: string;
  /** Multi-select (slugs) — matches any. */
  category?: string[];
  /** Multi-select — matches any. */
  pricing_type?: GigPricingType[];
  /** Multi-select — matches any. */
  work_mode?: GigWorkMode[];
  location?: string;
  /** All given skills must match. */
  skills?: string[];
  /** All given tags must match. */
  tags?: string[];
  deadline_from?: string;
  deadline_to?: string;
  has_deadline?: boolean;
  status?: "open" | "closed";
  page?: number;
  per_page?: number;
}

export interface GigList {
  data: Gig[];
  meta: PageMeta;
}

export interface GigInterestContactMethod {
  number?: string;
  address?: string;
  url: string;
}

/** Contact details for *this* gig only — never the creator's account email/phone. Never cache this. */
export interface GigInterestContact {
  selected_method: GigContactMethod;
  message: string;
  whatsapp: { number: string; url: string } | null;
  email: { address: string; url: string } | null;
}

export interface GigInterestRecord {
  id: string;
  interested_at: string;
  last_contacted_at: string;
  contact_method: GigContactMethod;
  worked_with: boolean;
}

/** `POST /student/gigs/{gig}/interest` result. `201`→`newly_registered:true` the first time, `200` after. */
export interface GigInterestResult {
  interest: GigInterestRecord;
  newly_registered: boolean;
  contact: GigInterestContact;
  /** The refreshed gig (new `applicant_count`/`spots_remaining`/`is_accepting_interest`). */
  gig: Gig;
}

export interface GigReview {
  id: string;
  rating: number;
  review: string | null;
  direction: "creator_to_worker" | "worker_to_creator";
  as: "worker" | "creator";
  created_at: string;
  updated_at: string;
}

/** As embedded in `GET /student/gigs/interests`; distinguishes the review's authorship. */
export interface GigReviewWithReviewer extends GigReview {
  reviewer: {
    type: "student" | "creation_user";
    id: string;
    name: string;
    avatar_url: string | null;
    role?: string;
  };
  gig: { id: string | number; title: string };
}

/** A removed gig shrinks to just this. */
export interface UnavailableGigRef {
  id: number;
  title: string;
  availability: "unavailable";
}

export interface GigInterestListItem {
  id: string;
  gig: Gig;
  availability: "open" | "closed";
  interested_at: string;
  last_contacted_at: string;
  contact_method: GigContactMethod;
  worked_with: boolean;
  worked_with_at: string | null;
  rating_received: GigReview | null;
  rating_given: GigReview | null;
  can_rate_creator: boolean;
}

/** The removed-gig variant of a `GET /student/gigs/interests` row. */
export interface UnavailableGigInterestListItem {
  id: string;
  gig: UnavailableGigRef;
  availability: "unavailable";
  interested_at: string;
  last_contacted_at: string;
  contact_method: GigContactMethod;
  worked_with: boolean;
  worked_with_at: string | null;
  rating_received: GigReview | null;
  rating_given: GigReview | null;
  can_rate_creator: false;
}

export interface GigInterestList {
  data: Array<GigInterestListItem | UnavailableGigInterestListItem>;
  meta: PageMeta;
}

/** Additive `gig_reputation` field on `GET /student/profile` and `GET /student/students/{id}`. */
export interface GigReputation {
  average_rating: number | null;
  rating_count: number;
  reviews: GigReviewWithReviewer[];
}

export interface StudentGigReviews {
  student: { id: string; name: string; avatar_url: string | null };
  gig_rating: GigRatingSummary;
  reviews: GigReviewWithReviewer[];
}

export interface PostedGigPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_submit: boolean;
  can_manage_settings: boolean;
  can_close: boolean;
  can_reopen: boolean;
  can_view_applicants: boolean;
  can_rate_workers: boolean;
}

/**
 * The creator's own view of a gig they posted — public shape plus lifecycle
 * fields. Drive every management button from `permissions`, never infer
 * from `status` alone.
 */
export interface PostedGig extends Omit<Gig, "status"> {
  status: GigStatus;
  rejection_reason: string | null;
  contact: {
    method: "whatsapp" | "email" | "both" | null;
    whatsapp: string | null;
    email: string | null;
  };
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  closed_at: string | null;
  closed_by_role: string | null;
  creator_type: "student" | "creation_user";
  creator_id: string | number;
  creator_in_good_standing: boolean;
  /** Only present once the gig has been published at least once. */
  worked_with_count?: number;
  permissions: PostedGigPermissions;
  deleted_at: string | null;
  created_at: string;
}

export interface PostedGigList {
  data: PostedGig[];
  meta: PageMeta;
}

export interface PostGigPayload {
  title: string;
  short_description: string;
  category_id: number;
  pricing_type: GigPricingType;
  price_amount?: number;
  price_max?: number;
  work_mode: GigWorkMode;
  location?: string;
  address?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  description?: string;
  requirements?: string;
  /** A bare date (`"2026-12-31"`) means end of that day, Sierra Leone time. */
  application_deadline?: string | null;
  expected_start_date?: string | null;
  expected_completion_date?: string | null;
  capacity_type?: GigCapacityType;
  applicant_limit?: number | null;
  skills?: string[];
  tags?: string[];
  cover_image?:
    | { source: "cloudinary"; public_id: string }
    | { source: "external"; url: string }
    | null;
  /** `true` = also submit for admin review in the same request. */
  submit?: boolean;
}

export interface UpdateGigSettingsPayload {
  capacity_type?: GigCapacityType;
  applicant_limit?: number | null;
  application_deadline?: string | null;
}

export interface ReopenGigPayload {
  capacity_type?: GigCapacityType;
  applicant_limit?: number | null;
  application_deadline?: string | null;
  note?: string;
}

/** The public side of an applicant's profile — never email/phone/DOB/student number. */
export interface GigApplicantStudent {
  id: string;
  name: string;
  firstname?: string;
  lastname?: string;
  avatar_url: string | null;
  bio?: string | null;
  interests?: string[];
  level?: string | null;
  university?: { id: number; name: string; code?: string } | null;
  faculty?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  organization?: { id: number; name: string } | null;
  gig_rating?: GigRatingSummary;
}

/** `id` is the **interest UUID** — use it in mutation URLs. `student.id` is the student's own UUID, used only for the reviews endpoint. */
export interface GigApplicant {
  id: string;
  student: GigApplicantStudent;
  interested_at: string;
  last_contacted_at: string;
  contact_method: GigContactMethod;
  worked_with: boolean;
  worked_with_at: string | null;
  rating_given: GigReview | null;
  rating_received: GigReview | null;
}

export interface GigApplicantList {
  data: GigApplicant[];
  meta: PageMeta;
}
