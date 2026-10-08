import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Move, Settings } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { PetStage } from "./components/PetStage";
import { SettingsPanel } from "./components/SettingsPanel";
import { AudioPlayer } from "./audio/AudioPlayer";
import { VoiceRecorder, VoiceRecorderError } from "./audio/VoiceRecorder";
import { ReminderPanel } from "./components/ReminderPanel";
import { collectDueReminders, createReminder, deleteReminder, loadReminders, snoozeReminder, type Reminder, type ReminderDraft } from "./reminders";
import { postChat } from "./api/chatClient";
import { AsrClientError, postAsr } from "./api/asrClient";
import { postMockChat } from "./api/mockChatClient";
import { AccountClientError, addMemory, deleteMemory, loadAccountData, loginAccount, logoutAccount, type AccountUser, type MemoryRecord } from "./api/accountClient";
import { loadClientConfig, saveClientConfig } from "./config/clientConfig";
import { clearAccountToken, loadAccountToken, saveAccountToken } from "./config/accountSession";
import { getOrCreateSessionId } from "./config/session";
import { CharacterStateMachine } from "./live2d/CharacterStateMachine";
import type { ClientConfig } from "./config/defaultConfig";
import type { ChatMessage, ChatRequest } from "./types/chat";
import type { CharacterPresentation } from "./types/character";

export function App() {
  const stateMachine = useMemo(() => new CharacterStateMachine(), []);
  const [config, setConfig] = useState<ClientConfig>(() => loadClientConfig());
  const [presentation, setPresentation] = useState<CharacterPresentation>(() => stateMachine.getSnapshot());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "system", text: "客户端已就绪，可使用 Mock 模式独立演示。", createdAt: Date.now() }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders());
  const [missedReminders, setMissedReminders] = useState(0);
  const [recording, setRecording] = useState(false);
  const [accountToken, setAccountToken] = useState(() => loadAccountToken());
  const [accountUser, setAccountUser] = useState<AccountUser | null>(() => loadAccountToken() ? { id: 0, username: "已登录", role: "user" } : null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const lastTextRef = useRef("");
  const voiceRecorder = useMemo(() => new VoiceRecorder(), []);

  const audioPlayer = useMemo(
    () =>
      new AudioPlayer({
        onStart: () => {
          stateMachine.speakingStarted();
        },
        onEnded: () => {
          stateMachine.speakingEnded();
        },
        onError: (message) => {
          setError(message);
        },
        onLevel: (level) => stateMachine.setLipSyncLevel(level)
      }),
    [stateMachine]
  );

  useEffect(() => stateMachine.subscribe(setPresentation), [stateMachine]);

  useEffect(() => {
    saveClientConfig(config);
    audioPlayer.setVolume(config.volume);
    void window.desktopPet?.setAlwaysOnTop(config.alwaysOnTop);
    void window.desktopPet?.setOpacity(config.opacity);
  }, [audioPlayer, config]);

  useEffect(() => window.desktopPet?.onOpenSettings(() => setSettingsOpen(true)), []);

  useEffect(() => {
    if (!accountToken || config.mockMode) return;
    let active = true;
    setAccountBusy(true);
    void loadAccountData(accountToken, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, serviceToken: config.clientToken })
      .then(({ messages: history, memories: loadedMemories }) => {
        if (!active) return;
        setMessages([
          { id: "welcome", role: "system", text: "账号历史已载入。", createdAt: Date.now() },
          ...history.map((message) => ({ id: `history-${message.id}`, role: message.role, text: message.text, createdAt: Date.parse(message.created_at) || Date.now() } as ChatMessage))
        ]);
        setMemories(loadedMemories);
        setAccountError(null);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof AccountClientError && caught.status === 401) {
          clearAccountToken();
          setAccountToken("");
          setAccountUser(null);
        }
        setAccountError(caught instanceof Error ? caught.message : "账号数据载入失败。");
      })
      .finally(() => { if (active) setAccountBusy(false); });
    return () => { active = false; };
  }, [accountToken, config.backendBaseUrl, config.clientToken, config.mockMode, config.requestTimeoutMs]);

  useEffect(() => {
    const notify = (items: Reminder[]) => {
      if (!items.length) return;
      setMissedReminders((count) => count + items.length);
      for (const item of items) {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("桌宠提醒", { body: item.title });
        if (item.sound && typeof AudioContext !== "undefined") {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 880;
          gain.gain.value = 0.04;
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.14);
        }
      }
    };
    const tick = () => {
      const due = collectDueReminders();
      if (due.length) {
        notify(due);
        setReminders(loadReminders());
      }
    };
    tick();
    const timer = globalThis.setInterval(tick, 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  function addReminder(draft: ReminderDraft): void {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
      createReminder(draft);
      setReminders(loadReminders());
      setRemindersOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提醒创建失败。");
    }
  }

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
      session_id: getOrCreateSessionId(),
      character_id: config.characterId,
      input_type: "text",
      text: trimmed,
      enable_tts: config.autoPlayVoice,
      language: config.language,
      client_state: { current_motion: presentation.motion, language: config.language }
    };

    try {
      const response = config.mockMode
        ? await postMockChat(request)
        : await postChat(request, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, token: accountToken || config.clientToken });

      stateMachine.applyBackendResponse(response);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.text,
          emotion: response.emotion,
          motion: response.motion,
          createdAt: Date.now()
        }
      ]);

      if (config.autoPlayVoice) {
        const played = await audioPlayer.play({ audioUrl: response.audio_url, audioBase64: response.audio_base64, mimeType: response.mime_type });
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

  async function startVoiceRecording(): Promise<void> {
    if (busy || recording) return;
    setError(null);
    try {
      if (config.mockMode) {
        setRecording(true);
        return;
      }
      await voiceRecorder.start();
      setRecording(true);
    } catch (caught) {
      const message = caught instanceof VoiceRecorderError ? caught.message : "无法访问麦克风，请改用文本输入。";
      setError(message);
    }
  }

  async function stopVoiceRecording(): Promise<void> {
    if (!recording) return;
    setRecording(false);
    try {
      if (config.mockMode) {
        setInput("博士，今天有什么任务？");
        return;
      }
      const audio = await voiceRecorder.stop();
      if (!audio) return;
      const response = await postAsr(audio, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, token: accountToken || config.clientToken, language: config.language });
      setInput(response.text);
    } catch (caught) {
      const message = caught instanceof AsrClientError ? caught.message : "语音识别失败，请改用文本输入。";
      setError(message);
    }
  }

  async function login(username: string, password: string): Promise<void> {
    setAccountBusy(true);
    setAccountError(null);
    try {
      const session = await loginAccount(username, password, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, serviceToken: config.clientToken });
      saveAccountToken(session.access_token);
      setAccountToken(session.access_token);
      setAccountUser(session.user);
    } catch (caught) {
      setAccountError(caught instanceof Error ? caught.message : "登录失败。");
    } finally {
      setAccountBusy(false);
    }
  }

  async function logout(): Promise<void> {
    const token = accountToken;
    setAccountBusy(true);
    try {
      if (token) await logoutAccount(token, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, serviceToken: config.clientToken });
    } catch {
      // Local logout still clears the session when the backend is unavailable.
    } finally {
      clearAccountToken();
      setAccountToken("");
      setAccountUser(null);
      setMemories([]);
      setAccountBusy(false);
    }
  }

  async function remember(content: string): Promise<void> {
    if (!accountToken) return;
    setAccountBusy(true);
    try {
      const response = await addMemory(content, accountToken, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, serviceToken: config.clientToken });
      setMemories((current) => [response.memory, ...current]);
      setAccountError(null);
    } catch (caught) {
      setAccountError(caught instanceof Error ? caught.message : "记忆保存失败。");
    } finally {
      setAccountBusy(false);
    }
  }

  async function forget(id: number): Promise<void> {
    if (!accountToken) return;
    setAccountBusy(true);
    try {
      await deleteMemory(id, accountToken, { baseUrl: config.backendBaseUrl, timeoutMs: config.requestTimeoutMs, serviceToken: config.clientToken });
      setMemories((current) => current.filter((memory) => memory.id !== id));
      setAccountError(null);
    } catch (caught) {
      setAccountError(caught instanceof Error ? caught.message : "记忆删除失败。");
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="topbar">
        <div className="drag-handle drag-region" title="拖动窗口" aria-label="拖动窗口">
          <Move size={17} />
        </div>
        <span className={config.mockMode ? "mode-badge mock" : "mode-badge"}>{config.mockMode ? "Mock" : "Backend"}</span>
        <button type="button" className="no-drag" onClick={() => { setRemindersOpen((open) => !open); setMissedReminders(0); }} title="打开提醒">
          <Bell size={18} />
          {missedReminders ? <span className="notification-count">{missedReminders}</span> : null}
        </button>
        <button type="button" className="no-drag" onClick={() => setSettingsOpen(true)} title="打开设置">
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
        recording={recording}
        onInputChange={setInput}
        onSend={() => void sendMessage()}
        onRetry={() => void sendMessage(lastTextRef.current)}
        onVoiceStart={() => void startVoiceRecording()}
        onVoiceStop={() => void stopVoiceRecording()}
      />
      <SettingsPanel
        open={settingsOpen}
        config={config}
        onChange={setConfig}
        onClose={() => setSettingsOpen(false)}
        accountUser={accountUser}
        accountBusy={accountBusy}
        accountError={accountError}
        memories={memories}
        onLogin={(username, password) => void login(username, password)}
        onLogout={() => void logout()}
        onAddMemory={(content) => void remember(content)}
        onDeleteMemory={(id) => void forget(id)}
      />
      <ReminderPanel
        open={remindersOpen}
        reminders={reminders}
        onCreate={addReminder}
        onDelete={(id) => { deleteReminder(id); setReminders(loadReminders()); }}
        onSnooze={(id) => { snoozeReminder(id); setReminders(loadReminders()); }}
        onClose={() => setRemindersOpen(false)}
      />
    </main>
  );
}
