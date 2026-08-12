import { RuleEngine } from "./ruleEngine.js";
import { validateBotResponse } from "./responseValidator.js";
import type { ConversationContext, LLMProvider, LLMUsageCoordinator, RouteDecision, VirtualUserProfile } from "./virtualUserTypes.js";

const directGeneration: LLMUsageCoordinator = {
  generate: (_virtualUserId, _roomId, _maxTokens, generation) => generation()
};

export class HybridResponseEngine {
  constructor(
    private readonly llm: LLMProvider,
    private readonly rules = new RuleEngine(),
    private readonly usage: LLMUsageCoordinator = directGeneration,
    private readonly maxTokens: number | null = null
  ) {}

  decide(profile: VirtualUserProfile, context: ConversationContext, message: string): RouteDecision {
    const decision = this.rules.route(message, context, profile);
    return decision.route === "RULE" && decision.confidence < 0.8
      ? { route: "LLM", confidence: 1 - decision.confidence }
      : decision;
  }

  async respond(profile: VirtualUserProfile, context: ConversationContext, message: string, decision = this.decide(profile, context, message)) {
    if (decision.route === "IGNORE") return null;
    if (decision.route === "RULE" && decision.response) return validateBotResponse(decision.response, context, profile);
    if (this.llm.available === false) return this.rules.fallback(message, context, profile);
    try {
      const response = await this.usage.generate(
        profile.id,
        context.roomId,
        this.maxTokens,
        () => this.llm.generateResponse(profile, context, message)
      );
      if (!response) return this.rules.fallback(message, context, profile);
      const validated = validateBotResponse(response.text, context, profile);
      if (validated) return validated;
      return this.rules.fallback(message, context, profile);
    } catch (error) {
      console.warn(`[VirtualUser] LLM unavailable for ${profile.id}; using rules.`, error instanceof Error ? error.message : error);
      return this.rules.fallback(message, context, profile);
    }
  }
}
