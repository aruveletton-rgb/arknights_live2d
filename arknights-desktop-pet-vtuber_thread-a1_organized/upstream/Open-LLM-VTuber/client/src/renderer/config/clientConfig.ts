import { defaultConfig, type ClientConfig } from "./defaultConfig";

const storageKey = "arknights-vtuber-pet.config.v1";

export function loadClientConfig(): ClientConfig {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return defaultConfig;

  try {
    const parsed = JSON.parse(raw) as Partial<ClientConfig>;
    return { ...defaultConfig, ...parsed };
  } catch {
    return defaultConfig;
  }
}

export function saveClientConfig(config: ClientConfig): void {
  localStorage.setItem(storageKey, JSON.stringify(config));
}

export function resetClientConfig(): ClientConfig {
  localStorage.removeItem(storageKey);
  return defaultConfig;
}
