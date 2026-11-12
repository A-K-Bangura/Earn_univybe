import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArtifactCache, artifactKey, certificateArtifacts, type CachedArtifact } from "./artifactCache";
import { clearCertificateSession } from "./session";
import { normalizeCertificateData } from "./data";

let counter = 0;
const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
  counter = 0;
  created.length = 0;
  revoked.length = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${++counter}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});

afterEach(() => {
  certificateArtifacts.clear();
});

const artifact = (key: string, accountId = "acct-1"): CachedArtifact => {
  const blob = new Blob([key], { type: "image/png" });
  return { key, accountId, blob, file: new File([blob], `${key}.png`, { type: "image/png" }), width: 10, height: 10, filename: `${key}.png` };
};

describe("ArtifactCache", () => {
  it("is bounded: the least-recently-used artifact is dropped first", () => {
    const cache = new ArtifactCache(2);
    cache.set(artifact("a"));
    cache.set(artifact("b"));
    cache.get("a"); // refresh a
    cache.set(artifact("c"));
    expect(cache.size).toBe(2);
    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")).not.toBeNull();
    expect(cache.get("c")).not.toBeNull();
  });

  it("revokes a Blob URL when its artifact is evicted and nobody is using it", () => {
    const cache = new ArtifactCache(1);
    cache.set(artifact("a"));
    const url = cache.acquireUrl("a")!;
    cache.release("a", url);
    cache.set(artifact("b"));
    expect(revoked).toContain(url);
  });

  it("does not revoke a URL still in use; revokes it on the last release", () => {
    const cache = new ArtifactCache(1);
    cache.set(artifact("a"));
    const url = cache.acquireUrl("a")!;
    cache.set(artifact("b")); // evicts a while it is displayed
    expect(revoked).not.toContain(url);
    cache.release("a", url);
    expect(revoked).toContain(url);
  });

  it("reuses one Blob URL per artifact and counts references", () => {
    const cache = new ArtifactCache(2);
    cache.set(artifact("a"));
    const first = cache.acquireUrl("a")!;
    const second = cache.acquireUrl("a")!;
    expect(second).toBe(first);
    expect(created).toHaveLength(1);
  });

  it("returns null for an artifact that is gone", () => {
    expect(new ArtifactCache(2).acquireUrl("missing")).toBeNull();
  });

  it("clear() drops everything and revokes URLs immediately, even ones in use", () => {
    const cache = new ArtifactCache(3);
    cache.set(artifact("a"));
    cache.set(artifact("b"));
    const inUse = cache.acquireUrl("a")!;
    const listener = vi.fn();
    cache.subscribe(listener);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(revoked).toContain(inUse);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("retainAccount() drops other students' artifacts and keeps the current one's", () => {
    const cache = new ArtifactCache(4);
    cache.set(artifact("mine", "acct-1"));
    cache.set(artifact("theirs", "acct-2"));
    cache.retainAccount("acct-1");
    expect(cache.get("mine")).not.toBeNull();
    expect(cache.get("theirs")).toBeNull();
    cache.retainAccount(null);
    expect(cache.size).toBe(0);
  });
});

describe("artifactKey — everything that changes the pixels invalidates the artifact", () => {
  const make = (over: Partial<Parameters<typeof normalizeCertificateData>[0]> = {}) =>
    normalizeCertificateData({
      studentId: "s",
      courseId: "course-1",
      courseTitle: "Intro to Programming",
      profileName: "Ada Lovelace",
      completedAt: "2026-10-09T10:00:00Z",
      ...over,
    })!;
  const key = (data = make(), format: "landscape" | "story" = "landscape", kind: "png" | "pdf" = "png", account = "acct-1") =>
    artifactKey(account, data, format, kind);

  it("is stable for identical inputs", () => {
    expect(key()).toBe(key());
  });

  it("changes with the printed name", () => {
    expect(key(make({ displayName: "Ada L." }))).not.toBe(key());
  });

  it("changes with the completion timestamp", () => {
    expect(key(make({ completedAt: "2026-10-10T10:00:00Z" }))).not.toBe(key());
    expect(key(make({ completedAt: null }))).not.toBe(key());
  });

  it("changes with the course, title, format, kind and account", () => {
    expect(key(make({ courseId: "course-2" }))).not.toBe(key());
    expect(key(make({ courseTitle: "Other" }))).not.toBe(key());
    expect(key(make(), "story")).not.toBe(key());
    expect(key(make(), "landscape", "pdf")).not.toBe(key());
    expect(key(make(), "landscape", "png", "acct-2")).not.toBe(key());
  });

  it("does not depend on the student id or the profile name (they never reach the pixels)", () => {
    expect(key(make({ studentId: "other" }))).toBe(key());
  });
});

describe("clearCertificateSession", () => {
  it("empties the shared cache and notifies listeners", () => {
    certificateArtifacts.set(artifact("x"));
    const listener = vi.fn();
    const off = certificateArtifacts.subscribe(listener);
    clearCertificateSession();
    expect(certificateArtifacts.size).toBe(0);
    expect(listener).toHaveBeenCalled();
    off();
  });
});
