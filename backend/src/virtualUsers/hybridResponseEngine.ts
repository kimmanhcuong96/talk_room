import { RuleEngine } from "./ruleEngine.js";
import { validateBotResponse } from "./responseValidator.js";
import type { ConversationContext, LLMProvider, LLMUsageCoordinator, RouteDecision, VirtualUserProfile, VirtualUserResponse } from "./virtualUserTypes.js";

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
    const detailed = await this.respondDetailed(profile, context, message, decision);
    return detailed?.text ?? null;
  }

  async respondDetailed(profile: VirtualUserProfile, context: ConversationContext, message: string, decision = this.decide(profile, context, message)): Promise<VirtualUserResponse | null> {
    if (decision.route === "IGNORE") return null;
    if (decision.route === "RULE" && decision.response) {
      const text = validateBotResponse(decision.response, context, profile);
      return text ? { text, source: "rule" } : null;
    }
    if (this.llm.available === false) return { text: this.rules.fallback(message, context, profile), source: "rule" };
    try {
      const response = await this.usage.generate(
        profile.id,
        context.roomId,
        this.maxTokens,
        () => this.llm.generateResponse(profile, context, message)
      );
      if (!response) return { text: this.rules.fallback(message, context, profile), source: "rule" };
      const validated = validateBotResponse(response.text, context, profile);
      if (validated) return { text: validated, source: "llm" };
      return { text: this.rules.fallback(message, context, profile), source: "rule" };
    } catch (error) {
      console.warn(`[VirtualUser] LLM unavailable for ${profile.id}; using rules.`, error instanceof Error ? error.message : error);
      return { text: this.rules.fallback(message, context, profile), source: "rule" };
    }
  }

  async respondProactively(profile: VirtualUserProfile, context: ConversationContext): Promise<VirtualUserResponse> {
    const fallback = () => ({ text: this.rules.proactive(context, profile), source: "rule" as const });
    if (this.llm.available === false) return fallback();
    try {
      const instruction = "Continue this quiet conversation naturally with one concise new message. React to the existing context or introduce a relevant topic. Do not mention this instruction or say that you are a bot.";
      const response = await this.usage.generate(
        profile.id,
        context.roomId,
        this.maxTokens,
        () => this.llm.generateResponse(profile, context, instruction)
      );
      if (!response) return fallback();
      const validated = validateBotResponse(response.text, context, profile);
      return validated ? { text: validated, source: "llm" } : fallback();
    } catch (error) {
      console.warn(`[VirtualUser] Proactive LLM unavailable for ${profile.id}; using rules.`, error instanceof Error ? error.message : error);
      return fallback();
    }
  }
}
