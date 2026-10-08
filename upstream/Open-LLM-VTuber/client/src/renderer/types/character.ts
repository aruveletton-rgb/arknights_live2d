export type CharacterState = "idle" | "thinking" | "speaking" | "happy" | "confused" | "serious" | "error";

export const EMOTIONS = Object.freeze(["neutral", "smile", "serious", "worried", "sad", "surprised", "thinking", "confident"] as const);
export const MOTIONS = Object.freeze(["idle", "greeting", "nod", "shake", "think", "encourage", "battle_ready"] as const);

export type Emotion = (typeof EMOTIONS)[number];
export type Motion = (typeof MOTIONS)[number];
/** @deprecated Use Emotion. Kept while older model dictionaries migrate. */
export type CharacterExpression = Emotion;
/** @deprecated Use Motion. Kept while older model dictionaries migrate. */
export type CharacterMotion = Motion;

const EMOTION_SET: ReadonlySet<string> = new Set(EMOTIONS);
const MOTION_SET: ReadonlySet<string> = new Set(MOTIONS);

export function normalizeEmotion(value: unknown): Emotion {
  return typeof value === "string" && EMOTION_SET.has(value) ? value as Emotion : "neutral";
}

export function normalizeMotion(value: unknown): Motion {
  return typeof value === "string" && MOTION_SET.has(value) ? value as Motion : "idle";
}

export interface CharacterPresentation {
  state: CharacterState;
  motion: CharacterMotion;
  expression: CharacterExpression;
  lipSyncLevel: number;
  message?: string;
}
