// Opportunities (Round 8) — a public, read-only list of scholarships,
// internships, jobs, graduate programmes, competitions, hackathons,
// conferences/events, fellowships, grants, training, volunteering, student
// programmes and calls for applications. Not Feed posts — its own list, own
// search/filters. UniVybe processes no applications: every opportunity
// carries external links and the student just follows one. See
// docs/STUDENT_API_PAYLOADS.md §80-83, docs/OPPORTUNITIES_API.md and
// docs/STUDENT_FRONTEND_API_CHANGES.md Round 8.

import type { PageMeta } from "./index";

export interface OpportunityVocabEntry {
  value: string;
  label: string;
}

/** `GET /opportunities/types` — build filter/form vocabulary from this, never hard-code it. */
export interface OpportunityVocabulary {
  opportunity_types: OpportunityVocabEntry[];
  action_types: OpportunityVocabEntry[];
  cover_image_sources: OpportunityVocabEntry[];
  statuses: OpportunityVocabEntry[];
  max_actions: number;
  max_tags: number;
}

export interface OpportunityCoverImage {
  source: "cloudinary" | "external";
  url: string;
  /** Only set when `source` is `"cloudinary"`. */
  public_id: string | null;
}

/** `label` is already display-ready ("Apply on the Chevening portal", or the type's standard label). */
export interface OpportunityAction {
  id: number;
  /** One of `action_types[].value` (apply, register, learn_more, check_eligibility, submit_application, join, other). */
  type: string;
  label: string;
  url: string;
  is_primary: boolean;
}

/** `null` = open until an admin closes it (no deadline is a normal, not a broken, state). */
export type OpportunityClosedReason = "deadline_passed" | "manually_closed" | null;

/**
 * A scholarship/internship/job/etc. Every optional field below can genuinely
 * be `null` — an opportunity may be nothing but a title, a short description,
 * a type and one "Learn more" link. The list (`GET /opportunities`) omits the
 * long-text fields (`description`, `eligibility`, `requirements`,
 * `contact_information`); `GET /opportunities/{id}` adds them.
 */
export interface Opportunity {
  id: number;
  uuid: string;
  title: string;
  /** Always present, ≤500 chars. */
  short_description: string;
  opportunity_type: string;
  opportunity_type_label: string;
  /** Free text, distinct from a UniVybe `organization`. */
  organization_name: string | null;
  cover_image: OpportunityCoverImage | null;
  location: string | null;
  /** Plain calendar date (`"2026-12-04"`), not an instant — the opportunity's own dates, not what closes it. */
  start_date: string | null;
  end_date: string | null;
  /** ISO 8601 instant, or `null` = no deadline. The only date that closes anything. */
  application_deadline: string | null;
  status: "open" | "closed";
  is_open: boolean;
  closed_reason: OpportunityClosedReason;
  published_at: string;
  tags: string[];
  /** `null` when the opportunity has no links at all. */
  primary_action: OpportunityAction | null;
  actions: OpportunityAction[];
  updated_at: string;
  // Detail-only (absent on list items):
  description?: string | null;
  eligibility?: string | null;
  requirements?: string | null;
  contact_information?: string | null;
}

export interface OpportunityFilters {
  search?: string;
  /** Multi-select — matches any of the given types. */
  type?: string[];
  location?: string;
  /** All given tags must match. */
  tags?: string[];
  deadline_from?: string;
  deadline_to?: string;
  has_deadline?: boolean;
  status?: "open" | "closed";
  page?: number;
  per_page?: number;
}

export interface OpportunityList {
  data: Opportunity[];
  meta: PageMeta;
}
