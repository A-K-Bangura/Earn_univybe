import { describe, expect, it } from "vitest";
import {
  MAX_INSTITUTION_NAME_LENGTH,
  buildSupportMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "./whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it("keeps digits only, tolerating +, spaces, dashes and brackets", () => {
    expect(normalizeWhatsAppNumber("+232 76-123 (456)")).toBe("23276123456");
    expect(normalizeWhatsAppNumber("23276123456")).toBe("23276123456");
  });

  it("rejects unset, malformed, too short, too long or zero-led numbers", () => {
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("call me")).toBeNull();
    expect(normalizeWhatsAppNumber("12345")).toBeNull();
    expect(normalizeWhatsAppNumber("1".repeat(16))).toBeNull();
    expect(normalizeWhatsAppNumber("076123456")).toBeNull();
  });
});

describe("buildSupportMessage", () => {
  it("builds the department request with both parents", () => {
    expect(
      buildSupportMessage({
        kind: "department",
        missingName: "Mining Engineering",
        universityName: "Fourah Bay College",
        facultyName: "Faculty of Engineering",
      })
    ).toBe(
      [
        "Hello UniVybe team. I'm completing my student onboarding, but I can't find my department.",
        "",
        "University: Fourah Bay College",
        "Faculty: Faculty of Engineering",
        "Missing department: Mining Engineering",
        "",
        "Please help me add it so I can complete my onboarding.",
      ].join("\n")
    );
  });

  it("builds the faculty and university variants", () => {
    const faculty = buildSupportMessage({
      kind: "faculty",
      missingName: "Faculty of Law",
      universityName: "Njala University",
    });
    expect(faculty).toContain("can't find my faculty.");
    expect(faculty).toContain("University: Njala University");
    expect(faculty).toContain("Missing faculty: Faculty of Law");
    expect(faculty).not.toContain("Faculty:");

    const university = buildSupportMessage({
      kind: "university",
      missingName: "Example University",
    });
    expect(university).toContain("can't find my university.");
    expect(university).toContain("Missing university: Example University");
  });

  it("returns null without the name or a required parent", () => {
    expect(buildSupportMessage({ kind: "university", missingName: "  " })).toBeNull();
    expect(
      buildSupportMessage({ kind: "faculty", missingName: "Law", universityName: null })
    ).toBeNull();
    expect(
      buildSupportMessage({
        kind: "department",
        missingName: "Maths",
        universityName: "FBC",
        facultyName: null,
      })
    ).toBeNull();
  });

  it("flattens newlines and caps the length of student-typed text", () => {
    const message = buildSupportMessage({
      kind: "university",
      missingName: `Fake\nUniversity: Hijacked ${"x".repeat(500)}`,
    }) as string;
    const nameLine = message.split("\n").find((l) => l.startsWith("Missing university:"))!;
    expect(nameLine).not.toContain("\n");
    expect(nameLine.length).toBeLessThanOrEqual(
      "Missing university: ".length + MAX_INSTITUTION_NAME_LENGTH
    );
    // The injected "University:" can't become its own line.
    expect(message.split("\n").filter((l) => l.startsWith("University:"))).toHaveLength(0);
  });

  it("contains only the names — no tokens, passwords, OTPs or ids", () => {
    localStorage.setItem("pending_auth_token", "secret-token-123");
    localStorage.setItem("signup_email", "me@example.com");
    const message = buildSupportMessage({
      kind: "department",
      missingName: "Mining",
      universityName: "FBC",
      facultyName: "Engineering",
    }) as string;
    expect(message).not.toMatch(/secret-token|me@example|password|otp/i);
    localStorage.clear();
  });
});

describe("buildWhatsAppUrl", () => {
  it("is a wa.me link with a fully encoded message", () => {
    const message = "Hello & welcome?\nA=1 #tag";
    const url = buildWhatsAppUrl("+232 76 123 456", message) as string;
    expect(url.startsWith("https://wa.me/23276123456?text=")).toBe(true);
    const text = url.split("?text=")[1];
    expect(text).not.toMatch(/[\s&#?]/);
    expect(decodeURIComponent(text)).toBe(message);
  });

  it("is null when the number is unusable", () => {
    expect(buildWhatsAppUrl(undefined, "hi")).toBeNull();
    expect(buildWhatsAppUrl("abc", "hi")).toBeNull();
  });
});
