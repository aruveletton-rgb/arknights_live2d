import type { CharacterExpression, CharacterMotion } from "./character";

export type InputType = "text" | "voice";

export interface ChatClientState {
  current_motion: CharacterMotion;
  language: string;
}

export interface ChatRequest {
  session_id: string;
  character_id: string;
  input_type: InputType;
  text: string;
  audio_base64: string | null;
  client_state: ChatClientState;
}

export interface ChatResponse {
  reply_text: string;
  emotion: CharacterExpression;
  motion: CharacterMotion;
  audio_url: string | null;
  audio_base64: string | null;
  duration_ms: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: number;
  emotion?: CharacterExpression;
  motion?: CharacterMotion;
}
