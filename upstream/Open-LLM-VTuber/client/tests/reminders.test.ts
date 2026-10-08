import { beforeEach, describe, expect, it } from "vitest";
import { collectDueReminders, createReminder, loadReminders, parseReminderDraft } from "../src/renderer/reminders";

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

describe("reminders", () => {
  beforeEach(() => storage.clear());

  it("creates and consumes a one-time reminder", () => {
    const now = new Date("2026-10-08T10:00:00Z");
    createReminder({ title: "喝水", dueAt: "2026-10-08T10:01:00Z", repeat: "none", sound: true }, now);
    expect(collectDueReminders(new Date("2026-10-08T10:00:59Z"))).toHaveLength(0);
    expect(collectDueReminders(new Date("2026-10-08T10:01:00Z"))).toHaveLength(1);
    expect(loadReminders()).toHaveLength(0);
  });

  it("advances repeating reminders and parses a confirmed draft", () => {
    const now = new Date("2026-10-08T10:00:00");
    const draft = parseReminderDraft("明天 09:00 每天提醒我吃药", now);
    expect(draft?.repeat).toBe("daily");
    expect(draft?.title).toContain("吃药");
    createReminder({ title: "每天任务", dueAt: "2026-10-08T09:00:00Z", repeat: "daily", sound: true }, now);
    expect(collectDueReminders(new Date("2026-10-08T10:00:00Z"))).toHaveLength(1);
    expect(loadReminders()).toHaveLength(1);
  });
});
