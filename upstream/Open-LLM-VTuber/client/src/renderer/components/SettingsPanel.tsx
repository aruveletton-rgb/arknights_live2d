import { LogIn, LogOut, Plus, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { AccountUser, MemoryRecord } from "../api/accountClient";
import type { ClientConfig } from "../config/defaultConfig";

interface SettingsPanelProps {
  open: boolean;
  config: ClientConfig;
  onChange: (config: ClientConfig) => void;
  onClose: () => void;
  accountUser: AccountUser | null;
  accountBusy: boolean;
  accountError: string | null;
  memories: MemoryRecord[];
  onLogin: (username: string, password: string) => void;
  onLogout: () => void;
  onAddMemory: (content: string) => void;
  onDeleteMemory: (id: number) => void;
}

export function SettingsPanel({ open, config, onChange, onClose, accountUser, accountBusy, accountError, memories, onLogin, onLogout, onAddMemory, onDeleteMemory }: SettingsPanelProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  if (!open) return null;

  const update = <K extends keyof ClientConfig>(key: K, value: ClientConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <aside className="settings-panel no-drag">
      <header>
        <Settings size={18} />
        <h2>设置</h2>
        <button type="button" onClick={onClose} title="关闭设置">
          <X size={18} />
        </button>
      </header>
      <label>
        <span>后端服务地址</span>
        <input value={config.backendBaseUrl} onChange={(event) => update("backendBaseUrl", event.target.value)} />
      </label>
      <label>
        <span>访问令牌</span>
        <input type="password" autoComplete="off" value={config.clientToken} onChange={(event) => update("clientToken", event.target.value)} />
      </label>
      <section className="account-settings">
        <div className="account-heading"><strong>账号</strong>{accountUser ? <span>{accountUser.username}</span> : null}</div>
        {accountUser ? (
          <>
            <button type="button" className="account-action" onClick={onLogout} disabled={accountBusy}><LogOut size={15} />退出登录</button>
            <div className="memory-list">
              <span className="account-label">长期记忆</span>
              {memories.map((memory) => (
                <div className="memory-row" key={memory.id}>
                  <span>{memory.content}</span>
                  <button type="button" onClick={() => onDeleteMemory(memory.id)} title="删除记忆"><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="memory-add">
                <input value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} placeholder="添加一条记忆" />
                <button type="button" onClick={() => { if (memoryDraft.trim()) { onAddMemory(memoryDraft.trim()); setMemoryDraft(""); } }} disabled={accountBusy || !memoryDraft.trim()} title="添加记忆"><Plus size={15} /></button>
              </div>
            </div>
          </>
        ) : (
          <>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="用户名" autoComplete="username" />
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" autoComplete="current-password" />
            <button type="button" className="account-action" onClick={() => onLogin(username.trim(), password)} disabled={accountBusy || !username.trim() || !password}><LogIn size={15} />登录</button>
          </>
        )}
        {accountError ? <span className="account-error">{accountError}</span> : null}
      </section>
      <label>
        <span>语言</span>
        <select value={config.language} onChange={(event) => update("language", event.target.value)}>
          <option value="zh-CN">中文</option>
          <option value="ja-JP">日本語</option>
        </select>
      </label>
      <label>
        <span>角色模型路径</span>
        <input value={config.modelPath} onChange={(event) => update("modelPath", event.target.value)} />
      </label>
      <label className="toggle">
        <span>窗口置顶</span>
        <input type="checkbox" checked={config.alwaysOnTop} onChange={(event) => update("alwaysOnTop", event.target.checked)} />
      </label>
      <label>
        <span>角色缩放比例 {config.characterScale.toFixed(2)}</span>
        <input type="range" min="0.65" max="1.35" step="0.05" value={config.characterScale} onChange={(event) => update("characterScale", Number(event.target.value))} />
      </label>
      <label>
        <span>音量 {Math.round(config.volume * 100)}%</span>
        <input type="range" min="0" max="1" step="0.05" value={config.volume} onChange={(event) => update("volume", Number(event.target.value))} />
      </label>
      <label>
        <span>透明度 {Math.round(config.opacity * 100)}%</span>
        <input type="range" min="0.35" max="1" step="0.05" value={config.opacity} onChange={(event) => update("opacity", Number(event.target.value))} />
      </label>
      <label className="toggle">
        <span>启用语音输入</span>
        <input type="checkbox" checked={config.voiceInputEnabled} onChange={(event) => update("voiceInputEnabled", event.target.checked)} />
      </label>
      <label className="toggle">
        <span>自动播放语音</span>
        <input type="checkbox" checked={config.autoPlayVoice} onChange={(event) => update("autoPlayVoice", event.target.checked)} />
      </label>
      <label className="toggle">
        <span>Mock 模式</span>
        <input type="checkbox" checked={config.mockMode} onChange={(event) => update("mockMode", event.target.checked)} />
      </label>
    </aside>
  );
}
