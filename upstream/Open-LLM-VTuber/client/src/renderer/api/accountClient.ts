export interface AccountUser {
  id: number;
  username: string;
  role: "user" | "admin";
}

export interface AccountSession {
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  user: AccountUser;
}

export interface HistoryMessage {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  text: string;
  language: string;
  created_at: string;
}

export interface MemoryRecord {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

interface AccountClientOptions {
  baseUrl: string;
  timeoutMs: number;
  serviceToken?: string;
}

export class AccountClientError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AccountClientError";
  }
}

async function requestJson<T>(path: string, init: RequestInit, options: AccountClientOptions, accountToken?: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), options.timeoutMs);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accountToken) headers.set("Authorization", `Bearer ${accountToken}`);
  if (options.serviceToken?.trim()) headers.set("X-API-Token", options.serviceToken.trim());
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.error?.message === "string" ? payload.error.message : `后端返回异常状态码：${response.status}`;
      throw new AccountClientError(message, response.status);
    }
    return payload as T;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export function loginAccount(username: string, password: string, options: AccountClientOptions): Promise<AccountSession> {
  return requestJson<AccountSession>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }, options);
}

export function logoutAccount(token: string, options: AccountClientOptions): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, options, token);
}

export async function loadAccountData(token: string, options: AccountClientOptions): Promise<{ messages: HistoryMessage[]; memories: MemoryRecord[] }> {
  const [history, memory] = await Promise.all([
    requestJson<{ messages: HistoryMessage[] }>("/api/history", { method: "GET" }, options, token),
    requestJson<{ memories: MemoryRecord[] }>("/api/memory", { method: "GET" }, options, token)
  ]);
  return { messages: history.messages, memories: memory.memories };
}

export function addMemory(content: string, token: string, options: AccountClientOptions): Promise<{ memory: MemoryRecord }> {
  return requestJson<{ memory: MemoryRecord }>("/api/memory", { method: "POST", body: JSON.stringify({ content, confirmed: true }) }, options, token);
}

export function deleteMemory(id: number, token: string, options: AccountClientOptions): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(`/api/memory/${id}`, { method: "DELETE" }, options, token);
}
