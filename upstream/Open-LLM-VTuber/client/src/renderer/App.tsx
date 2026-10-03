import { useEffect, useMemo, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { PetStage } from "./components/PetStage";
import { SettingsPanel } from "./components/SettingsPanel";
import { AudioPlayer } from "./audio/AudioPlayer";
import { postChat } from "./api/chatClient";
import { postMockChat } from "./api/mockChatClient";
import { loadClientConfig, saveClientConfig } from "./config/clientConfig";
import { CharacterStateMachine } from "./live2d/CharacterStateMachine";
import { LipSyncController } from "./live2d/LipSyncController";
import type { ClientConfig } from "./config/defaultConfig";
import type { ChatMessage, ChatRequest } from "./types/chat";
import type { CharacterPresentation } from "./types/character";

export function App() {
  const stateMachine = useMemo(() => new CharacterStateMachine(), []);
  const lipSync = useMemo(() => new LipSyncController(), []);
  const [config, setConfig] = useState<ClientConfig>(() => loadClientConfig());
  const [presentation, setPresentation] = useState<CharacterPresentation>(() => stateMachine.getSnapshot());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "system", text: "客户端已就绪，可使用 Mock 模式独立演示。", createdAt: Date.now() }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const lastTextRef = useRef("");

  const audioPlayer = useMemo(
    () =>
      new AudioPlayer({
        onStart: () => {
          stateMachine.speakingStarted();
          lipSync.start();
        },
        onEnded: () => {
          lipSync.stop();
          stateMachine.speakingEnded();
        },
        onError: (message) => {
          lipSync.stop();
          setError(message);
        }
      }),
    [lipSync, stateMachine]
  );

  useEffect(() => stateMachine.subscribe(setPresentation), [stateMachine]);

  useEffect(() => {
    lipSync.onLevel((level) => stateMachine.setLipSyncLevel(level));
  }, [lipSync, stateMachine]);

  useEffect(() => {
    saveClientConfig(config);
    audioPlayer.setVolume(config.volume);
    void window.desktopPet?.setAlwaysOnTop(config.alwaysOnTop);
    void window.desktopPet?.setOpacity(config.opacity);
  }, [audioPlayer, config]);

  useEffect(() => window.desktopPet?.onOpenSettings(() => setSettingsOpen(true)), []);

  async function sendMessage(text = input): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    lastTextRef.current = trimmed;
    setInput("");
    setBusy(true);
    setError(null);
    stateMachine.userMessageSent();
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: trimmed, createdAt: Date.now() }]);

    const request: ChatRequest = {
      session_id: "local-user-001",
      character_id: config.characterId,
      input_type: "text",
      text: trimmed,
      audio_base64: null,
      client_state: {
        current_motion: presentation.motion,
        language: config.language
      }
    };

    try {
      const response = config.mockMode
        ? await postMockChat(request)
        : await postChat(request, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs });

      stateMachine.applyBackendResponse(response);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.reply_text,
          emotion: response.emotion,
          motion: response.motion,
          createdAt: Date.now()
        }
      ]);

      if (config.autoPlayVoice) {
        const played = await audioPlayer.play({ audioUrl: response.audio_url, audioBase64: response.audio_base64 });
        if (!played) {
          window.setTimeout(() => stateMachine.speakingEnded(), Math.max(1200, response.duration_ms || 2200));
        }
      } else if (response.audio_url || response.audio_base64) {
        window.setTimeout(() => stateMachine.speakingEnded(), Math.max(1200, response.duration_ms || 2200));
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "请求失败。";
      setError(message);
      stateMachine.requestFailed(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="topbar no-drag">
        <span className={config.mockMode ? "mode-badge mock" : "mode-badge"}>{config.mockMode ? "Mock" : "Backend"}</span>
        <button type="button" onClick={() => setSettingsOpen(true)} title="打开设置">
          <Settings size={18} />
        </button>
      </div>
      <PetStage modelPath={config.modelPath} scale={config.characterScale} presentation={presentation} />
      <ChatPanel
        messages={messages}
        input={input}
        busy={busy}
        error={error}
        voiceInputEnabled={config.voiceInputEnabled}
        onInputChange={setInput}
        onSend={() => void sendMessage()}
        onRetry={() => void sendMessage(lastTextRef.current)}
      />
      <SettingsPanel open={settingsOpen} config={config} onChange={setConfig} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
