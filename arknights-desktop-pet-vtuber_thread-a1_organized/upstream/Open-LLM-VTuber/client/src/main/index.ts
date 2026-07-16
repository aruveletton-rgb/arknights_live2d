import { app } from "electron";
import { createPetWindow, registerLifecycle } from "./window";
import { createTray, destroyTray } from "./tray";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("ready", () => {
  console.info("[desktop-pet] starting");
  const window = createPetWindow();
  registerLifecycle(window);
  createTray(window);

  app.on("second-instance", () => {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("before-quit", () => {
  destroyTray();
  console.info("[desktop-pet] stopped");
});
