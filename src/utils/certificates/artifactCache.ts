import type { CertificateData, CertificateFormat } from "../../types/certificate";

export type ArtifactKind = "png" | "pdf";

export interface CachedArtifact {
  key: string;
  accountId: string;
  blob: Blob;
  file: File;
  width: number;
  height: number;
  filename: string;
}

interface Entry {
  artifact: CachedArtifact;
  url: string | null;
  refs: number;
  evicted: boolean;
}

/**
 * Identity of one prepared export. Everything that changes the pixels is in the
 * key, so an edited name, a new completion date, another format or a template
 * bump can never be served a stale artifact.
 */
export const artifactKey = (
  accountId: string,
  data: Pick<CertificateData, "courseId" | "displayName" | "completedAt" | "courseTitle" | "templateVersion">,
  format: CertificateFormat,
  kind: ArtifactKind
): string =>
  JSON.stringify([
    accountId,
    data.courseId,
    data.displayName,
    data.courseTitle,
    data.completedAt,
    format,
    kind,
    data.templateVersion,
  ]);

/**
 * A small in-memory LRU of prepared artifacts.
 *
 * - Bounded: at most `maxEntries` (a PNG per format plus a PDF fits in 4); the
 *   least-recently-used one is dropped first. Never persisted anywhere.
 * - Account-scoped: `clear()` on logout/session loss and `retainAccount()` on
 *   an account change drop another student's files immediately.
 * - Blob URLs are reference-counted: one is created on first use and revoked
 *   only when the entry is gone *and* nobody is still showing/sharing it, so a
 *   URL is never revoked out from under a visible image or an in-flight share.
 */
export class ArtifactCache {
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();

  private readonly maxEntries: number;

  constructor(maxEntries = 4) {
    this.maxEntries = maxEntries;
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: string): CachedArtifact | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.artifact;
  }

  set(artifact: CachedArtifact): void {
    const existing = this.entries.get(artifact.key);
    if (existing) this.drop(artifact.key, existing);
    this.entries.set(artifact.key, { artifact, url: null, refs: 0, evicted: false });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.drop(oldest, this.entries.get(oldest)!);
    }
  }

  /** Blob URL for the artifact; every call must be paired with `release`. Null if the artifact is gone. */
  acquireUrl(key: string): string | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (!entry.url) entry.url = URL.createObjectURL(entry.artifact.blob);
    entry.refs += 1;
    return entry.url;
  }

  release(key: string, url: string): void {
    // The entry may already be dropped; track it through the retired list.
    const retired = this.retired.get(url);
    if (retired) {
      retired.refs -= 1;
      if (retired.refs <= 0) this.revoke(url);
      return;
    }
    const entry = this.entries.get(key);
    if (entry && entry.url === url) entry.refs = Math.max(0, entry.refs - 1);
  }

  /** Drop everything (logout, expired session). */
  clear(): void {
    for (const [key, entry] of [...this.entries]) this.drop(key, entry, true);
    // Personal files must not outlive the session, even if a view still holds a URL.
    for (const url of [...this.retired.keys()]) this.revoke(url);
    this.notify();
  }

  /** Drop every artifact that doesn't belong to `accountId` (account switched without a logout). */
  retainAccount(accountId: string | null): void {
    let changed = false;
    for (const [key, entry] of [...this.entries]) {
      if (entry.artifact.accountId !== accountId) {
        this.drop(key, entry, true);
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Entries removed while a consumer still holds their URL: revoked on last release.
  private retired = new Map<string, { refs: number }>();

  private drop(key: string, entry: Entry, force = false): void {
    this.entries.delete(key);
    entry.evicted = true;
    if (!entry.url) return;
    if (entry.refs > 0 && !force) this.retired.set(entry.url, { refs: entry.refs });
    else this.revoke(entry.url);
  }

  private revoke(url: string): void {
    this.retired.delete(url);
    URL.revokeObjectURL(url);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/** The one app-wide cache. */
export const certificateArtifacts = new ArtifactCache();
