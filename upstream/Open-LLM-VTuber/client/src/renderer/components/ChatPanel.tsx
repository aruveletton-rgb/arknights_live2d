import { Mic, RotateCcw, Send } from "lucide-react";
import type { ChatMessage } from "../types/chat";

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  error: string | null;
  voiceInputEnabled: boolean;
  recording: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}

export function ChatPanel({ messages, input, busy, error, voiceInputEnabled, recording, onInputChange, onSend, onRetry, onVoiceStart, onVoiceStop }: ChatPanelProps) {
  return (
    <section className="chat-panel no-drag">
      <div className="history">
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      {error ? (
        <div className="error-row">
          <span>{error}</span>
          <button type="button" onClick={onRetry} title="重试">
            <RotateCcw size={16} />
          </button>
        </div>
      ) : null}
      <div className="input-row">
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) onSend();
          }}
          placeholder="博士，今天有什么任务？"
          disabled={busy}
        />
        <button
          type="button"
          className={`icon-button${recording ? " recording" : ""}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            onVoiceStart();
          }}
          onPointerUp={onVoiceStop}
          onPointerCancel={onVoiceStop}
          onPointerLeave={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) onVoiceStop();
          }}
          disabled={!voiceInputEnabled || busy}
          title={recording ? "松开结束录音" : "按住录音"}
        >
          <Mic size={18} />
        </button>
        <button type="button" className="send-button" onClick={onSend} disabled={busy || !input.trim()} title="发送">
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}
