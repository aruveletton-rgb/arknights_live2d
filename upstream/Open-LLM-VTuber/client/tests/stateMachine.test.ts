import { describe, expect, it, vi } from "vitest";
import { CharacterStateMachine } from "../src/renderer/live2d/CharacterStateMachine";

describe("CharacterStateMachine", () => {
  it("moves from thinking to speaking on backend audio response", () => {
    const machine = new CharacterStateMachine();

    machine.userMessageSent();
    expect(machine.getSnapshot().state).toBe("thinking");

    machine.applyBackendResponse({
      reply_text: "收到。",
      emotion: "happy",
      motion: "nod",
      audio_url: "https://example.com/a.wav",
      audio_base64: null,
      duration_ms: 1000
    });

    expect(machine.getSnapshot().state).toBe("speaking");
    expect(machine.getSnapshot().expression).toBe("happy");
    expect(machine.getSnapshot().motion).toBe("nod");
  });

  it("falls back to idle after text-only response duration", () => {
    vi.useFakeTimers();
    const machine = new CharacterStateMachine();

    machine.applyBackendResponse({
      reply_text: "测试。",
      emotion: "serious",
      motion: "alert",
      audio_url: null,
      audio_base64: null,
      duration_ms: 1200
    });

    expect(machine.getSnapshot().state).toBe("serious");
    vi.advanceTimersByTime(1300);
    expect(machine.getSnapshot().state).toBe("idle");
    vi.useRealTimers();
  });
});
