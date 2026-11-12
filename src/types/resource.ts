// Resources (Round 7) — an academic resource library (lecture notes, slides,
// books, past questions, external links) students browse independently of
// courses, with a daily free-access allowance and purchasable access packs
// (Monime checkout, same mechanism as paid courses/coins). See
// docs/STUDENT_API_PAYLOADS.md §73-79 and
// docs/STUDENT_FRONTEND_API_CHANGES.md Round 7.

import type { PageMeta } from "./index";

export type ResourceSourceType = "file" | "external";

export interface ResourceVocabEntry {
  value: string;
  label: string;
  /** Only present on `file_formats` entries. */
  mime_type?: string;
}

/** `GET /resources/types` — shared with the tutor/admin portals, no `/student` prefix. */
export interface ResourceVocabulary {
  resource_types: ResourceVocabEntry[];
  link_types: ResourceVocabEntry[];
  source_types: ResourceVocabEntry[];
  file_formats: ResourceVocabEntry[];
  max_file_size_bytes: number;
  max_tags: number;
}

/** A `null` dimension means "general/open" — it never restricts who can open the resource, only ordering/filtering. */
export interface ResourceAcademicContext {
  university_id: number | null;
  faculty_id: number | null;
  department_id: number | null;
  organization_id: number | null;
  /** Academic year, e.g. "200", "UnderGrad". */
  level: string | null;
  semester: string | null;
  university: { id: number; name: string } | null;
  faculty: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
  organization: { id: number; name: string } | null;
}

/** Present only when `source_type === "file"`. No storage location in it — see ResourceAccessFile for that. */
export interface ResourceFile {
  original_filename: string;
  format: string;
  size_bytes: number;
  version: number;
  uploaded_at: string;
}

export interface Resource {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  source_type: ResourceSourceType;
  resource_type: string;
  resource_type_label: string;
  /** A file format (`pdf`, `pptx`, ...) or a link type (`youtube_playlist`, ...) — independent of `resource_type`. */
  format: string;
  /** Only set for `source_type: "external"`; `format` mirrors it then. */
  link_type: string | null;
  author: string | null;
  subject: string | null;
  module: string | null;
  /** Free-text source description (not a URL — discovery never exposes the real link). */
  source: string | null;
  publication_year: number | null;
  tags: string[];
  academic_context: ResourceAcademicContext;
  file?: ResourceFile;
  /** Display name only. */
  uploaded_by: string;
  /** Signed-in student only — higher = closer to their profile; never shown to students directly. */
  relevance_score?: number;
  /** Signed-in student only — already opened today, so opening again is free. */
  accessed_today?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourcePackOffer {
  accesses: number;
  /** Major units (Leones). */
  price: number;
  currency: string;
}

/** The single piece of allowance state shared by every surface — list, detail, the access call, the 402, and the purchase calls. */
export interface ResourceUsage {
  /** The Sierra Leone business day (Africa/Freetown), not the device's. */
  date: string;
  timezone: string;
  /** ISO-8601 UTC — when the free allowance resets. Never compute this from the device clock. */
  resets_at: string;
  free_daily_allowance: number;
  free_used: number;
  free_remaining: number;
  /** Carries over day to day, unlike the free allowance. */
  purchased_remaining: number;
  total_remaining: number;
  resources_accessed_today: number;
  can_access_new_resource: boolean;
  /** Ready-made text, e.g. "2 of 3 free resources used today". */
  summary: string;
  /** `null` while no admin has set an access pack yet — hide the buy button. */
  pack_offer: ResourcePackOffer | null;
}

export interface ResourceAccessFile {
  type: "file";
  /** Temporary signed URL, ~20 min — navigate immediately, never cache/store/log/share. */
  url: string;
  expires_at: string;
  disposition: "inline" | "attachment";
  filename: string;
  format: string;
  size_bytes: number;
  version: number;
}

export interface ResourceAccessExternal {
  type: "external";
  url: string;
  link_type: string;
}

export interface ResourceAccessResult {
  resource: { id: number; uuid: string; title: string };
  access: ResourceAccessFile | ResourceAccessExternal;
  /** `true` = this call used an access; `false` = already opened today, usage unchanged. */
  counted: boolean;
  usage: ResourceUsage;
}

/** The 402 RESOURCE_ACCESS_LIMIT_REACHED error's `error.details` shape. */
export interface ResourceAccessLimitDetails {
  usage: ResourceUsage;
  purchase_available: boolean;
}

export type ResourcePurchaseStatus =
  | "pending"
  | "succeeded"
  | "cancelled"
  | "expired"
  | "failed";

export interface ResourcePurchase {
  id: string;
  status: ResourcePurchaseStatus;
  /** Only meaningful while `status === "pending"`. */
  state?: "payment_pending" | "payment_processing";
  /** Snapshotted at checkout creation — a later admin price/pack change never alters an open checkout. */
  accesses: number;
  amount: number;
  currency: string;
  /** Present only while the checkout can still be continued. */
  checkout_url?: string;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

export type ResourceSort = "relevance" | "newest" | "title";

export interface ResourceFilters {
  search?: string;
  resource_type?: string;
  source_type?: ResourceSourceType;
  format?: string;
  subject?: string;
  module?: string;
  tags?: string[];
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  organization_id?: number;
  level?: string;
  semester?: string;
  publication_year?: number;
  course_id?: number;
  sort?: ResourceSort;
  page?: number;
  per_page?: number;
}

export interface ResourceList {
  data: Resource[];
  meta: PageMeta;
}

export interface ResourceDetail {
  resource: Resource;
  /** `null` for a guest. */
  usage: ResourceUsage | null;
}

/** Whole ordered list, no pagination — the creator's order is preserved. */
export interface CourseResourcesResult {
  resources: Resource[];
  usage: ResourceUsage | null;
}

export interface ResourcePurchaseList {
  data: ResourcePurchase[];
  meta: PageMeta;
}
