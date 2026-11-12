import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";

vi.mock("../utils/navigation", () => ({ redirectTo: vi.fn() }));

import api from "./api";
import { redirectTo } from "../utils/navigation";
import { getAuthProfile, login, logout, verifyOtp } from "./auth";
import { loadOnboardingDraft, saveOnboardingDraft } from "../utils/onboardingDraft";

type Handler = (config: InternalAxiosRequestConfig) => unknown;

/** Make every request answer with `respond`, or fail with the given status. */
const stubApi = (respond: Handler) => {
  api.defaults.adapter = async (config) => {
    const result = respond(config) as { status: number; data: unknown };
    const response = {
      ...result,
      statusText: "",
      headers: {},
      config,
    };
    if (result.status >= 400) {
      throw new AxiosError(
        "failed",
        "ERR_BAD_REQUEST",
        config,
        null,
        response as never
      );
    }
    return response as never;
  };
};

const ok = (data: unknown) => ({ status: 200, data: { success: true, data } });

const freshUser = { id: "u-new", email: "n@x.com", firstname: null, lastname: null, level: null };
const doneUser = { id: "u-old", email: "o@x.com", firstname: "O", lastname: "Ld", level: "200" };

beforeEach(() => {
  localStorage.clear();
  vi.mocked(redirectTo).mockClear();
});

describe("verifyOtp session storage", () => {
  it("keeps a not-yet-onboarded student on a pending token and drops a previous account's session", async () => {
    localStorage.setItem("auth_token", "old-account-token");
    localStorage.setItem("user", JSON.stringify(doneUser));
    stubApi(() => ok({ token: "t-new", user: freshUser, requires_onboarding: true }));

    const result = await verifyOtp({ email: "n@x.com", otp: "123456" });

    expect(result.requires_onboarding).toBe(true);
    expect(localStorage.getItem("pending_auth_token")).toBe("t-new");
    expect(JSON.parse(localStorage.getItem("pending_user")!).id).toBe("u-new");
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("does not trust requires_onboarding:false when the profile is empty", async () => {
    stubApi(() => ok({ token: "t", user: freshUser, requires_onboarding: false }));
    const result = await verifyOtp({ email: "n@x.com", otp: "123456" });
    expect(result.requires_onboarding).toBe(true);
    expect(localStorage.getItem("pending_auth_token")).toBe("t");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("signs a completed student straight in", async () => {
    stubApi(() => ok({ token: "t-full", user: doneUser }));
    const result = await verifyOtp({ email: "o@x.com", otp: "123456" });
    expect(result.requires_onboarding).toBe(false);
    expect(localStorage.getItem("auth_token")).toBe("t-full");
    expect(localStorage.getItem("pending_auth_token")).toBeNull();
  });
});

describe("login / logout", () => {
  it("login replaces any pending session", async () => {
    localStorage.setItem("pending_auth_token", "p");
    localStorage.setItem("pending_user", JSON.stringify(freshUser));
    stubApi(() => ok({ token: "t-login", user: doneUser }));
    await login({ email: "o@x.com", password: "password1" });
    expect(localStorage.getItem("auth_token")).toBe("t-login");
    expect(localStorage.getItem("pending_auth_token")).toBeNull();
    expect(localStorage.getItem("pending_user")).toBeNull();
  });

  it("explicit logout clears the session and every on-device onboarding draft", async () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("pending_auth_token", "p");
    saveOnboardingDraft("u-new", 1, { firstname: "Amina", level: "100" });
    stubApi(() => ({ status: 200, data: { success: true } }));

    await logout();

    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("pending_auth_token")).toBeNull();
    expect(loadOnboardingDraft("u-new")).toBeNull();
  });
});

describe("getAuthProfile (server is authoritative)", () => {
  it("keeps an incomplete profile with the pending session, not as a signed-in user", async () => {
    localStorage.setItem("pending_auth_token", "p");
    stubApi(() => ok({ user: freshUser }));
    await getAuthProfile();
    expect(localStorage.getItem("user")).toBeNull();
    expect(JSON.parse(localStorage.getItem("pending_user")!).id).toBe("u-new");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("promotes a pending session the server says is already onboarded", async () => {
    localStorage.setItem("pending_auth_token", "p-tok");
    stubApi(() => ok({ user: doneUser }));
    await getAuthProfile();
    expect(localStorage.getItem("auth_token")).toBe("p-tok");
    expect(localStorage.getItem("pending_auth_token")).toBeNull();
    expect(JSON.parse(localStorage.getItem("user")!).id).toBe("u-old");
  });
});

describe("expired session (401) handling", () => {
  const expire = async () => {
    stubApi(() => ({ status: 401, data: { success: false } }));
    await api.get("/anything").catch(() => undefined);
  };

  it("an expired onboarding session clears tokens, KEEPS the draft, and routes to email re-verification", async () => {
    window.history.pushState({}, "", "/onboarding");
    localStorage.setItem("pending_auth_token", "expired");
    localStorage.setItem("pending_user", JSON.stringify(freshUser));
    saveOnboardingDraft("u-new", 2, { firstname: "Amina", level: "100", university_id: 3 });

    await expire();

    expect(localStorage.getItem("pending_auth_token")).toBeNull();
    expect(localStorage.getItem("pending_user")).toBeNull();
    expect(redirectTo).toHaveBeenCalledWith("/auth/signup?reason=session-expired");
    // …so after verifying the same email again, the same account id finds it.
    expect(loadOnboardingDraft("u-new")?.fields.firstname).toBe("Amina");
  });

  it("an expired full session still goes to login", async () => {
    window.history.pushState({}, "", "/dashboard");
    localStorage.setItem("auth_token", "expired");
    await expire();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(redirectTo).toHaveBeenCalledWith("/auth/login");
  });

  it("a guest with no session is never redirected", async () => {
    window.history.pushState({}, "", "/courses");
    await expire();
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
