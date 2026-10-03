import type { ChatRequest, ChatResponse } from "../types/chat";

const mockReplies: ChatResponse[] = [
  {
    reply_text: "博士，当前系统运行正常。作战记录已经同步完成。",
    emotion: "happy",
    motion: "nod",
    audio_url: null,
    audio_base64: null,
    duration_ms: 2500
  },
  {
    reply_text: "我正在整理线索，请稍等。这个任务需要再核对一次条件。",
    emotion: "thinking",
    motion: "think",
    audio_url: null,
    audio_base64: null,
    duration_ms: 2800
  },
  {
    reply_text: "博士，这条指令看起来不完整。要不要补充目标地点或干员名单？",
    emotion: "confused",
    motion: "shake_head",
    audio_url: null,
    audio_base64: null,
    duration_ms: 3200
  },
  {
    reply_text: "收到。当前风险等级偏高，我建议先确认后勤补给再出发。",
    emotion: "serious",
    motion: "alert",
    audio_url: null,
    audio_base64: null,
    duration_ms: 3000
  },
  {
    reply_text: "通讯链路出现异常，但客户端没有崩溃。我已经切换到错误提示状态。",
    emotion: "error",
    motion: "alert",
    audio_url: null,
    audio_base64: null,
    duration_ms: 2600
  }
];

export async function postMockChat(request: ChatRequest): Promise<ChatResponse> {
  const index = Math.abs(hashText(request.text)) % mockReplies.length;
  await new Promise((resolve) => globalThis.setTimeout(resolve, 450));
  return mockReplies[index];
}

export function listMockReplies(): ChatResponse[] {
  return [...mockReplies];
}

function hashText(text: string): number {
  return [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 7);
}
