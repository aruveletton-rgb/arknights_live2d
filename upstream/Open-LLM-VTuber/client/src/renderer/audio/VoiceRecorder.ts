export class VoiceRecorderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "VoiceRecorderError";
  }
}

export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private stopPromise: Promise<Blob | null> | null = null;
  private resolveStop: ((value: Blob | null) => void) | null = null;

  get active(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new VoiceRecorderError("当前环境不支持录音，请改用文本输入。", "UNSUPPORTED");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((value) => MediaRecorder.isTypeSupported(value));
      this.chunks = [];
      this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      this.stopPromise = new Promise<Blob | null>((resolve) => {
        this.resolveStop = resolve;
      });
      this.recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      });
      this.recorder.addEventListener("stop", () => {
        const type = this.recorder?.mimeType || mimeType || "audio/webm";
        const blob = this.chunks.length ? new Blob(this.chunks, { type }) : null;
        this.resolveStop?.(blob);
        this.resolveStop = null;
        this.stopPromise = null;
        this.chunks = [];
        this.stream?.getTracks().forEach((track) => track.stop());
        this.stream = null;
        this.recorder = null;
      }, { once: true });
      this.recorder.start();
    } catch (error) {
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.recorder = null;
      throw new VoiceRecorderError("无法访问麦克风，请检查权限后改用文本输入。", error);
    }
  }

  async stop(): Promise<Blob | null> {
    if (!this.recorder || this.recorder.state !== "recording") return null;
    const pending = this.stopPromise;
    this.recorder.stop();
    return pending ?? null;
  }

  cancel(): void {
    if (!this.recorder) return;
    this.recorder.onstop = null;
    if (this.recorder.state !== "inactive") this.recorder.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.resolveStop?.(null);
    this.resolveStop = null;
    this.stopPromise = null;
  }
}
