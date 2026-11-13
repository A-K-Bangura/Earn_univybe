import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  env: { SUPPORT_WHATSAPP_NUMBER: "+232 76 123 456" as string | undefined },
  getUniversities: vi.fn(),
  getFaculties: vi.fn(),
  getDepartments: vi.fn(),
  getOrganizations: vi.fn(),
  completeOnboarding: vi.fn(),
  getAuthProfile: vi.fn(),
  getOnboardingHelpContact: vi.fn(),
}));

vi.mock("../config/env", () => ({ env: mocks.env }));
vi.mock("../services/onboarding", () => ({
  getUniversities: mocks.getUniversities,
  getFaculties: mocks.getFaculties,
  getDepartments: mocks.getDepartments,
  getOrganizations: mocks.getOrganizations,
}));
vi.mock("../services/auth", () => ({
  completeOnboarding: mocks.completeOnboarding,
  getAuthProfile: mocks.getAuthProfile,
}));
vi.mock("../services/guidance", () => ({
  getOnboardingHelpContact: mocks.getOnboardingHelpContact,
}));

import { Onboarding } from "./Onboarding";
import { loadOnboardingDraft, saveOnboardingDraft } from "../utils/onboardingDraft";

const FBC = { id: 1, name: "Fourah Bay College" };
const NJALA = { id: 2, name: "Njala University" };
const ENGINEERING = { id: 10, name: "Faculty of Engineering", university_id: 1 };
const CIVIL = { id: 100, name: "Civil Engineering", faculty_id: 10 };
const MINING = { id: 101, name: "Mining Engineering", faculty_id: 10 };

const pendingUser = (id: string) => ({
  id,
  email: `${id}@example.com`,
  firstname: null,
  lastname: null,
  level: null,
});

const signInPending = (id = "acct-1") => {
  localStorage.setItem("pending_auth_token", `token-${id}`);
  localStorage.setItem("pending_user", JSON.stringify(pendingUser(id)));
};

/** A draft sitting on "Academic Details" for a 300-level, FBC > Engineering. */
const seedAcademicDraft = (
  accountId = "acct-1",
  over: Parameters<typeof saveOnboardingDraft>[2] = {},
  step = 2
) =>
  saveOnboardingDraft(accountId, step, {
    firstname: "Amina",
    lastname: "Kamara",
    phone: "+23276123456",
    level: "300",
    university_id: 1,
    faculty_id: 10,
    department_id: null,
    ...over,
  });

const renderOnboarding = (client?: QueryClient) => {
  const queryClient =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/discover" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...view, queryClient };
};

const field = (name: string) => screen.getByLabelText(`${name} *`) as HTMLSelectElement;
const academicDetailsReady = () =>
  waitFor(() => expect(field("Faculty")).toHaveValue("10"));

// jsdom cannot open a new tab; stop link clicks from trying to navigate.
document.addEventListener("click", (e) => {
  if ((e.target as Element).closest("a")) e.preventDefault();
});

// jsdom's window.open always returns null (no real multi-window support), so
// every test gets a controllable fake tab instead — the guidance dialog's
// window.open(...)/pendingTab.location.href dance is asserted via `lastTab`,
// never the real window.location.
let lastTab: { location: { href: string }; opener: unknown; close: () => void } | null;

beforeEach(() => {
  localStorage.clear();
  mocks.env.SUPPORT_WHATSAPP_NUMBER = "+232 76 123 456";
  Object.values(mocks).forEach((m) => {
    if (typeof m === "function") m.mockReset();
  });
  lastTab = null;
  vi.spyOn(window, "open").mockImplementation(() => {
    lastTab = { location: { href: "" }, opener: null, close: vi.fn() };
    return lastTab as unknown as Window;
  });
  mocks.getUniversities.mockResolvedValue([FBC, NJALA]);
  mocks.getFaculties.mockImplementation(async (universityId: number) =>
    universityId === 1 ? [ENGINEERING] : []
  );
  mocks.getDepartments.mockResolvedValue([CIVIL]);
  mocks.getOrganizations.mockResolvedValue([]);
  mocks.getAuthProfile.mockRejectedValue(new Error("offline"));
  // Default: the guidance service is unreachable, so the dialog falls back to
  // the env-configured number exactly as it did before Round 13 — most tests
  // below exercise that fallback path and don't care about the new primary one.
  mocks.getOnboardingHelpContact.mockRejectedValue(new Error("network"));
  signInPending();
});

describe("resuming an interrupted onboarding", () => {
  it("restores the step and answers after a refresh, and never stores the password", async () => {
    const user = userEvent.setup();
    const first = renderOnboarding();
    await user.type(screen.getByPlaceholderText("Enter your first name"), "Amina");
    await user.type(screen.getByPlaceholderText("Enter your last name"), "Kamara");
    await user.type(screen.getByPlaceholderText("+232 76 123 4567"), "+23276123456");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    first.unmount(); // browser closed / refreshed

    renderOnboarding();
    // Back on the step they were on, answers intact.
    expect(screen.getByRole("heading", { name: "Study Level" })).toBeInTheDocument();
    expect(screen.getByText(/we saved your answers/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByPlaceholderText("Enter your first name")).toHaveValue("Amina");
    expect(screen.getByPlaceholderText("+232 76 123 4567")).toHaveValue("+23276123456");
  });

  it("returns to the password step with the password empty", async () => {
    const user = userEvent.setup();
    seedAcademicDraft(
      "acct-1",
      { department_id: 100, student_id: "STU2024001" },
      3
    );
    renderOnboarding();
    const password = screen.getByPlaceholderText("At least 8 characters");
    await user.type(password, "Sup3rSecret!");
    await waitFor(() =>
      expect(Object.values(localStorage).join("|")).not.toContain("Sup3rSecret")
    );
    cleanup();

    renderOnboarding();
    expect(screen.getByPlaceholderText("At least 8 characters")).toHaveValue("");
  });

  it("never gives one account another account's draft", () => {
    seedAcademicDraft("acct-A", { firstname: "Alice" }, 0);
    signInPending("acct-B");

    renderOnboarding();

    expect(screen.getByPlaceholderText("Enter your first name")).toHaveValue("");
    expect(screen.queryByText(/we saved your answers/i)).not.toBeInTheDocument();
  });

  it("sends a student the server says is already onboarded to the dashboard and drops the draft", async () => {
    seedAcademicDraft();
    mocks.getAuthProfile.mockResolvedValue({
      user: { id: "acct-1", firstname: "Amina", lastname: "Kamara", level: "300" },
    });

    renderOnboarding();

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(loadOnboardingDraft("acct-1")).toBeNull();
  });

  it("works offline when the server can't be asked", async () => {
    seedAcademicDraft();
    renderOnboarding();
    await academicDetailsReady();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });
});

describe("restored selections are revalidated against the live lists", () => {
  it("clears a faculty that doesn't belong to the restored university and blocks Next", async () => {
    // Faculty 10 belongs to university 1, but the draft says university 2.
    seedAcademicDraft("acct-1", { university_id: 2, faculty_id: 10, department_id: 100 });
    renderOnboarding();

    expect(await screen.findByText(/Your faculty is no longer in the list/)).toBeInTheDocument();
    expect(field("Faculty")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
    expect(mocks.completeOnboarding).not.toHaveBeenCalled();
    // The department of the invalid pair was never even requested.
    expect(mocks.getDepartments).not.toHaveBeenCalled();
  });

  it("clears a university that was removed, never picking another one", async () => {
    mocks.getUniversities.mockResolvedValue([NJALA]);
    seedAcademicDraft();
    renderOnboarding();

    expect(await screen.findByText(/Your university is no longer in the list/)).toBeInTheDocument();
    expect(field("University")).toHaveValue("");
  });

  it("sends a restored password-step draft back to Academic Details when a selection is gone", async () => {
    mocks.getDepartments.mockResolvedValue([MINING]); // saved department 100 is gone
    seedAcademicDraft("acct-1", { department_id: 100 }, 3);
    renderOnboarding();

    expect(await screen.findByText(/Your department is no longer in the list/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Academic Information" })).toBeInTheDocument();
  });

  it("keeps Complete disabled until the lists confirm, then submits and clears the draft", async () => {
    const user = userEvent.setup();
    mocks.completeOnboarding.mockResolvedValue({ user: {} });
    // Hold the department list back so the restored selection stays unconfirmed.
    let releaseDepartments: (departments: typeof CIVIL[]) => void = () => {};
    mocks.getDepartments.mockReturnValue(
      new Promise((resolve) => {
        releaseDepartments = resolve;
      })
    );
    seedAcademicDraft(
      "acct-1",
      { department_id: 100, student_id: "STU2024001" },
      3
    );
    renderOnboarding();

    await user.type(screen.getByPlaceholderText("At least 8 characters"), "Sup3rSecret!");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "Sup3rSecret!");
    const complete = screen.getByRole("button", { name: /Complete/ });
    await waitFor(() => expect(mocks.getDepartments).toHaveBeenCalled());
    expect(complete).toBeDisabled(); // passwords fine, selection not yet confirmed
    expect(screen.getByText(/Confirming your selections/)).toBeInTheDocument();
    releaseDepartments([CIVIL]);
    await waitFor(() => expect(complete).toBeEnabled());

    await user.click(complete);

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(mocks.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        university_id: 1,
        faculty_id: 10,
        department_id: 100,
        student_id: "STU2024001",
        level: "300",
        password: "Sup3rSecret!",
      })
    );
    expect(loadOnboardingDraft("acct-1")).toBeNull();
  });
});

describe("Can't find your department? (WhatsApp support)", () => {
  it("is available next to the selectors even when the list is empty", async () => {
    mocks.getDepartments.mockResolvedValue([]);
    seedAcademicDraft();
    renderOnboarding();

    expect(await screen.findByText("No departments are listed for this faculty yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Can't find your university?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Can't find your faculty?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Can't find your department?" })).toBeInTheDocument();
  });

  it("tries the guidance service first, shows the parents, and changes nothing in the form", async () => {
    const user = userEvent.setup();
    mocks.getDepartments.mockResolvedValue([]);
    seedAcademicDraft();
    renderOnboarding();
    await screen.findByText("No departments are listed for this faculty yet.");

    await user.click(screen.getByRole("button", { name: "Can't find your department?" }));
    const dialog = screen.getByRole("dialog", { name: "Can't find your department?" });
    expect(within(dialog).getByText("Fourah Bay College")).toBeInTheDocument();
    expect(within(dialog).getByText("Faculty of Engineering")).toBeInTheDocument();
    expect(within(dialog).getByText(/Your progress will be saved/)).toBeInTheDocument();

    // No name yet: can't continue.
    expect(within(dialog).getByRole("button", { name: "Continue to WhatsApp" })).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/Name of your missing department/), "Mining Engineering");
    const button = within(dialog).getByRole("button", { name: "Continue to WhatsApp" });
    expect(button).toBeEnabled();

    await user.click(button);

    // Tried the backend first, with whatever the student had picked so far.
    expect(mocks.getOnboardingHelpContact).toHaveBeenCalledWith({
      issue: "department",
      university_id: 1,
      faculty_id: 10,
    });

    // The service is unreachable in this test (default mock) — falls back to
    // the exact same locally-built link as before Round 13.
    const expected = [
      "Hello UniVybe team. I'm completing my student onboarding, but I can't find my department.",
      "",
      "University: Fourah Bay College",
      "Faculty: Faculty of Engineering",
      "Missing department: Mining Engineering",
      "",
      "Please help me add it so I can complete my onboarding.",
    ].join("\n");
    await waitFor(() =>
      expect(lastTab?.location.href).toBe(
        `https://wa.me/23276123456?text=${encodeURIComponent(expected)}`
      )
    );
    expect(lastTab?.location.href).not.toMatch(/token|password|otp|acct-1/i);

    // Opening WhatsApp is not "sent", and not "added".
    expect(await within(dialog).findByText(/nothing has been sent yet/i)).toBeInTheDocument();
    expect(mocks.completeOnboarding).not.toHaveBeenCalled();
    expect(localStorage.getItem("pending_auth_token")).toBe("token-acct-1");

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(field("University")).toHaveValue("1");
    expect(field("Faculty")).toHaveValue("10");
    expect(screen.getByRole("heading", { name: "Academic Information" })).toBeInTheDocument();
    expect(
      screen.getByText("You asked support to add “Mining Engineering”. It isn't in the list yet.")
    ).toBeInTheDocument();
  });

  it("uses the guidance service's own contact when it answers — even with no env number configured", async () => {
    const user = userEvent.setup();
    mocks.env.SUPPORT_WHATSAPP_NUMBER = undefined;
    mocks.getOnboardingHelpContact.mockResolvedValue({
      routing: {
        id: "r-1",
        routed_at: "2026-11-10T14:03:00+00:00",
        source: "onboarding",
        category: {
          id: 9,
          key: "missing_department",
          slug: "missing-department",
          name: "Missing Department",
          description: null,
          required_context: "none",
        },
        context: { university: FBC, faculty: ENGINEERING, department: null },
        contact_type: "central",
        is_central_fallback: true,
        is_repeat: false,
      },
      contact: {
        type: "central",
        name: "UniVybe Support",
        whatsapp: { number: "+23276000111", url: "https://wa.me/23276000111?text=Hello%20there" },
        message: "Hello there",
      },
      notice: "UniVybe has only shared this contact.",
    });
    seedAcademicDraft();
    renderOnboarding();
    await academicDetailsReady();

    await user.click(screen.getByRole("button", { name: "Can't find your department?" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Name of your missing department/), "Mining Engineering");
    await user.click(within(dialog).getByRole("button", { name: "Continue to WhatsApp" }));

    await waitFor(() =>
      expect(lastTab?.location.href).toBe("https://wa.me/23276000111?text=Hello%20there")
    );
    expect(await within(dialog).findByText(/nothing has been sent yet/i)).toBeInTheDocument();
  });

  it("closes on Escape and Cancel without side effects", async () => {
    const user = userEvent.setup();
    seedAcademicDraft();
    renderOnboarding();
    await academicDetailsReady();

    await user.click(screen.getByRole("button", { name: "Can't find your faculty?" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Can't find your faculty?" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(field("Faculty")).toHaveValue("10");
  });

  it("requires the parent selections for a faculty request", async () => {
    const user = userEvent.setup();
    seedAcademicDraft("acct-1", { university_id: null, faculty_id: null });
    renderOnboarding();
    await waitFor(() => expect(field("University")).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Can't find your faculty?" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Choose your university first/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Name of your missing faculty/)).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Continue to WhatsApp" })).toBeDisabled();
  });

  it("supports a missing university with no parents", async () => {
    const user = userEvent.setup();
    seedAcademicDraft("acct-1", { university_id: null, faculty_id: null });
    renderOnboarding();
    await waitFor(() => expect(field("University")).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Can't find your university?" }));
    await user.type(screen.getByLabelText(/Name of your missing university/), "Example University");
    await user.click(screen.getByRole("button", { name: "Continue to WhatsApp" }));

    await waitFor(() => expect(lastTab?.location.href).toBeTruthy());
    const text = decodeURIComponent(lastTab!.location.href.split("?text=")[1]);
    expect(text).toContain("can't find my university.");
    expect(text).toContain("Missing university: Example University");
    expect(text).not.toContain("Faculty:");
  });

  it("shows a plain failure message when neither the guidance service nor the env number is available", async () => {
    const user = userEvent.setup();
    mocks.env.SUPPORT_WHATSAPP_NUMBER = undefined;
    seedAcademicDraft();
    renderOnboarding();
    await academicDetailsReady();

    await user.click(screen.getByRole("button", { name: "Can't find your department?" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Name of your missing department/), "Mining Engineering");
    await user.click(within(dialog).getByRole("button", { name: "Continue to WhatsApp" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/WhatsApp support isn't available/);
    expect(lastTab?.location.href).toBe("");
  });
});

describe("institution lists: failures and refreshing", () => {
  it("shows a load failure with Retry — not 'none listed' — and recovers", async () => {
    const user = userEvent.setup();
    mocks.getFaculties.mockRejectedValueOnce(new Error("network"));
    seedAcademicDraft("acct-1", { faculty_id: null });
    renderOnboarding();

    const alert = await screen.findByText(/couldn't load the list of faculties/i);
    expect(alert).toBeInTheDocument();
    expect(screen.queryByText(/No faculties are listed/)).not.toBeInTheDocument();
    // Help stays available even while the list is down.
    expect(screen.getByRole("button", { name: "Can't find your faculty?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(within(field("Faculty")).getByRole("option", { name: "Faculty of Engineering" })).toBeInTheDocument()
    );
    expect(screen.queryByText(/couldn't load the list of faculties/i)).not.toBeInTheDocument();
  });

  it("picks up a department an admin added while the student was away, keeping everything else", async () => {
    const user = userEvent.setup();
    seedAcademicDraft();
    renderOnboarding();
    await screen.findByRole("option", { name: "Civil Engineering" });
    expect(screen.queryByRole("option", { name: "Mining Engineering" })).not.toBeInTheDocument();

    mocks.getDepartments.mockResolvedValue([CIVIL, MINING]); // admin added it
    await user.click(
      within(field("Department").closest("div")!.parentElement!).getByRole("button", { name: "Refresh list" })
    );

    expect(await screen.findByRole("option", { name: "Mining Engineering" })).toBeInTheDocument();
    expect(field("University")).toHaveValue("1");
    expect(field("Faculty")).toHaveValue("10");
  });

  it("after contacting support, says the department is available only once the API lists it", async () => {
    const user = userEvent.setup();
    mocks.getDepartments.mockResolvedValue([CIVIL]);
    seedAcademicDraft();
    renderOnboarding();
    await screen.findByRole("option", { name: "Civil Engineering" });

    await user.click(screen.getByRole("button", { name: "Can't find your department?" }));
    await user.type(screen.getByLabelText(/Name of your missing department/), "Mining Engineering");
    await user.click(screen.getByRole("button", { name: "Continue to WhatsApp" }));
    await screen.findByText(/nothing has been sent yet/i);
    await user.click(screen.getByRole("button", { name: "Done" }));

    const check = screen.getByRole("button", { name: "I've contacted support — check again" });
    await user.click(check);
    expect(await screen.findByText(/It isn't in the list yet/)).toBeInTheDocument();
    expect(screen.queryByText(/is now in the list/)).not.toBeInTheDocument();

    mocks.getDepartments.mockResolvedValue([CIVIL, MINING]);
    await user.click(screen.getByRole("button", { name: "I've contacted support — check again" }));
    expect(await screen.findByText("“Mining Engineering” is now in the list — select it above.")).toBeInTheDocument();
  });

  it("revalidates the lists when the page regains focus (once they're stale)", async () => {
    seedAcademicDraft();
    const { queryClient } = renderOnboarding();
    await screen.findByRole("option", { name: "Civil Engineering" });
    const calls = mocks.getDepartments.mock.calls.length;

    // Fresh data: coming back immediately doesn't hit the API again.
    window.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.getDepartments.mock.calls.length).toBe(calls);

    // Aged past the freshness window, an admin-added department shows up on return.
    mocks.getDepartments.mockResolvedValue([CIVIL, MINING]);
    queryClient.getQueryCache().findAll({ queryKey: ["departments"] }).forEach((q) =>
      q.setState({ dataUpdatedAt: Date.now() - 5 * 60_000 })
    );
    window.dispatchEvent(new Event("visibilitychange"));

    expect(await screen.findByRole("option", { name: "Mining Engineering" })).toBeInTheDocument();
  });
});

describe("student ID is required for regular levels (100-500)", () => {
  // docs/STUDENT_API_PAYLOADS.md's "Complete Onboarding" table documents
  // student_id as required for these levels; the backend 422s without it.
  // The form used to accept and silently submit without one.
  it("blocks Next on Academic Details until a student ID is entered, then submits it", async () => {
    const user = userEvent.setup();
    mocks.completeOnboarding.mockResolvedValue({ user: {} });
    seedAcademicDraft("acct-1", {
      university_id: 1,
      faculty_id: 10,
      department_id: 100,
    });
    renderOnboarding();
    await academicDetailsReady();

    const next = screen.getByRole("button", { name: /Next/ });
    expect(next).toBeDisabled();
    expect(
      screen.getByText("Please enter your student ID")
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Student ID *"), "STU2024001");
    expect(next).toBeEnabled();

    await user.click(next);
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "Sup3rSecret!");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: /Complete/ }));

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(mocks.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "STU2024001" })
    );
  });
});
