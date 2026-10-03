import { describe, expect, it } from "vitest";
import { listMockReplies, postMockChat } from "../src/renderer/api/mockChatClient";
import type { ChatRequest } from "../src/renderer/types/chat";

const request: ChatRequest = {
  session_id: "local-user-001",
  character_id: "operator_default",
  input_type: "text",
  text: "hello",
  audio_base64: null,
  client_state: {
    current_motion: "idle",
    language: "zh-CN"
  }
};

describe("mockChatClient", () => {
  it("contains five demo replies", () => {
    const emotions = new Set(listMockReplies().map((reply) => reply.emotion));
    expect(listMockReplies()).toHaveLength(5);
    expect(emotions).toEqual(new Set(["happy", "thinking", "confused", "serious", "error"]));
  });

  it("returns a valid mock response", async () => {
    const response = await postMockChat(request);
    expect(response.reply_text.length).toBeGreaterThan(0);
    expect(response.audio_url).toBeNull();
  });
});
