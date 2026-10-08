import { normalizeEmotion, normalizeMotion } from "../types/character";
import type { ChatRequest, ChatResponse, LegacyChatResponse } from "../types/chat";
import { ChatClientError } from "../types/chat";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseChatResponse(raw: unknown, request: ChatRequest): ChatResponse {
  if (!isRecord(raw)) throw new ChatClientError("后端响应格式无效。", "BAD_RESPONSE");
  const response = raw as Partial<LegacyChatResponse>;
  const text = typeof response.text === "string" ? response.text : null;
  if (text === null) throw new ChatClientError("后端响应缺少文本内容。", "BAD_RESPONSE");

  for (const key of ["session_id", "character_id"] as const) {
    const value = response[key];
    if (value !== undefined && typeof value !== "string") throw new ChatClientError(`后端响应字段 ${key} 无效。`, "BAD_RESPONSE");
    if (typeof value === "string" && value !== request[key]) throw new ChatClientError("后端响应会话不匹配。", "BAD_RESPONSE");
  }

  const error = response.error;
  const parsedError = error === null || error === undefined
    ? null
    : isRecord(error) && typeof error.code === "string" && typeof error.message === "string"
      ? { code: error.code, message: error.message }
      : null;
  return {
    session_id: typeof response.session_id === "string" ? response.session_id : request.session_id,
    character_id: typeof response.character_id === "string" ? response.character_id : request.character_id,
    text,
    emotion: normalizeEmotion(response.emotion),
    motion: normalizeMotion(response.motion),
    audio_url: typeof response.audio_url === "string" ? response.audio_url : null,
    audio_base64: typeof response.audio_base64 === "string" ? response.audio_base64 : null,
    mime_type: typeof response.mime_type === "string" ? response.mime_type : undefined,
    duration_ms: typeof response.duration_ms === "number" && Number.isFinite(response.duration_ms) ? response.duration_ms : undefined,
    error: parsedError
  };
}
