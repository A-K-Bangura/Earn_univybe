import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  verifyOtp: vi.fn(),
  sendOtp: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../services/auth", () => mocks);

import { useAuth } from "./useAuth";

const incomplete = { id: "u1", email: "a@b.c", firstname: null, lastname: null, level: null };
const complete = { id: "u1", email: "a@b.c", firstname: "A", lastname: "B", level: "300" };

const setup = (initial = "/auth/login") => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => ({ auth: useAuth(), location: useLocation() }), { wrapper });
};

beforeEach(() => vi.resetAllMocks());

describe("useAuth routing after sign-in", () => {
  it("sends a logged-in student who never finished onboarding back to onboarding, not the dashboard", async () => {
    mocks.login.mockResolvedValue({ token: "t", user: incomplete });
    const { result } = setup("/auth/login?redirect=/resources/5");

    await act(() => result.current.auth.login({ email: "a@b.c", password: "password1" }));

    await waitFor(() => expect(result.current.location.pathname).toBe("/onboarding"));
  });

  it("still honours ?redirect= for a completed student, else the dashboard", async () => {
    mocks.login.mockResolvedValue({ token: "t", user: complete });
    const withRedirect = setup("/auth/login?redirect=/resources/5");
    await act(() => withRedirect.result.current.auth.login({ email: "a@b.c", password: "password1" }));
    await waitFor(() => expect(withRedirect.result.current.location.pathname).toBe("/resources/5"));

    const plain = setup("/auth/login");
    await act(() => plain.result.current.auth.login({ email: "a@b.c", password: "password1" }));
    await waitFor(() => expect(plain.result.current.location.pathname).toBe("/dashboard"));
  });

  it("verifying the email code resumes onboarding when it is unfinished, else opens the portal", async () => {
    mocks.verifyOtp.mockResolvedValueOnce({ token: "t", user: incomplete, requires_onboarding: true });
    const resume = setup("/auth/verify");
    act(() => resume.result.current.auth.verifyOtp({ email: "a@b.c", otp: "123456" }));
    await waitFor(() => expect(resume.result.current.location.pathname).toBe("/onboarding"));

    mocks.verifyOtp.mockResolvedValueOnce({ token: "t", user: complete, requires_onboarding: false });
    const done = setup("/auth/verify");
    act(() => done.result.current.auth.verifyOtp({ email: "a@b.c", otp: "123456" }));
    await waitFor(() => expect(done.result.current.location.pathname).toBe("/dashboard"));
  });
});
