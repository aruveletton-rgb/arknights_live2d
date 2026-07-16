export type CharacterState = "idle" | "thinking" | "speaking" | "happy" | "confused" | "serious" | "error";

export type CharacterMotion = "idle" | "nod" | "shake_head" | "wave" | "think" | "speak" | "alert";

export type CharacterExpression = "neutral" | "happy" | "thinking" | "confused" | "serious" | "sad" | "error";

export interface CharacterPresentation {
  state: CharacterState;
  motion: CharacterMotion;
  expression: CharacterExpression;
  lipSyncLevel: number;
  message?: string;
}
