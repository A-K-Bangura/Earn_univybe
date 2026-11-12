import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../services/auth", () => ({
  isAuthenticated: vi.fn(() => false),
  completeOnboarding: vi.fn(),
  getAuthProfile: vi.fn(),
  login: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../../services/onboarding", () => ({
  getUniversities: vi.fn().mockResolvedValue([]),
  getFaculties: vi.fn().mockResolvedValue([]),
  getDepartments: vi.fn().mockResolvedValue([]),
  getOrganizations: vi.fn().mockResolvedValue([]),
}));

import { Login } from "./Login";
import { Signup } from "./Signup";
import { VerifyOtp } from "./VerifyOtp";
import { Onboarding } from "../Onboarding";

const renderPage = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

/** Names of the mascot poses on screen, from their (hashed) image URLs. */
const poses = () =>
  Array.from(document.querySelectorAll("img"))
    .map((img) => img.getAttribute("src") ?? "")
    .filter((src) => src.includes("mascot-"))
    .map((src) => /mascot-([a-z-]+?)(?:-[A-Za-z0-9_]{8})?\.webp/.exec(src)?.[1] ?? src);

beforeEach(() => {
  localStorage.clear();
});

describe("contextual mascots on the auth screens", () => {
  it("sign in: relaxed 'welcome back' Vybe with a matching line", () => {
    renderPage(<Login />);

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(poses()).toContain("cool");
    expect(screen.getAllByText(/Good to see you again/).length).toBeGreaterThan(0);
  });

  it("sign up: the 'learn, level up, earn' Vybe", () => {
    renderPage(<Signup />);

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(poses()).toContain("learning");
  });

  it("verify email: Vybe holding the envelope", () => {
    renderPage(<VerifyOtp />);

    expect(screen.getByRole("heading", { name: "Verify Email" })).toBeInTheDocument();
    expect(poses()).toContain("mail");
  });

  it("keeps every form control working next to the mascot", () => {
    renderPage(<Login />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });
});

describe("contextual mascots on onboarding", () => {
  it("changes Vybe's pose and line with each step", async () => {
    const user = userEvent.setup();
    renderPage(<Onboarding />);

    // 1: personal info -> waving hello
    expect(poses()).toContain("hi");
    expect(screen.getAllByText(/Tell me a little about yourself/).length).toBeGreaterThan(0);
    await user.type(screen.getByPlaceholderText("Enter your first name"), "Amina");
    await user.type(screen.getByPlaceholderText("Enter your last name"), "Kamara");
    await user.type(screen.getByPlaceholderText("+232 76 123 4567"), "+23276123456");
    await user.click(screen.getByRole("button", { name: /Next/ }));

    // 2: level -> graduation cap
    expect(poses()).toContain("hat");
    await user.selectOptions(screen.getByRole("combobox"), "UnderGrad");
    await user.click(screen.getByRole("button", { name: /Next/ }));

    // 3: academic details -> studious
    expect(poses()).toContain("smart");
    await user.click(screen.getByRole("button", { name: /Next/ }));

    // 4: password -> key and shield
    expect(poses()).toContain("secure");
    expect(screen.getAllByText(/pick a strong password/).length).toBeGreaterThan(0);
    const form = screen.getByRole("heading", { name: "Account Setup" }).parentElement!;
    expect(within(form).getByPlaceholderText("At least 8 characters")).toBeInTheDocument();
  });
});
