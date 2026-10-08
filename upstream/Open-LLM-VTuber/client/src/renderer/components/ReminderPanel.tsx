import { Bell, Check, Clock3, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { parseReminderDraft, type Reminder, type ReminderDraft, type ReminderRepeat } from "../reminders";

interface ReminderPanelProps {
  open: boolean;
  reminders: Reminder[];
  onCreate: (draft: ReminderDraft) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string) => void;
  onClose: () => void;
}

export function ReminderPanel({ open, reminders, onCreate, onDelete, onSnooze, onClose }: ReminderPanelProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState(() => toLocalInput(new Date(Date.now() + 30 * 60_000)));
  const [repeat, setRepeat] = useState<ReminderRepeat>("none");
  const [natural, setNatural] = useState("");
  const draft = useMemo(() => parseReminderDraft(natural), [natural]);
  if (!open) return null;

  return (
    <aside className="reminder-panel no-drag">
      <header>
        <Bell size={18} />
        <h2>提醒</h2>
        <button type="button" onClick={onClose} title="关闭提醒">
          <X size={18} />
        </button>
      </header>
      <div className="reminder-form">
        <label>
          <span>内容</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：喝水" />
        </label>
        <label>
          <span>时间</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        <label>
          <span>重复</span>
          <select value={repeat} onChange={(event) => setRepeat(event.target.value as ReminderRepeat)}>
            <option value="none">单次</option>
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
          </select>
        </label>
        <button type="button" className="reminder-action" onClick={() => { onCreate({ title, dueAt: new Date(dueAt).toISOString(), repeat, sound: true }); setTitle(""); }} disabled={!title.trim()}>
          <Clock3 size={15} />
          添加提醒
        </button>
      </div>
      <label className="reminder-natural">
        <span>自然语言草稿</span>
        <input value={natural} onChange={(event) => setNatural(event.target.value)} placeholder="明天 09:00 提醒我喝水" />
      </label>
      {draft ? (
        <div className="reminder-draft">
          <span>{draft.title} · {formatDate(draft.dueAt)} · {repeatLabel(draft.repeat)}</span>
          <button type="button" onClick={() => { onCreate(draft); setNatural(""); }} title="确认创建">
            <Check size={15} />
          </button>
        </div>
      ) : null}
      <div className="reminder-list">
        {reminders.length === 0 ? <span className="reminder-empty">暂无提醒</span> : reminders.map((reminder) => (
          <div className="reminder-item" key={reminder.id}>
            <div>
              <strong>{reminder.title}</strong>
              <span>{formatDate(reminder.dueAt)} · {repeatLabel(reminder.repeat)}</span>
            </div>
            <div className="reminder-item-actions">
              <button type="button" onClick={() => onSnooze(reminder.id)} title="延后十分钟"><Clock3 size={15} /></button>
              <button type="button" onClick={() => onDelete(reminder.id)} title="取消提醒"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function repeatLabel(value: ReminderRepeat): string {
  return value === "daily" ? "每天" : value === "weekly" ? "每周" : "单次";
}
