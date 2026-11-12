import { describe, expect, it } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import { isFeedLockedError } from "./feed";

// Builds an AxiosError the way axios would for a failed HTTP response.
const httpError = (status: number, data: unknown): AxiosError =>
  new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    { status, data } as AxiosResponse
  );

describe("isFeedLockedError", () => {
  it("detects the documented FEED_LOCKED envelope (error.code)", () => {
    // STUDENT_API_PAYLOADS §41
    const error = httpError(403, {
      success: false,
      error: {
        code: "FEED_LOCKED",
        message: "Feed locked — complete a lesson or exchange 10 XP to gain access.",
      },
    });
    expect(isFeedLockedError(error)).toBe(true);
  });

  it("detects FEED_LOCKED even when the status is not 403", () => {
    expect(
      isFeedLockedError(httpError(423, { error: { code: "FEED_LOCKED" } }))
    ).toBe(true);
  });

  it("falls back to the legacy top-level error_code", () => {
    expect(
      isFeedLockedError(httpError(400, { error_code: "FEED_LOCKED" }))
    ).toBe(true);
  });

  it("treats any 403 from the feed as locked", () => {
    expect(isFeedLockedError(httpError(403, {}))).toBe(true);
  });

  it("ignores other HTTP errors", () => {
    expect(
      isFeedLockedError(httpError(500, { error: { code: "SERVER_ERROR" } }))
    ).toBe(false);
    expect(isFeedLockedError(httpError(401, { error: { code: "UNAUTHORIZED" } }))).toBe(
      false
    );
  });

  it("ignores network errors with no response, and non-axios errors", () => {
    expect(
      isFeedLockedError(new AxiosError("Network Error", AxiosError.ERR_NETWORK))
    ).toBe(false);
    expect(isFeedLockedError(new Error("boom"))).toBe(false);
    expect(isFeedLockedError(undefined)).toBe(false);
    expect(isFeedLockedError(null)).toBe(false);
  });
});
