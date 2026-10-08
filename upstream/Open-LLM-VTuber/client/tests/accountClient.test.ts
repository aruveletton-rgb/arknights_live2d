import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAccountData, loginAccount } from "../src/renderer/api/accountClient";

describe("accountClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the service token only for login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "session", token_type: "Bearer", expires_at: "later", user: { id: 1, username: "alice", role: "user" } })
    }));

    await loginAccount("alice", "password", { baseUrl: "http://localhost:8000", timeoutMs: 1000, serviceToken: "service" });
    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get("X-API-Token")).toBe("service");
    expect(new Headers(request.headers).get("Authorization")).toBeNull();
  });

  it("sends account and service credentials to account data endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ memories: [] }) }));

    await loadAccountData("session", { baseUrl: "http://localhost:8000", timeoutMs: 1000, serviceToken: "service" });
    for (const [, request] of vi.mocked(fetch).mock.calls) {
      const headers = new Headers((request as RequestInit).headers);
      expect(headers.get("Authorization")).toBe("Bearer session");
      expect(headers.get("X-API-Token")).toBe("service");
    }
  });
});
