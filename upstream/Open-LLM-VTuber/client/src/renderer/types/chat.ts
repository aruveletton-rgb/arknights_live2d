import type { Emotion, Motion, CharacterExpression, CharacterMotion } from "./character";

export type InputType = "text" | "voice";

export interface ChatRequest {
  session_id: string;
  character_id: string;
  input_type: InputType;
  text: string;
  enable_tts: boolean;
  language?: string;
  client_state?: { current_motion: Motion; language: string };
}

export interface ChatResponse {
  session_id: string;
  character_id: string;
  text: string;
  emotion: Emotion;
  motion: Motion;
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

export interface ApiError {
  code: string;
  message: string;
}

export class ChatClientError extends Error {
  constructor(message: string, public readonly code = "CLIENT_ERROR", public readonly status?: number, public readonly cause?: unknown) {
    super(message);
    this.name = "ChatClientError";
  }
}

export type LegacyChatResponse = Omit<ChatResponse, "emotion" | "motion"> & {
  emotion?: CharacterExpression | unknown;
  motion?: CharacterMotion | unknown;
};
