import { describe, expect, it } from "vitest";
import {
  decodeEnrolledPage,
  decodeProgressPayload,
  mergeCompleted,
  seenKeys,
  sortByCompletionDate,
} from "./enrolledPage";

const record = (uuid: string, title: string, extra: Record<string, unknown> = {}) => ({
  id: 1,
  uuid: `progress-${uuid}`,
  course: { id: 1, uuid, title },
  progress_percent: 10,
  completed_at: null,
  is_completed: false,
  ...extra,
});

const done = (uuid: string, at: string | null, title = `Course ${uuid}`) =>
  record(uuid, title, { is_completed: true, completed_at: at, progress_percent: 100 });

describe("decodeEnrolledPage — nested Laravel paginator", () => {
  it("reads records from data.data[] and pagination from the paginator", () => {
    const page = decodeEnrolledPage(
      {
        current_page: 2,
        data: [record("a", "A"), done("b", "2026-09-01T00:00:00Z")],
        per_page: 15,
        total: 31,
        last_page: 3,
        next_page_url: "https://api.example/enrolled?page=3",
      },
      2
    );
    expect(page.page).toBe(2);
    expect(page.records.map((r) => [r.key, r.state])).toEqual([
      ["a", "incomplete"],
      ["b", "complete"],
    ]);
    expect(page.hasMore).toBe(true);
    expect(page.total).toBe(31);
  });

  it("prefers next_page_url: null as the end of the list", () => {
    const page = decodeEnrolledPage({ current_page: 3, data: [record("a", "A")], next_page_url: null, last_page: 3 }, 3);
    expect(page.hasMore).toBe(false);
  });

  it("falls back to last_page, then to total/per_page", () => {
    expect(decodeEnrolledPage({ current_page: 1, data: [record("a", "A")], last_page: 4 }, 1).hasMore).toBe(true);
    expect(decodeEnrolledPage({ current_page: 4, data: [record("a", "A")], last_page: 4 }, 4).hasMore).toBe(false);
    // The documented example carries only current_page/data/per_page/total.
    expect(decodeEnrolledPage({ current_page: 1, data: [record("a", "A")], per_page: 15, total: 40 }, 1).hasMore).toBe(true);
    expect(decodeEnrolledPage({ current_page: 3, data: [record("a", "A")], per_page: 15, total: 40 }, 3).hasMore).toBe(false);
  });

  it("reports 'unknown' (null), not 'done', when the response carries no pagination info", () => {
    const page = decodeEnrolledPage({ data: [record("a", "A")] }, 1);
    expect(page.hasMore).toBeNull();
    expect(page.page).toBe(1);
  });

  it("treats an empty page as the end", () => {
    expect(decodeEnrolledPage({ data: [] }, 5).hasMore).toBe(false);
  });

  it("also accepts the flat data[] + meta/links shape and a bare array", () => {
    const flat = decodeEnrolledPage(
      { data: [record("a", "A")], meta: { current_page: 1, last_page: 2, per_page: 10, total: 12 }, links: { next: "x" } },
      1
    );
    expect(flat.hasMore).toBe(true);
    expect(decodeEnrolledPage([record("a", "A")], 1).records).toHaveLength(1);
  });

  it("skips malformed records instead of failing the page", () => {
    const page = decodeEnrolledPage(
      { data: [null, {}, { course: {} }, { course: { uuid: "x", title: "  " } }, done("ok", null)], last_page: 1 },
      1
    );
    expect(page.records.map((r) => r.key)).toEqual(["ok"]);
  });

  it("falls back to the numeric course id when there is no uuid", () => {
    const page = decodeEnrolledPage({ data: [{ course: { id: 7, title: "Seven" }, is_completed: true }], last_page: 1 }, 1);
    expect(page.records[0].routeId).toBe("7");
  });

  it("keeps completed_at as given and drops unusable dates", () => {
    const page = decodeEnrolledPage(
      { data: [done("a", "2026-10-09T10:00:00Z"), done("b", "garbage"), done("c", null)], last_page: 1 },
      1
    );
    expect(page.records.map((r) => r.completedAt)).toEqual(["2026-10-09T10:00:00Z", null, null]);
    // The flag alone still qualifies a legacy row without a usable date.
    expect(page.records.every((r) => r.state === "complete")).toBe(true);
  });
});

describe("collection merging", () => {
  const page = (records: ReturnType<typeof decodeEnrolledPage>["records"]) => ({
    page: 1,
    records,
    hasMore: true,
    perPage: null,
    total: null,
  });
  const decode = (...items: unknown[]) => decodeEnrolledPage({ data: items, last_page: 9 }, 1);

  it("keeps completed courses only and de-duplicates by course identity", () => {
    const merged = mergeCompleted([
      decode(record("a", "A"), done("b", "2026-02-01T00:00:00Z")),
      decode(done("b", "2026-02-01T00:00:00Z"), done("c", "2026-03-01T00:00:00Z")),
    ]);
    expect(merged.map((m) => m.key)).toEqual(["b", "c"]);
  });

  it("does not treat a mismatching record as completed", () => {
    const merged = mergeCompleted([decode(record("m", "M", { is_completed: false, completed_at: "2026-02-01T00:00:00Z" }))]);
    expect(merged).toEqual([]);
  });

  it("finds a completion on a later page even when earlier pages have none", () => {
    const pages = [decode(record("a", "A"), record("b", "B")), decode(record("c", "C")), decode(done("old", "2025-01-05T00:00:00Z"))];
    expect(mergeCompleted(pages).map((m) => m.key)).toEqual(["old"]);
    expect(seenKeys(pages)).toEqual(new Set(["a", "b", "c", "old"]));
  });

  it("sorts newest first with undated last", () => {
    const merged = mergeCompleted([decode(done("a", "2026-01-01T00:00:00Z"), done("b", null), done("c", "2026-05-01T00:00:00Z"))]);
    expect(sortByCompletionDate(merged).map((m) => m.key)).toEqual(["c", "a", "b"]);
    // sorting returns a copy
    expect(merged.map((m) => m.key)).toEqual(["a", "b", "c"]);
  });

  it("works with an empty page list", () => {
    expect(mergeCompleted([])).toEqual([]);
    expect(page([])).toBeTruthy();
  });
});

describe("decodeProgressPayload — single-course progress", () => {
  const resource = {
    id: 10,
    is_completed: true,
    completed_at: "2026-10-09T14:30:00Z",
    progress_percent: 100,
    course: { id: 1, uuid: "c1", title: "  Intro to Programming " },
  };

  it("accepts the wrapped shape the existing client adapter reads (data.progress)", () => {
    expect(decodeProgressPayload({ progress: resource })).toEqual({
      state: "complete",
      courseTitle: "Intro to Programming",
      completedAt: "2026-10-09T14:30:00Z",
    });
  });

  it("accepts the bare resource shape the docs imply (§15)", () => {
    expect(decodeProgressPayload(resource)?.state).toBe("complete");
  });

  it("takes the title only from the nested course, never from anywhere else", () => {
    expect(decodeProgressPayload({ is_completed: true, title: "From route" })?.courseTitle).toBeNull();
  });

  it("reports incomplete and mismatching records faithfully", () => {
    expect(decodeProgressPayload({ ...resource, is_completed: false, completed_at: null })?.state).toBe("incomplete");
    expect(decodeProgressPayload({ ...resource, is_completed: false })?.state).toBe("mismatch");
  });

  it("returns null for payloads that aren't a progress record", () => {
    expect(decodeProgressPayload(null)).toBeNull();
    expect(decodeProgressPayload("nope")).toBeNull();
    expect(decodeProgressPayload({ unrelated: true })).toBeNull();
  });
});
