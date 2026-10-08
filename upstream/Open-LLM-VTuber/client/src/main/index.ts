import { app } from "electron";
import { createPetWindow, registerLifecycle } from "./window";
import { createTray, destroyTray } from "./tray";

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
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

  app.on("window-all-closed", () => {
    // Keep the tray process alive after the frameless window is closed.
  });

  app.on("before-quit", () => {
    destroyTray();
    console.info("[desktop-pet] stopped");
  });
}
