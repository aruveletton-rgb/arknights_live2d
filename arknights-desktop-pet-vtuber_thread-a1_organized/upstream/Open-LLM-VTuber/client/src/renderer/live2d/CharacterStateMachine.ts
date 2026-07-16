import type { CharacterExpression, CharacterMotion, CharacterPresentation, CharacterState } from "../types/character";
import type { ChatResponse } from "../types/chat";

type Listener = (presentation: CharacterPresentation) => void;

const emotionToState: Partial<Record<CharacterExpression, CharacterState>> = {
  happy: "happy",
  thinking: "thinking",
  confused: "confused",
  serious: "serious",
  error: "error"
};

export class CharacterStateMachine {
  private presentation: CharacterPresentation = {
    state: "idle",
    motion: "idle",
    expression: "neutral",
    lipSyncLevel: 0
  };

  private listeners = new Set<Listener>();
  private idleTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.presentation);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): CharacterPresentation {
    return { ...this.presentation };
  }

  userMessageSent(): void {
    this.set({ state: "thinking", expression: "thinking", motion: "think", message: "thinking" });
  }

  applyBackendResponse(response: ChatResponse): void {
    const nextState = emotionToState[response.emotion] ?? "speaking";
    this.set({
      state: response.audio_url || response.audio_base64 ? "speaking" : nextState,
      expression: response.emotion,
      motion: response.motion,
      message: response.reply_text
    });

    if (!response.audio_url && !response.audio_base64) {
      this.scheduleIdle(Math.max(1200, response.duration_ms || 2200));
    }
  }

  speakingStarted(): void {
    this.clearIdleTimer();
    this.set({ state: "speaking", motion: "speak" });
  }

  speakingEnded(): void {
    this.set({ state: "idle", motion: "idle", expression: "neutral", lipSyncLevel: 0 });
  }

  requestFailed(message: string): void {
    this.set({ state: "error", expression: "error", motion: "alert", message });
    this.scheduleIdle(3000);
  }

  setLipSyncLevel(level: number): void {
    this.set({ lipSyncLevel: Math.max(0, Math.min(1, level)) });
  }

  private scheduleIdle(delayMs: number): void {
    this.clearIdleTimer();
    this.idleTimer = globalThis.setTimeout(() => this.speakingEnded(), delayMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== undefined) globalThis.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  private set(patch: Partial<CharacterPresentation>): void {
    this.presentation = { ...this.presentation, ...patch };
    this.listeners.forEach((listener) => listener(this.getSnapshot()));
  }
}
