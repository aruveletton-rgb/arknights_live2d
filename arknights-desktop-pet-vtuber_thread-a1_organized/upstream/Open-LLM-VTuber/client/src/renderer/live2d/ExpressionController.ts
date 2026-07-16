import type { CharacterExpression } from "../types/character";

export class ExpressionController {
  private current: CharacterExpression = "neutral";

  apply(expression: CharacterExpression): CharacterExpression {
    this.current = expression;
    return this.current;
  }

  getCurrent(): CharacterExpression {
    return this.current;
  }
}
