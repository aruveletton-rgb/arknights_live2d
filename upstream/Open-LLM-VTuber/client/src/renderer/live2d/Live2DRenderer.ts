import type { CharacterPresentation } from "../types/character";
import { loadModelDict, mapExpression, mapMotion, type ModelDictEntry } from "./modelDict";

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
  private modelDict: ModelDictEntry | null = null;
  private loadGeneration = 0;

  constructor(private readonly root: HTMLElement, options: Live2DRendererOptions) {
    this.status = { loaded: false, error: null, modelPath: options.modelPath };
    this.root.style.setProperty("--pet-scale", String(options.scale));
  }

  async load(modelPath: string): Promise<Live2DRenderStatus> {
    const generation = ++this.loadGeneration;
    this.status = { loaded: false, error: null, modelPath };
    this.root.dataset.modelPath = modelPath;

    try {
      const modelUrl = resolveModelUrl(modelPath);
      const response = await fetch(modelUrl, { method: "GET" });
      if (!response.ok) throw new Error(`model config HTTP ${response.status}`);
      const model = await response.json() as { type?: string };
      if (model.type !== "placeholder-live2d") throw new Error("unsupported model format");
      const dictPath = new URL("model_dict.json", modelUrl).href;
      this.modelDict = await loadModelDict(dictPath);
      if (generation !== this.loadGeneration) return this.getStatus();
      this.status = { loaded: true, error: null, modelPath };
    } catch (error) {
      if (generation !== this.loadGeneration) return this.getStatus();
      const detail = error instanceof Error ? error.message : "unknown error";
      this.status = {
        loaded: false,
        error: `模型资源加载失败（${detail}）。当前为占位角色；请检查模型路径和资源文件。`,
        modelPath
      };
    }
    return this.status;
  }

  update(presentation: CharacterPresentation): void {
    this.root.dataset.state = presentation.state;
    this.root.dataset.motion = mapMotion(this.modelDict, presentation.motion);
    this.root.dataset.expression = mapExpression(this.modelDict, presentation.expression);
    this.root.style.setProperty("--lip-level", String(presentation.lipSyncLevel));
  }

  setScale(scale: number): void {
    this.root.style.setProperty("--pet-scale", String(scale));
  }

  getStatus(): Live2DRenderStatus {
    return { ...this.status };
  }
}

export function resolveModelUrl(modelPath: string, baseUrl = document.baseURI): string {
  const normalized = modelPath.replace(/\\/g, "/");
  if (new URL(baseUrl).protocol === "file:" && normalized.startsWith("/")) {
    return new URL(normalized.replace(/^\/+/, ""), baseUrl).href;
  }
  return new URL(normalized, baseUrl).href;
}
