export interface AudioPlayerEvents {
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  onLevel?: (level: number) => void;
}

export class AudioPlayer {
  private audio = new Audio();
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrame: number | null = null;

  constructor(private readonly events: AudioPlayerEvents = {}) {
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";
    this.audio.addEventListener("play", () => this.events.onStart?.());
    this.audio.addEventListener("play", () => this.startAnalysis());
    this.audio.addEventListener("ended", () => {
      this.stopAnalysis();
      this.events.onEnded?.();
    });
    this.audio.addEventListener("error", () => {
      this.stopAnalysis();
      this.events.onError?.("音频播放失败，已降级为文本展示。");
    });
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
      await this.prepareAnalysis();
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
    this.stopAnalysis();
    this.events.onEnded?.();
  }

  private async prepareAnalysis(): Promise<void> {
    if (typeof AudioContext === "undefined") return;
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.context.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  private startAnalysis(): void {
    this.stopAnalysis();
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let total = 0;
      for (const sample of data) {
        const centered = (sample - 128) / 128;
        total += centered * centered;
      }
      this.events.onLevel?.(Math.min(1, Math.sqrt(total / data.length) * 2.6));
      this.animationFrame = globalThis.requestAnimationFrame(tick);
    };
    this.animationFrame = globalThis.requestAnimationFrame(tick);
  }

  private stopAnalysis(): void {
    if (this.animationFrame !== null) globalThis.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.events.onLevel?.(0);
  }
}
