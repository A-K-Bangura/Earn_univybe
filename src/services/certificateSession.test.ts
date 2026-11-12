import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";

vi.mock("../utils/navigation", () => ({ redirectTo: vi.fn() }));

import api from "./api";
import { login, logout } from "./auth";
import { certificateArtifacts, type CachedArtifact } from "../utils/certificates/artifactCache";
import { getCertificateAccountScope } from "../utils/certificates/session";

const artifact = (key: string, accountId: string): CachedArtifact => {
  const blob = new Blob([key]);
  return { key, accountId, blob, file: new File([blob], `${key}.png`), width: 1, height: 1, filename: `${key}.png` };
};

const user = (id: string) => ({ id, email: `${id}@x.com`, firstname: "A", lastname: "B", level: "200" });

const stubLogin = (id: string) => {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) =>
    ({
      status: 200,
      statusText: "",
      headers: {},
      config,
      data: { success: true, data: { token: `token-${id}`, user: user(id) } },
    }) as never;
};

let revoked: string[] = [];

beforeEach(() => {
  localStorage.clear();
  revoked = [];
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:s/${++n}`);
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});

afterEach(() => {
  certificateArtifacts.clear();
});

describe("certificate artifacts follow the session", () => {
  it("logout clears prepared certificates and revokes their Blob URLs", async () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("user", JSON.stringify(user("acct-1")));
    certificateArtifacts.set(artifact("a", "acct-1"));
    const url = certificateArtifacts.acquireUrl("a")!;

    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("offline", "ERR_NETWORK", config);
    };
    await logout();

    expect(certificateArtifacts.size).toBe(0);
    expect(revoked).toContain(url);
    expect(getCertificateAccountScope()).toBeNull();
  });

  it("a different account signing in drops the previous account's certificates", async () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("user", JSON.stringify(user("acct-1")));
    certificateArtifacts.set(artifact("a", "acct-1"));

    stubLogin("acct-2");
    await login({ email: "acct-2@x.com", password: "pw" });

    expect(certificateArtifacts.size).toBe(0);
    expect(getCertificateAccountScope()).toBe("acct-2");
  });

  it("signing back in as the same account keeps its prepared certificates", async () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("user", JSON.stringify(user("acct-1")));
    certificateArtifacts.set(artifact("a", "acct-1"));

    stubLogin("acct-1");
    await login({ email: "acct-1@x.com", password: "pw" });

    expect(certificateArtifacts.get("a")).not.toBeNull();
  });
});
