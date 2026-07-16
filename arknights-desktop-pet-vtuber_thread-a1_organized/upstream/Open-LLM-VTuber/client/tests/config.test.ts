import { describe, expect, it, beforeEach } from "vitest";
import { loadClientConfig, saveClientConfig } from "../src/renderer/config/clientConfig";
import { defaultConfig } from "../src/renderer/config/defaultConfig";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear()
  },
  configurable: true
});

describe("clientConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads defaults when no saved config exists", () => {
    expect(loadClientConfig().backendBaseUrl).toBe(defaultConfig.backendBaseUrl);
  });

  it("persists changed settings", () => {
    saveClientConfig({ ...defaultConfig, backendBaseUrl: "http://localhost:9000", mockMode: true });
    expect(loadClientConfig().backendBaseUrl).toBe("http://localhost:9000");
    expect(loadClientConfig().mockMode).toBe(true);
  });
});
