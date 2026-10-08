export interface AsrClientOptions {
  baseUrl: string;
  timeoutMs: number;
  token?: string;
  language?: string;
}

export interface AsrResponse {
  text: string;
  provider: string;
  confidence: number;
  error: { code: string; message: string } | null;
}

export class AsrClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AsrClientError";
  }
}

export async function postAsr(audio: Blob | string, options: AsrClientOptions): Promise<AsrResponse> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), options.timeoutMs);
  const token = options.token?.trim();
  const body = new FormData();
  if (audio instanceof Blob) body.append("file", audio, "recording.webm");
  else body.append("text", audio);
  body.append("language", options.language ?? "zh-CN");

  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/asr`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
      signal: controller.signal
    });

    if (!response.ok) {
      let message = `语音识别服务返回异常状态码：${response.status}`;
      try {
        const payload = await response.json() as { error?: { message?: unknown } };
        if (typeof payload.error?.message === "string") message = payload.error.message;
      } catch {
        // Keep the status-derived error when the body is not JSON.
      }
      throw new AsrClientError(message);
    }

    return (await response.json()) as AsrResponse;
  } catch (error) {
    if (error instanceof AsrClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AsrClientError("语音识别超时，请改用文本输入。", error);
    }
    throw new AsrClientError("无法连接语音识别服务，请改用文本输入。", error);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
