import { describe, expect, it, vi } from "vitest";
import { CharacterStateMachine } from "../src/renderer/live2d/CharacterStateMachine";

describe("CharacterStateMachine", () => {
  it("moves from thinking to speaking on backend audio response", () => {
    const machine = new CharacterStateMachine();

    machine.userMessageSent();
    expect(machine.getSnapshot().state).toBe("thinking");

    machine.applyBackendResponse({
      session_id: "demo-session",
      character_id: "arknights_fan_001",
      text: "收到。",
      emotion: "smile",
      motion: "nod",
      audio_url: "https://example.com/a.wav",
      audio_base64: null,
      duration_ms: 1000,
      error: null
    });

    expect(machine.getSnapshot().state).toBe("speaking");
    expect(machine.getSnapshot().expression).toBe("smile");
    expect(machine.getSnapshot().motion).toBe("nod");
  });

  it("falls back to idle after text-only response duration", () => {
    vi.useFakeTimers();
    const machine = new CharacterStateMachine();

    machine.applyBackendResponse({
      session_id: "demo-session",
      character_id: "arknights_fan_001",
      text: "测试。",
      emotion: "serious",
      motion: "battle_ready",
      audio_url: null,
      audio_base64: null,
      duration_ms: 1200,
      error: null
    });

    expect(machine.getSnapshot().state).toBe("serious");
    vi.advanceTimersByTime(1300);
    expect(machine.getSnapshot().state).toBe("idle");
    vi.useRealTimers();
  });

  it("normalizes unexpected runtime emotion and motion values", () => {
    const machine = new CharacterStateMachine();

    machine.applyBackendResponse({
      session_id: "demo-session",
      character_id: "arknights_fan_001",
      text: "未知值。",
      emotion: "unrecognized" as never,
      motion: "alert" as never,
      audio_url: null,
      audio_base64: null,
      duration_ms: 1200,
      error: null
    });

    expect(machine.getSnapshot().expression).toBe("neutral");
    expect(machine.getSnapshot().motion).toBe("idle");
  });
});
