export interface AudioPlayerEvents {
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
}

export class AudioPlayer {
  private audio = new Audio();

  constructor(private readonly events: AudioPlayerEvents = {}) {
    this.audio.addEventListener("play", () => this.events.onStart?.());
    this.audio.addEventListener("ended", () => this.events.onEnded?.());
    this.audio.addEventListener("error", () => this.events.onError?.("音频播放失败，已降级为文本展示。"));
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  async play(input: { audioUrl?: string | null; audioBase64?: string | null; mimeType?: string }): Promise<boolean> {
    const source = input.audioUrl ?? (input.audioBase64 ? `data:${input.mimeType ?? "audio/wav"};base64,${input.audioBase64}` : null);
    if (!source) return false;

    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = source;

    try {
      await this.audio.play();
      return true;
    } catch {
      this.events.onError?.("浏览器阻止或无法播放音频，已降级为文本展示。");
      return false;
    }
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.events.onEnded?.();
  }
}
