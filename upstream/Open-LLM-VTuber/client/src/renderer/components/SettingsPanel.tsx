import { Settings, X } from "lucide-react";
import type { ClientConfig } from "../config/defaultConfig";

interface SettingsPanelProps {
  open: boolean;
  config: ClientConfig;
  onChange: (config: ClientConfig) => void;
  onClose: () => void;
}

export function SettingsPanel({ open, config, onChange, onClose }: SettingsPanelProps) {
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
