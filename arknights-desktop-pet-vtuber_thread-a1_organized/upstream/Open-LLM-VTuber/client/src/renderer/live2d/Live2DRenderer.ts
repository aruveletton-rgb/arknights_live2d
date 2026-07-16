import type { CharacterPresentation } from "../types/character";

export interface Live2DRendererOptions {
  modelPath: string;
  scale: number;
}

export interface Live2DRenderStatus {
  loaded: boolean;
  error: string | null;
  modelPath: string;
}

export class Live2DRenderer {
  private status: Live2DRenderStatus;

  constructor(private readonly root: HTMLElement, options: Live2DRendererOptions) {
    this.status = { loaded: false, error: null, modelPath: options.modelPath };
    this.root.style.setProperty("--pet-scale", String(options.scale));
  }

  async load(modelPath: string): Promise<Live2DRenderStatus> {
    this.status = { loaded: false, error: null, modelPath };
    this.root.dataset.modelPath = modelPath;

    try {
      const response = await fetch(modelPath, { method: "GET" });
      if (!response.ok) throw new Error(`model config ${response.status}`);
      this.status = { loaded: true, error: null, modelPath };
    } catch {
      this.status = {
        loaded: false,
        error: "未找到 Live2D 模型，已切换到占位角色。请在设置中填写 model3.json 路径。",
        modelPath
      };
    }
    return this.status;
  }

  update(presentation: CharacterPresentation): void {
    this.root.dataset.state = presentation.state;
    this.root.dataset.motion = presentation.motion;
    this.root.dataset.expression = presentation.expression;
    this.root.style.setProperty("--lip-level", String(presentation.lipSyncLevel));
  }

  setScale(scale: number): void {
    this.root.style.setProperty("--pet-scale", String(scale));
  }

  getStatus(): Live2DRenderStatus {
    return { ...this.status };
  }
}
