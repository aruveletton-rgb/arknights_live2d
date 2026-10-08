import { describe, expect, it, vi } from "vitest";
import {
  loadModelDict,
  mapExpression,
  mapMotion,
  normalizeExpression,
  normalizeMotion,
  validateModelDictEntry,
  type ModelDictEntry
} from "../src/renderer/live2d/modelDict";

const validEntry: ModelDictEntry = {
  modelPath: "/characters/placeholder_operator/placeholder.model3.json",
  scale: 1,
  initialPosition: { anchor: "bottom-right", offsetX: -28, offsetY: -28 },
  defaultExpression: "neutral",
  emotionMap: { worried: "serious" },
  motionMap: { greeting: "nod" },
  tapMotions: ["greeting", "nod"],
  placeholder: true
};

describe("modelDict", () => {
  it("accepts a valid model dictionary entry", () => {
    expect(validateModelDictEntry(validEntry)).toBe(true);
  });

  it("rejects invalid paths, anchors, mappings, and motions", () => {
    expect(validateModelDictEntry({ ...validEntry, modelPath: "" })).toBe(false);
    expect(validateModelDictEntry({ ...validEntry, initialPosition: { ...validEntry.initialPosition, anchor: "top" } })).toBe(false);
    expect(validateModelDictEntry({ ...validEntry, emotionMap: { worried: "unknown" } })).toBe(false);
    expect(validateModelDictEntry({ ...validEntry, tapMotions: ["alert"] })).toBe(false);
  });

  it("normalizes unknown values to the contract fallbacks", () => {
    expect(normalizeExpression("unknown")).toBe("neutral");
    expect(normalizeMotion("unknown")).toBe("idle");
    expect(mapExpression(validEntry, "worried")).toBe("serious");
    expect(mapMotion(validEntry, "greeting")).toBe("nod");
    expect(mapExpression(validEntry, "unknown")).toBe("neutral");
    expect(mapMotion(validEntry, "unknown")).toBe("idle");
  });

  it("loads only validated entries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => validEntry }));
    await expect(loadModelDict("/model_dict.json")).resolves.toEqual(validEntry);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...validEntry, scale: 0 }) }));
    await expect(loadModelDict("/model_dict.json")).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});
