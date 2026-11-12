import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllOnboardingDrafts,
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "./onboardingDraft";
import type { OnboardingFormData } from "../types/onboarding";

const form = (over: Partial<OnboardingFormData> = {}): OnboardingFormData => ({
  firstname: "Amina",
  lastname: "Kamara",
  phone: "+23276123456",
  university_id: 3,
  faculty_id: 7,
  department_id: null,
  organization_id: null,
  level: "300",
  role: "student",
  password: "Sup3rSecret!",
  password_confirmation: "Sup3rSecret!",
  ...over,
});

beforeEach(() => localStorage.clear());

describe("onboarding draft", () => {
  it("round-trips the step and the whitelisted fields", () => {
    saveOnboardingDraft("acct-1", 2, form());
    expect(loadOnboardingDraft("acct-1")).toEqual({
      step: 2,
      fields: {
        firstname: "Amina",
        lastname: "Kamara",
        phone: "+23276123456",
        level: "300",
        university_id: 3,
        faculty_id: 7,
        department_id: null,
        organization_id: null,
        student_id: "",
      },
    });
  });

  it("never writes the password pair (or any secret) to storage", () => {
    saveOnboardingDraft("acct-1", 3, form({ student_id: "STU1" }));
    const stored = Object.values(localStorage).join("|");
    expect(stored).not.toContain("Sup3rSecret");
    expect(stored).not.toContain("password");
  });

  it("is scoped per account — another account never sees it", () => {
    saveOnboardingDraft("acct-1", 1, form());
    expect(loadOnboardingDraft("acct-2")).toBeNull();
    expect(loadOnboardingDraft(null)).toBeNull();
    saveOnboardingDraft("acct-2", 0, form({ firstname: "Other" }));
    expect(loadOnboardingDraft("acct-1")?.fields.firstname).toBe("Amina");
    expect(loadOnboardingDraft("acct-2")?.fields.firstname).toBe("Other");
  });

  it("rejects a draft stored under a different account id or version", () => {
    saveOnboardingDraft("acct-1", 1, form());
    const raw = JSON.parse(localStorage.getItem("onboarding_draft:acct-1")!);
    localStorage.setItem(
      "onboarding_draft:acct-1",
      JSON.stringify({ ...raw, accountId: "someone-else" })
    );
    expect(loadOnboardingDraft("acct-1")).toBeNull();

    localStorage.setItem(
      "onboarding_draft:acct-1",
      JSON.stringify({ ...raw, version: 99 })
    );
    expect(loadOnboardingDraft("acct-1")).toBeNull();
  });

  it("survives corrupt or tampered storage with safe defaults", () => {
    localStorage.setItem("onboarding_draft:acct-1", "{not json");
    expect(loadOnboardingDraft("acct-1")).toBeNull();

    localStorage.setItem(
      "onboarding_draft:acct-1",
      JSON.stringify({
        version: 1,
        accountId: "acct-1",
        step: 99,
        fields: { firstname: 5, level: "700", university_id: "3", faculty_id: -1 },
      })
    );
    const draft = loadOnboardingDraft("acct-1")!;
    expect(draft.step).toBe(3);
    expect(draft.fields.firstname).toBe("");
    expect(draft.fields.level).toBe("");
    expect(draft.fields.university_id).toBeNull();
    expect(draft.fields.faculty_id).toBeNull();
  });

  it("does not leave a stub for an untouched form, and drops a cleared one", () => {
    saveOnboardingDraft("acct-1", 0, form({ firstname: "", lastname: "", phone: "", level: "", university_id: null, faculty_id: null }));
    expect(localStorage.getItem("onboarding_draft:acct-1")).toBeNull();

    saveOnboardingDraft("acct-1", 1, form());
    saveOnboardingDraft("acct-1", 0, form({ firstname: "", lastname: "", phone: "", level: "", university_id: null, faculty_id: null }));
    expect(loadOnboardingDraft("acct-1")).toBeNull();
  });

  it("purges the legacy unscoped draft (it could contain a password)", () => {
    localStorage.setItem("onboarding_draft", JSON.stringify({ password: "oops" }));
    loadOnboardingDraft("acct-1");
    expect(localStorage.getItem("onboarding_draft")).toBeNull();
  });

  it("clears one account's draft, or every draft on explicit sign-out", () => {
    saveOnboardingDraft("acct-1", 1, form());
    saveOnboardingDraft("acct-2", 1, form());
    clearOnboardingDraft("acct-1");
    expect(loadOnboardingDraft("acct-1")).toBeNull();
    expect(loadOnboardingDraft("acct-2")).not.toBeNull();

    localStorage.setItem("unrelated", "keep");
    clearAllOnboardingDrafts();
    expect(loadOnboardingDraft("acct-2")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});
