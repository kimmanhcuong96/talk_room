import { RuleEngine } from "./ruleEngine.js";
import { validateBotResponse } from "./responseValidator.js";
import type { ConversationContext, LLMProvider, RouteDecision, VirtualUserProfile } from "./virtualUserTypes.js";

export class HybridResponseEngine {
  constructor(private readonly llm: LLMProvider, private readonly rules = new RuleEngine()) {}

  decide(profile: VirtualUserProfile, context: ConversationContext, message: string): RouteDecision {
    const decision = this.rules.route(message, context, profile);
    return decision.route === "RULE" && decision.confidence < 0.8
      ? { route: "LLM", confidence: 1 - decision.confidence }
      : decision;
  }

  async respond(profile: VirtualUserProfile, context: ConversationContext, message: string, decision = this.decide(profile, context, message)) {
    if (decision.route === "IGNORE") return null;
    if (decision.route === "RULE" && decision.response) return validateBotResponse(decision.response, context, profile);
    try {
      const response = await this.llm.generateResponse(profile, context, message);
      return validateBotResponse(response, context, profile) ?? this.rules.fallback(message, context, profile);
    } catch (error) {
      console.warn(`[VirtualUser] LLM unavailable for ${profile.id}; using rules.`, error instanceof Error ? error.message : error);
      return this.rules.fallback(message, context, profile);
    }
  }
}
