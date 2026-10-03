type LevelListener = (level: number) => void;

export class LipSyncController {
  private timer: ReturnType<typeof globalThis.setInterval> | undefined;
  private listener: LevelListener | undefined;

  onLevel(listener: LevelListener): void {
    this.listener = listener;
  }

  start(): void {
    this.stop();
    this.timer = globalThis.setInterval(() => {
      const level = 0.18 + Math.random() * 0.72;
      this.listener?.(level);
    }, 90);
  }

  stop(): void {
    if (this.timer !== undefined) globalThis.clearInterval(this.timer);
    this.timer = undefined;
    this.listener?.(0);
  }
}
