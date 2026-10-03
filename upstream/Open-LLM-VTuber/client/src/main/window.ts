import { BrowserWindow, app, ipcMain, screen } from "electron";
import path from "node:path";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const width = 460;
  const height = 680;
  const margin = 28;

  const window = new BrowserWindow({
    width,
    height,
    x: display.workArea.x + display.workArea.width - width - margin,
    y: display.workArea.y + display.workArea.height - height - margin,
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
  window.on("closed", () => {
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
