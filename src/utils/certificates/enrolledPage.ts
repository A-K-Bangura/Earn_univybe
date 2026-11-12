import type {
  CertificateCandidate,
  CertificateEligibility,
  EnrolledProgressPage,
} from "../../types/certificate";
import { evaluateCompletion, usableCompletedAt } from "./data";

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/**
 * `GET /student/courses/enrolled` returns a *nested* Laravel paginator at
 * `data` (records at `data.data[]`), unlike the flat `data[] + meta` of gigs and
 * resources. Some endpoints/proxies flatten it, so this also accepts the flat
 * shape and a bare array rather than assume one.
 */
const splitPaginator = (payload: unknown): { records: unknown[]; meta: Obj; links: Obj } => {
  if (Array.isArray(payload)) return { records: payload, meta: {}, links: {} };
  if (!isObject(payload)) return { records: [], meta: {}, links: {} };

  const records = Array.isArray(payload.data) ? payload.data : [];
  // Nested paginator keeps its counters beside `data`; flat style keeps them in `meta`.
  const meta = isObject(payload.meta) ? { ...payload, ...payload.meta } : payload;
  const links = isObject(payload.links) ? payload.links : {};
  return { records, meta, links };
};

/** Whether a later page exists, from whatever pagination hints the response carried; null if none. */
const resolveHasMore = (meta: Obj, links: Obj, currentPage: number, itemCount: number): boolean | null => {
  if ("next_page_url" in meta && (meta.next_page_url === null || typeof meta.next_page_url === "string")) {
    return meta.next_page_url !== null;
  }
  if ("next" in links && (links.next === null || typeof links.next === "string")) {
    return links.next !== null;
  }
  const lastPage = asNumber(meta.last_page);
  if (lastPage !== null) return currentPage < lastPage;

  const total = asNumber(meta.total);
  const perPage = asNumber(meta.per_page);
  if (total !== null && perPage !== null && perPage > 0) return currentPage * perPage < total;

  // The documented example only shows current_page/data/per_page/total, so a
  // response without any of the above is possible; the caller keeps going until
  // a page comes back empty instead of assuming this was the last one.
  return itemCount === 0 ? false : null;
};

const toCandidate = (record: unknown): CertificateCandidate | null => {
  if (!isObject(record) || !isObject(record.course)) return null;
  const course = record.course;
  const title = typeof course.title === "string" ? course.title.trim() : "";
  const uuid = typeof course.uuid === "string" && course.uuid ? course.uuid : null;
  const numericId = asNumber(course.id);
  const identity = uuid ?? (numericId !== null ? String(numericId) : null);
  if (!title || !identity) return null;

  return {
    key: identity,
    routeId: identity,
    title,
    completedAt: usableCompletedAt(record.completed_at),
    state: evaluateCompletion(record),
  };
};

/** Decodes one page of the enrolled-course progress list. Skips malformed records instead of failing the page. */
export const decodeEnrolledPage = (payload: unknown, requestedPage: number): EnrolledProgressPage => {
  const { records, meta, links } = splitPaginator(payload);
  const currentPage = asNumber(meta.current_page) ?? requestedPage;
  return {
    page: currentPage,
    records: records.map(toCandidate).filter((c): c is CertificateCandidate => c !== null),
    hasMore: resolveHasMore(meta, links, currentPage, records.length),
    perPage: asNumber(meta.per_page),
    total: asNumber(meta.total),
  };
};

/**
 * `GET /student/courses/{course}/progress` is documented only as "the same
 * `CourseProgressResource` shape" (§15), while the existing client adapter
 * reads `data.progress`. Accept both the wrapped and the bare resource.
 */
export const decodeProgressPayload = (payload: unknown): CertificateEligibility | null => {
  if (!isObject(payload)) return null;
  const resource = isObject(payload.progress) ? payload.progress : payload;
  if (!("is_completed" in resource) && !("completed_at" in resource)) return null;

  const course = isObject(resource.course) ? resource.course : null;
  const title = course && typeof course.title === "string" ? course.title.trim() : "";
  return {
    state: evaluateCompletion(resource),
    courseTitle: title || null,
    completedAt: usableCompletedAt(resource.completed_at),
  };
};

/** Completed records only, de-duplicated by course identity (first occurrence wins). */
export const mergeCompleted = (pages: readonly EnrolledProgressPage[]): CertificateCandidate[] => {
  const seen = new Set<string>();
  const result: CertificateCandidate[] = [];
  for (const page of pages) {
    for (const record of page.records) {
      if (record.state !== "complete" || seen.has(record.key)) continue;
      seen.add(record.key);
      result.push(record);
    }
  }
  return result;
};

/**
 * Newest first, undated last. Only meaningful once every page was inspected —
 * sorting a partial list would present it as the whole history.
 */
export const sortByCompletionDate = (items: readonly CertificateCandidate[]): CertificateCandidate[] =>
  [...items].sort((a, b) => {
    const ta = a.completedAt ? Date.parse(a.completedAt) : Number.NEGATIVE_INFINITY;
    const tb = b.completedAt ? Date.parse(b.completedAt) : Number.NEGATIVE_INFINITY;
    return tb - ta;
  });

/** Every course key already seen across `pages` (completed or not). */
export const seenKeys = (pages: readonly EnrolledProgressPage[]): Set<string> =>
  new Set(pages.flatMap((page) => page.records.map((record) => record.key)));
