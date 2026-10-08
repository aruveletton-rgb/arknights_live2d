export interface AsrClientOptions {
  baseUrl: string;
  timeoutMs: number;
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

export async function postAsr(fixtureText: string, options: AsrClientOptions): Promise<AsrResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/asr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_format: "mock", text: fixtureText }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new AsrClientError(`语音识别服务返回异常状态码：${response.status}`);
    }

    return (await response.json()) as AsrResponse;
  } catch (error) {
    if (error instanceof AsrClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AsrClientError("语音识别超时，请改用文本输入。", error);
    }
    throw new AsrClientError("无法连接语音识别服务，请改用文本输入。", error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
