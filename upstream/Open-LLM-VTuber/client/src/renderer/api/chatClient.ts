import { ChatClientError, type ChatRequest, type ChatResponse } from "../types/chat";
import { parseChatResponse } from "./parseChatResponse";

export interface ChatClientOptions {
  baseUrl: string;
  timeoutMs: number;
  token?: string;
}

export async function postChat(request: ChatRequest, options: ChatClientOptions): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), options.timeoutMs);
  const token = options.token?.trim();

  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok) {
      let code = `HTTP_${response.status}`;
      let message = `后端返回异常状态码：${response.status}`;
      try {
        const payload = await response.json() as { error?: { code?: unknown; message?: unknown } };
        if (payload.error && typeof payload.error.code === "string") code = payload.error.code;
        if (payload.error && typeof payload.error.message === "string") message = payload.error.message;
      } catch {
        // Keep the status-derived error when the body is not JSON.
      }
      throw new ChatClientError(message, code, response.status);
    }

    return parseChatResponse(await response.json(), request);
  } catch (error) {
    if (error instanceof ChatClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ChatClientError("请求超时，请检查后端服务地址。", "TIMEOUT", undefined, error);
    }
    throw new ChatClientError("无法连接后端服务，请确认 /api/chat 可访问。", "NETWORK", undefined, error);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
