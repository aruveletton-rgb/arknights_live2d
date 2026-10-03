import { BrowserWindow, Menu, Tray, app, nativeImage } from "electron";

let tray: Tray | null = null;

export function createTray(window: BrowserWindow): Tray {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIklEQVR42mP8z8AARLJgwiCWjmoY1TCqYVTDqIZRDQMA7n4CH2y6pwQAAAAASUVORK5CYII="
  );
  tray = new Tray(icon);
  tray.setToolTip("Arknights VTuber Pet");

  const menu = Menu.buildFromTemplate([
    {
      label: "显示/隐藏",
      click: () => {
        if (window.isVisible()) window.hide();
        else {
          window.show();
          window.focus();
        }
      }
    },
    {
      label: "打开设置",
      click: () => window.webContents.send("app:open-settings")
    },
    {
      label: "重启",
      click: () => {
        app.relaunch();
        app.exit(0);
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    window.show();
    window.focus();
  });
  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
