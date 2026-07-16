export interface ClientConfig {
  backendBaseUrl: string;
  characterId: string;
  modelPath: string;
  alwaysOnTop: boolean;
  characterScale: number;
  volume: number;
  opacity: number;
  voiceInputEnabled: boolean;
  autoPlayVoice: boolean;
  mockMode: boolean;
  requestTimeoutMs: number;
  language: string;
}

export const defaultConfig: ClientConfig = {
  backendBaseUrl: "http://127.0.0.1:8000",
  characterId: "operator_default",
  modelPath: "/characters/placeholder_operator/placeholder.model3.json",
  alwaysOnTop: true,
  characterScale: 1,
  volume: 0.85,
  opacity: 1,
  voiceInputEnabled: false,
  autoPlayVoice: true,
  mockMode: import.meta.env.VITE_MOCK_CHAT === "1" || import.meta.env.VITE_MOCK_CHAT === "true",
  requestTimeoutMs: 15000,
  language: "zh-CN"
};
