import type { ChatRequest, ChatResponse } from "../types/chat";

export interface ChatClientOptions {
  baseUrl: string;
  timeoutMs: number;
}

export class ChatClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ChatClientError";
  }
}

export async function postChat(request: ChatRequest, options: ChatClientOptions): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ChatClientError(`后端返回异常状态码：${response.status}`);
    }

    return (await response.json()) as ChatResponse;
  } catch (error) {
    if (error instanceof ChatClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ChatClientError("请求超时，请检查后端服务地址。", error);
    }
    throw new ChatClientError("无法连接后端服务，请确认 /api/chat 可访问。", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
