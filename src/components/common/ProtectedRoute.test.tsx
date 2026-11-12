import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { HomeGate } from "./HomeGate";

const onboarded = { id: "u1", email: "a@b.c", firstname: "A", lastname: "B", level: "300" };
const fresh = { id: "u2", email: "n@b.c", firstname: null, lastname: null, level: null };

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeGate guest={<p>Landing page</p>} />} />
        <Route path="/auth/login" element={<p>Login page</p>} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <p>Onboarding page</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireOnboarding>
              <p>Dashboard page</p>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard-redirect-target" element={<p>never</p>} />
      </Routes>
    </MemoryRouter>
  );

const signInFully = (user: object) => {
  localStorage.setItem("auth_token", "full-token");
  localStorage.setItem("user", JSON.stringify(user));
};
const signInPending = (user: object) => {
  localStorage.setItem("pending_auth_token", "pending-token");
  localStorage.setItem("pending_user", JSON.stringify(user));
};

beforeEach(() => localStorage.clear());

describe("ProtectedRoute", () => {
  it("lets a completed student into routes that require onboarding", () => {
    signInFully(onboarded);
    renderAt("/dashboard");
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("sends a signed-in student with incomplete onboarding to onboarding", () => {
    signInFully(fresh);
    renderAt("/dashboard");
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("keeps a verified-but-pending student out of the portal, in onboarding", () => {
    signInPending(fresh);
    renderAt("/dashboard");
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });

  it("lets a pending student reach the onboarding route itself", () => {
    signInPending(fresh);
    renderAt("/onboarding");
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to login", () => {
    renderAt("/dashboard");
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding page")).not.toBeInTheDocument();
  });

  it("does not let a stale full session mask a newer pending one (account switch)", () => {
    signInFully(onboarded);
    signInPending(fresh);
    renderAt("/dashboard");
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });
});

describe("HomeGate (/)", () => {
  it("shows the landing page to guests", () => {
    renderAt("/");
    expect(screen.getByText("Landing page")).toBeInTheDocument();
  });

  it("returns a student who closed the browser mid-onboarding to onboarding", () => {
    signInPending(fresh);
    renderAt("/");
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("sends a signed-in student to the dashboard", () => {
    signInFully(onboarded);
    renderAt("/");
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});
