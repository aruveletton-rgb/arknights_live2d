export type CharacterState = "idle" | "thinking" | "speaking" | "happy" | "confused" | "serious" | "error";

export type CharacterMotion = "idle" | "greeting" | "nod" | "shake" | "think" | "encourage" | "battle_ready";

export type CharacterExpression = "neutral" | "smile" | "serious" | "worried" | "sad" | "surprised" | "thinking" | "confident";

export interface CharacterPresentation {
  state: CharacterState;
  motion: CharacterMotion;
  expression: CharacterExpression;
  lipSyncLevel: number;
  message?: string;
}
