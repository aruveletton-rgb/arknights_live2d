/// <reference types="vite/client" />

interface DesktopPetBridge {
  setAlwaysOnTop: (value: boolean) => Promise<boolean>;
  setOpacity: (value: number) => Promise<number>;
  onOpenSettings: (callback: () => void) => () => void;
}

interface Window {
  desktopPet?: DesktopPetBridge;
}
