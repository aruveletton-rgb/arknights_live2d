import type { CharacterMotion } from "../types/character";

export class MotionController {
  private current: CharacterMotion = "idle";

  play(motion: CharacterMotion): CharacterMotion {
    this.current = motion;
    return this.current;
  }

  getCurrent(): CharacterMotion {
    return this.current;
  }
}
