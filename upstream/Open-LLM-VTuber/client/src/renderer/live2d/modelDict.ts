import type { CharacterExpression, CharacterMotion } from "../types/character";

const expressions: readonly CharacterExpression[] = ["neutral", "smile", "serious", "worried", "sad", "surprised", "thinking", "confident"];
const motions: readonly CharacterMotion[] = ["idle", "greeting", "nod", "shake", "think", "encourage", "battle_ready"];
const anchors = ["bottom-right", "bottom-left", "center"] as const;

export interface ModelDictEntry {
  modelPath: string;
  scale: number;
  initialPosition: { anchor: "bottom-right" | "bottom-left" | "center"; offsetX: number; offsetY: number };
  defaultExpression: CharacterExpression;
  emotionMap: Partial<Record<CharacterExpression, CharacterExpression>>;
  motionMap: Partial<Record<CharacterMotion, CharacterMotion>>;
  tapMotions: CharacterMotion[];
  placeholder?: boolean;
}

export type ModelDict = Record<string, ModelDictEntry>;

export function normalizeExpression(value: unknown): CharacterExpression {
  return expressions.includes(value as CharacterExpression) ? (value as CharacterExpression) : "neutral";
}

export function normalizeMotion(value: unknown): CharacterMotion {
  return motions.includes(value as CharacterMotion) ? (value as CharacterMotion) : "idle";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasValidExpressionMap(value: unknown): value is Partial<Record<CharacterExpression, CharacterExpression>> {
  return isRecord(value) && Object.entries(value).every(([key, mapped]) =>
    expressions.includes(key as CharacterExpression) && expressions.includes(mapped as CharacterExpression)
  );
}

function hasValidMotionMap(value: unknown): value is Partial<Record<CharacterMotion, CharacterMotion>> {
  return isRecord(value) && Object.entries(value).every(([key, mapped]) =>
    motions.includes(key as CharacterMotion) && motions.includes(mapped as CharacterMotion)
  );
}

export function validateModelDictEntry(value: unknown): value is ModelDictEntry {
  if (!isRecord(value)) return false;
  const entry = value as Partial<ModelDictEntry>;
  const position = entry.initialPosition;
  return typeof entry.modelPath === "string" && entry.modelPath.length > 0 &&
    isFiniteNumber(entry.scale) && entry.scale > 0 && isRecord(position) &&
    anchors.includes(position.anchor as (typeof anchors)[number]) &&
    isFiniteNumber(position.offsetX) && isFiniteNumber(position.offsetY) &&
    expressions.includes(entry.defaultExpression as CharacterExpression) &&
    hasValidExpressionMap(entry.emotionMap) && hasValidMotionMap(entry.motionMap) &&
    Array.isArray(entry.tapMotions) && entry.tapMotions.every((motion) => motions.includes(motion as CharacterMotion)) &&
    (entry.placeholder === undefined || typeof entry.placeholder === "boolean");
}

export async function loadModelDict(path: string): Promise<ModelDictEntry | null> {
  try {
    const response = await fetch(path, { method: "GET" });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return validateModelDictEntry(value) ? value : null;
  } catch {
    return null;
  }
}

export function mapExpression(entry: ModelDictEntry | null, value: unknown): CharacterExpression {
  const normalized = normalizeExpression(value);
  return normalizeExpression(entry?.emotionMap[normalized] ?? normalized);
}

export function mapMotion(entry: ModelDictEntry | null, value: unknown): CharacterMotion {
  const normalized = normalizeMotion(value);
  return normalizeMotion(entry?.motionMap[normalized] ?? normalized);
}
