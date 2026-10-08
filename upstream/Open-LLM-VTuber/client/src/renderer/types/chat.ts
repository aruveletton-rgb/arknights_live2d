import type { CharacterExpression, CharacterMotion } from "./character";

export type InputType = "text" | "voice";

export interface ChatRequest {
  session_id: string;
  character_id: string;
  input_type: InputType;
  text: string;
  enable_tts: boolean;
}

export interface ChatResponse {
  session_id: string;
  character_id: string;
  text: string;
  emotion: CharacterExpression;
  motion: CharacterMotion;
  audio_url: string | null;
  audio_base64: string | null;
  mime_type?: string;
  duration_ms?: number;
  error: { code: string; message: string } | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: number;
  emotion?: CharacterExpression;
  motion?: CharacterMotion;
}
