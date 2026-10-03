import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopPet", {
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke("window:set-always-on-top", value),
  setOpacity: (value: number) => ipcRenderer.invoke("window:set-opacity", value),
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("app:open-settings", handler);
    return () => ipcRenderer.removeListener("app:open-settings", handler);
  }
});
