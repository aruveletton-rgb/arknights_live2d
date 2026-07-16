import { Mic, RotateCcw, Send } from "lucide-react";
import type { ChatMessage } from "../types/chat";

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  error: string | null;
  voiceInputEnabled: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
}

export function ChatPanel({ messages, input, busy, error, voiceInputEnabled, onInputChange, onSend, onRetry }: ChatPanelProps) {
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
        <button type="button" className="icon-button" disabled={!voiceInputEnabled || busy} title="语音输入占位">
          <Mic size={18} />
        </button>
        <button type="button" className="send-button" onClick={onSend} disabled={busy || !input.trim()} title="发送">
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}
