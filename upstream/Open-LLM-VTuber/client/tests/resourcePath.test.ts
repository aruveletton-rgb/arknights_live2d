import { describe, expect, it } from "vitest";
import { resolveModelUrl } from "../src/renderer/live2d/Live2DRenderer";

describe("resolveModelUrl", () => {
  it("resolves root model paths inside packaged file URLs", () => {
    expect(resolveModelUrl("/characters/operator/model.model3.json", "file:///C:/app/dist/renderer/index.html"))
      .toBe("file:///C:/app/dist/renderer/characters/operator/model.model3.json");
  });

  it("keeps server root paths on http URLs", () => {
    expect(resolveModelUrl("/characters/operator/model.model3.json", "http://127.0.0.1:5173/"))
      .toBe("http://127.0.0.1:5173/characters/operator/model.model3.json");
  });
});
