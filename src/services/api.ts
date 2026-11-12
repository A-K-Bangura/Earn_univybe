import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { redirectTo } from "../utils/navigation";
import { clearCertificateSession } from "../utils/certificates/session";

// Create axios instance
export const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check for pending token first (for onboarding flow), then main auth token
    const token =
      localStorage.getItem("pending_auth_token") ||
      localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Only redirect on 401 if we actually had a token (i.e. a real session
    // expired) and we're not already on the login page. Several pages are
    // now browsable as a guest (no token) and call auth-required endpoints
    // for account-scoped actions only — a guest was never logged in, so
    // there's no session to expire and nothing to redirect away from.
    const hasPendingToken = !!localStorage.getItem("pending_auth_token");
    if (
      error.response?.status === 401 &&
      (localStorage.getItem("auth_token") || hasPendingToken)
    ) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.startsWith("/auth/");

      if (!isAuthPage) {
        // Handle unauthorized - clear all tokens. The on-device onboarding
        // draft is deliberately NOT cleared: it is account-scoped and holds
        // no secrets, so the student picks up where they left off after
        // signing back in.
        const wasOnboarding = hasPendingToken;
        localStorage.removeItem("auth_token");
        localStorage.removeItem("pending_auth_token");
        localStorage.removeItem("user");
        localStorage.removeItem("pending_user");
        clearCertificateSession();
        // A student who only ever verified their email has no usable password
        // yet (docs/STUDENT_API_PAYLOADS.md §3), so password login can't
        // recover them: they re-verify by email code, then land back in
        // onboarding with their draft.
        redirectTo(
          wasOnboarding ? "/auth/signup?reason=session-expired" : "/auth/login"
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;
