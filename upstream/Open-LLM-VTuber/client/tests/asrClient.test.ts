import { beforeEach, describe, expect, it, vi } from "vitest";
import { AsrClientError, postAsr } from "../src/renderer/api/asrClient";

Object.defineProperty(globalThis, "window", {
  value: { setTimeout, clearTimeout },
  configurable: true
});

describe("asrClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns recognized text from the backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ text: "博士，今天有什么任务？", provider: "mock", confidence: 1, error: null })
    }));

    await expect(postAsr("测试音频", { baseUrl: "http://localhost:18080", timeoutMs: 1000 })).resolves.toMatchObject({
      text: "博士，今天有什么任务？",
      provider: "mock"
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:18080/api/asr",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("turns a service failure into a client error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(postAsr("测试音频", { baseUrl: "http://localhost:18080", timeoutMs: 1000 })).rejects.toBeInstanceOf(AsrClientError);
  });
});
