import { describe, expect, it } from "vitest";
import { parseChatResponse } from "../src/renderer/api/parseChatResponse";
import { ChatClientError, type ChatRequest } from "../src/renderer/types/chat";

const request: ChatRequest = {
  session_id: "session-1",
  character_id: "arknights_fan_001",
  input_type: "text",
  text: "测试",
  enable_tts: false
};

describe("parseChatResponse", () => {
  it("normalizes missing optional fields and unknown enums", () => {
    expect(parseChatResponse({ text: "收到", emotion: "unknown", motion: "unknown" }, request)).toMatchObject({
      session_id: "session-1",
      character_id: "arknights_fan_001",
      emotion: "neutral",
      motion: "idle",
      audio_url: null,
      audio_base64: null,
      error: null
    });
  });

  it("rejects mismatched sessions and missing text", () => {
    expect(() => parseChatResponse({ text: "收到", session_id: "other" }, request)).toThrow(ChatClientError);
    expect(() => parseChatResponse({ emotion: "smile" }, request)).toThrow(ChatClientError);
  });
});
