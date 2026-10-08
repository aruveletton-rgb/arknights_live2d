export type ReminderRepeat = "none" | "daily" | "weekly";

export interface Reminder {
  id: string;
  title: string;
  dueAt: string;
  repeat: ReminderRepeat;
  sound: boolean;
  createdAt: string;
}

export interface ReminderDraft {
  title: string;
  dueAt: string;
  repeat: ReminderRepeat;
  sound: boolean;
}

const storageKey = "arknights-vtuber-pet.reminders.v1";

export function loadReminders(): Reminder[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isReminder);
  } catch {
    return [];
  }
}

function saveReminders(reminders: Reminder[]): void {
  localStorage.setItem(storageKey, JSON.stringify(reminders));
}

export function createReminder(draft: ReminderDraft, now = new Date()): Reminder {
  const reminder: Reminder = {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    dueAt: new Date(draft.dueAt).toISOString(),
    repeat: draft.repeat,
    sound: draft.sound,
    createdAt: now.toISOString()
  };
  if (!reminder.title || Number.isNaN(Date.parse(reminder.dueAt))) throw new Error("提醒内容和时间不能为空。");
  const reminders = loadReminders();
  reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
}

export function deleteReminder(id: string): void {
  saveReminders(loadReminders().filter((reminder) => reminder.id !== id));
}

export function snoozeReminder(id: string, minutes = 10, now = new Date()): Reminder | null {
  const reminders = loadReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) return null;
  reminder.dueAt = new Date(now.getTime() + minutes * 60_000).toISOString();
  saveReminders(reminders);
  return reminder;
}

export function collectDueReminders(now = new Date()): Reminder[] {
  const due: Reminder[] = [];
  const remaining: Reminder[] = [];
  for (const reminder of loadReminders()) {
    if (Date.parse(reminder.dueAt) > now.getTime()) {
      remaining.push(reminder);
      continue;
    }
    due.push(reminder);
    if (reminder.repeat === "none") continue;
    const next = new Date(reminder.dueAt);
    const step = reminder.repeat === "daily" ? 24 * 60 * 60_000 : 7 * 24 * 60 * 60_000;
    do next.setTime(next.getTime() + step); while (next.getTime() <= now.getTime());
    remaining.push({ ...reminder, dueAt: next.toISOString() });
  }
  saveReminders(remaining);
  return due;
}

export function parseReminderDraft(input: string, now = new Date()): ReminderDraft | null {
  const value = input.trim();
  const time = value.match(/(?:今天|明天)?\s*(\d{1,2}):(\d{2})/);
  if (!time) return null;
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (hour > 23 || minute > 59) return null;
  const dayOffset = value.includes("明天") ? 1 : 0;
  const due = new Date(now);
  due.setDate(due.getDate() + dayOffset);
  due.setHours(hour, minute, 0, 0);
  if (!dayOffset && due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
  const repeat: ReminderRepeat = value.includes("每周") ? "weekly" : value.includes("每天") ? "daily" : "none";
  const title = value
    .replace(/提醒我|提醒|每天|每周|今天|明天|\d{1,2}:\d{2}/g, "")
    .replace(/[，,。.!！]/g, " ")
    .trim() || "桌宠提醒";
  return { title, dueAt: due.toISOString(), repeat, sound: true };
}

function isReminder(value: unknown): value is Reminder {
  if (!value || typeof value !== "object") return false;
  const reminder = value as Partial<Reminder>;
  return typeof reminder.id === "string" && typeof reminder.title === "string" &&
    typeof reminder.dueAt === "string" && Number.isFinite(Date.parse(reminder.dueAt)) &&
    (reminder.repeat === "none" || reminder.repeat === "daily" || reminder.repeat === "weekly") &&
    typeof reminder.sound === "boolean" && typeof reminder.createdAt === "string";
}
