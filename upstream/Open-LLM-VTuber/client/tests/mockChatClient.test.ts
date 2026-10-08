import { describe, expect, it } from "vitest";
import { listMockReplies, postMockChat } from "../src/renderer/api/mockChatClient";
import type { ChatRequest } from "../src/renderer/types/chat";

const request: ChatRequest = {
  session_id: "local-user-001",
  character_id: "arknights_fan_001",
  input_type: "text",
  text: "hello",
  enable_tts: true
};

describe("mockChatClient", () => {
  it("contains five demo replies", () => {
    const emotions = new Set(listMockReplies().map((reply) => reply.emotion));
    expect(listMockReplies()).toHaveLength(5);
    expect(emotions).toEqual(new Set(["smile", "thinking", "worried", "serious", "sad"]));
  });

  it("returns a valid mock response", async () => {
    const response = await postMockChat(request);
    expect(response.text.length).toBeGreaterThan(0);
    expect(response.audio_url).toBeNull();
  });
});
