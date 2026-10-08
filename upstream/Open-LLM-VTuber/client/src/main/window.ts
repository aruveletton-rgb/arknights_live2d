import { BrowserWindow, app, ipcMain, screen } from "electron";
import fs from "node:fs";
import path from "node:path";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const boundsPath = path.join(app.getPath("userData"), "window-bounds.json");
let isQuitting = false;

interface SavedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

app.on("before-quit", () => {
  isQuitting = true;
});

function readSavedBounds(): SavedBounds | null {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(boundsPath, "utf8"));
    if (!value || typeof value !== "object") return null;
    const bounds = value as Partial<SavedBounds>;
    if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) return null;
    return {
      x: Math.round(bounds.x!),
      y: Math.round(bounds.y!),
      width: Math.round(bounds.width!),
      height: Math.round(bounds.height!)
    };
  } catch {
    return null;
  }
}

function restoreVisibleBounds(saved: SavedBounds | null): SavedBounds {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  if (!saved) {
    const { workArea } = primary;
    const width = Math.min(460, workArea.width);
    const height = Math.min(680, workArea.height);
    return { x: workArea.x + workArea.width - width - 28, y: workArea.y + workArea.height - height - 28, width, height };
  }

  const matchingDisplay = displays
    .map((display) => {
      const left = Math.max(saved.x, display.workArea.x);
      const top = Math.max(saved.y, display.workArea.y);
      const right = Math.min(saved.x + saved.width, display.workArea.x + display.workArea.width);
      const bottom = Math.min(saved.y + saved.height, display.workArea.y + display.workArea.height);
      return { display, overlap: Math.max(0, right - left) * Math.max(0, bottom - top) };
    })
    .sort((a, b) => b.overlap - a.overlap)[0];
  const workArea = matchingDisplay?.overlap ? matchingDisplay.display.workArea : primary.workArea;
  const width = Math.min(Math.max(360, saved.width), workArea.width);
  const height = Math.min(Math.max(500, saved.height), workArea.height);
  const x = Math.min(Math.max(saved.x, workArea.x), workArea.x + workArea.width - width);
  const y = Math.min(Math.max(saved.y, workArea.y), workArea.y + workArea.height - height);
  return { x, y, width, height };
}

function persistBounds(window: BrowserWindow): void {
  if (window.isDestroyed() || window.isMinimized() || !window.isVisible()) return;
  const bounds = window.getBounds();
  const temporaryPath = `${boundsPath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(boundsPath), { recursive: true });
    fs.writeFileSync(temporaryPath, JSON.stringify(bounds), "utf8");
    fs.renameSync(temporaryPath, boundsPath);
  } catch (error) {
    console.warn("[desktop-pet] unable to persist window bounds", error);
  }
}

export function createPetWindow(): BrowserWindow {
  const bounds = restoreVisibleBounds(readSavedBounds());

  const window = new BrowserWindow({
    ...bounds,
    minWidth: Math.min(360, bounds.width),
    minHeight: Math.min(500, bounds.height),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    title: "Arknights VTuber Pet",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.setAlwaysOnTop(true, "floating");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  ipcMain.handle("window:set-always-on-top", (_event, value: boolean) => {
    window.setAlwaysOnTop(value, "floating");
    return value;
  });

  ipcMain.handle("window:set-opacity", (_event, value: number) => {
    const opacity = Math.max(0.3, Math.min(1, value));
    window.setOpacity(opacity);
    return opacity;
  });

  ipcMain.handle("window:open-settings", () => {
    window.webContents.send("app:open-settings");
  });

  return window;
}

export function registerLifecycle(window: BrowserWindow): void {
  let saveTimer: NodeJS.Timeout | undefined;
  const schedulePersist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistBounds(window), 250);
  };

  window.on("move", schedulePersist);
  window.on("resize", schedulePersist);
  window.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    } else {
      persistBounds(window);
    }
  });

  window.on("closed", () => {
    if (saveTimer) clearTimeout(saveTimer);
    ipcMain.removeHandler("window:set-always-on-top");
    ipcMain.removeHandler("window:set-opacity");
    ipcMain.removeHandler("window:open-settings");
  });

  app.on("before-quit", () => {
    if (!window.isDestroyed()) {
      window.removeAllListeners();
    }
  });
}
