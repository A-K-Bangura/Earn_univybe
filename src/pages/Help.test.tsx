import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";

vi.mock("../services/guidance", () => ({
  getGuidanceOptions: vi.fn(),
  submitGuidanceInquiry: vi.fn(),
}));
vi.mock("../services/onboarding", () => ({
  getUniversities: vi.fn(),
  getFaculties: vi.fn(),
  getDepartments: vi.fn(),
}));

import { getGuidanceOptions, submitGuidanceInquiry } from "../services/guidance";
import { getUniversities, getFaculties, getDepartments } from "../services/onboarding";
import { Help } from "./Help";
import type { GuidanceOptions, GuidanceResponse } from "../types/guidance";

const FBC = { id: 1, name: "Fourah Bay College" };
const ENGINEERING = { id: 1, name: "Engineering and Architecture", university_id: 1 };

const baseOptions: GuidanceOptions = {
  categories: [
    { id: 1, key: "general_inquiries", slug: "general-inquiries", name: "General Inquiries", description: null, required_context: "none" },
    { id: 2, key: null, slug: "admissions-applications", name: "Admissions & Applications", description: null, required_context: "university" },
    { id: 3, key: null, slug: "department-specific-thing", name: "Department Specific Thing", description: null, required_context: "department" },
  ],
  profile_context: { university: FBC, faculty: ENGINEERING, department: null },
  question_max_length: 500,
};

const guidanceResponse = (overrides: Partial<GuidanceResponse> = {}): GuidanceResponse => ({
  routing: {
    id: "r-1",
    routed_at: "2026-11-10T14:00:00+00:00",
    source: "general",
    category: baseOptions.categories[0],
    context: baseOptions.profile_context,
    contact_type: "guide",
    is_central_fallback: false,
    is_repeat: false,
  },
  contact: {
    type: "guide",
    name: "Aminata Kamara",
    whatsapp: { number: "+23276555999", url: "https://wa.me/23276555999?text=Hello" },
    message: "Hello",
  },
  notice: "UniVybe has only shared this contact.",
  ...overrides,
});

const renderHelp = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Help />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const axiosError = (code: string, details?: Record<string, unknown>, status = 422) =>
  ({
    response: {
      status,
      data: { success: false, error: { code, message: "Validation failed", details } },
    },
  }) as unknown as AxiosError;

beforeEach(() => {
  vi.mocked(getGuidanceOptions).mockResolvedValue(baseOptions);
  vi.mocked(getUniversities).mockResolvedValue([FBC]);
  vi.mocked(getFaculties).mockResolvedValue([ENGINEERING]);
  vi.mocked(getDepartments).mockResolvedValue([]);
  vi.mocked(submitGuidanceInquiry).mockReset();
});

describe("Help (Get Help)", () => {
  it("renders the categories from options and prefills the profile context", async () => {
    renderHelp();

    expect(await screen.findByRole("option", { name: "General Inquiries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Admissions & Applications" })).toBeInTheDocument();
    expect(screen.getByText(/We'll use your profile/)).toBeInTheDocument();
    expect(
      screen.getByText("Fourah Bay College · Engineering and Architecture")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get help" })).toBeDisabled();
  });

  it("enables submit once a no-context category is picked", async () => {
    const user = userEvent.setup();
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    await user.selectOptions(screen.getByLabelText(/What do you need help with/), "1");
    expect(screen.getByRole("button", { name: "Get help" })).toBeEnabled();
  });

  it("blocks submit and explains when the category needs context the profile doesn't have", async () => {
    const user = userEvent.setup();
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    // The profile has no department, and this category requires one.
    await user.selectOptions(
      screen.getByLabelText(/What do you need help with/),
      "3"
    );
    expect(
      screen.getByText(/needs your university, faculty and department/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get help" })).toBeDisabled();
  });

  it("lets the student pick a different place instead of their profile", async () => {
    const user = userEvent.setup();
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    await user.click(screen.getByRole("button", { name: "This is about somewhere else" }));
    expect(await screen.findByLabelText("University")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my profile instead" })).toBeInTheDocument();
  });

  it("submits the category + question and shows the WhatsApp contact on success", async () => {
    const user = userEvent.setup();
    vi.mocked(submitGuidanceInquiry).mockResolvedValue(guidanceResponse());
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    await user.selectOptions(screen.getByLabelText(/What do you need help with/), "1");
    await user.type(screen.getByLabelText(/Your question/), "Which form do I need?");
    await user.click(screen.getByRole("button", { name: "Get help" }));

    expect(await screen.findByText("Aminata Kamara")).toBeInTheDocument();
    expect(screen.getByText("UniVybe has only shared this contact.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Continue to WhatsApp" });
    expect(link).toHaveAttribute("href", "https://wa.me/23276555999?text=Hello");
    expect(link).toHaveAttribute("target", "_blank");

    expect(submitGuidanceInquiry).toHaveBeenCalledWith({
      category_id: 1,
      university_id: 1,
      faculty_id: 1,
      department_id: undefined,
      question: "Which form do I need?",
    });

    await user.click(screen.getByRole("button", { name: "Ask something else" }));
    expect(screen.getByRole("button", { name: "Get help" })).toBeInTheDocument();
  });

  it("shows field-level 422 errors next to the matching input", async () => {
    const user = userEvent.setup();
    vi.mocked(submitGuidanceInquiry).mockRejectedValue(
      axiosError("VALIDATION_ERROR", {
        faculty_id: ["This faculty does not belong to the selected university."],
      })
    );
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    await user.selectOptions(screen.getByLabelText(/What do you need help with/), "1");
    await user.click(screen.getByRole("button", { name: "This is about somewhere else" }));
    await user.selectOptions(await screen.findByLabelText("University"), "1");
    await user.selectOptions(screen.getByLabelText("Faculty"), "1");
    await user.click(screen.getByRole("button", { name: "Get help" }));

    expect(
      await screen.findByText("This faculty does not belong to the selected university.")
    ).toBeInTheDocument();
  });

  it("shows a friendly message for a 503 (no guide fits, no central number set)", async () => {
    const user = userEvent.setup();
    vi.mocked(submitGuidanceInquiry).mockRejectedValue(
      axiosError("GUIDANCE_CONTACT_UNAVAILABLE", undefined, 503)
    );
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    await user.selectOptions(screen.getByLabelText(/What do you need help with/), "1");
    await user.click(screen.getByRole("button", { name: "Get help" }));

    expect(
      await screen.findByText(/No guidance contact is available right now/)
    ).toBeInTheDocument();
  });

  it("shows a friendly message for the daily rate limit", async () => {
    const user = userEvent.setup();
    vi.mocked(submitGuidanceInquiry).mockRejectedValue(
      axiosError("GUIDANCE_RATE_LIMITED", { limit: 10 }, 429)
    );
    renderHelp();
    await screen.findByRole("option", { name: "General Inquiries" });

    await user.selectOptions(screen.getByLabelText(/What do you need help with/), "1");
    await user.click(screen.getByRole("button", { name: "Get help" }));

    expect(await screen.findByText(/today's limit/)).toBeInTheDocument();
  });
});
