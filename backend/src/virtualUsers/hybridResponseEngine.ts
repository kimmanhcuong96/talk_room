import { RuleEngine } from "./ruleEngine.js";
import { selectSentenceCount, validateBotResponse } from "./responseValidator.js";
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

  async classifyEnglish(profile: VirtualUserProfile, context: ConversationContext, message: string): Promise<boolean | null> {
    if (this.llm.available === false || !this.llm.classifyEnglish) return null;
    try {
      const response = await this.usage.generate(
        profile.id,
        context.roomId,
        this.maxTokens,
        () => this.llm.classifyEnglish!(message)
      );
      if (!response) return null;
      const match = response.text.match(/"?is_english"?\s*:\s*(true|false)/i);
      return match ? match[1]!.toLocaleLowerCase() === "true" : null;
    } catch (error) {
      console.warn(`[VirtualUser] Language classification unavailable for ${profile.id}.`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  async respond(profile: VirtualUserProfile, context: ConversationContext, message: string, decision = this.decide(profile, context, message)) {
    const detailed = await this.respondDetailed(profile, context, message, decision);
    return detailed?.text ?? null;
  }

  async respondDetailed(profile: VirtualUserProfile, context: ConversationContext, message: string, decision = this.decide(profile, context, message), sentenceCount = selectSentenceCount(profile)): Promise<VirtualUserResponse | null> {
    if (decision.route === "IGNORE") return null;
    if (decision.route === "RULE" && decision.response) {
      const text = validateBotResponse(decision.response, context, profile, sentenceCount);
      return text ? { text, source: "rule" } : null;
    }
    const safeFallback = sentenceCount === 1
      ? "I understand."
      : sentenceCount === 2
        ? "I understand. What about you?"
        : "I understand. What about you? I'm curious to hear your take.";
    const fallback = () => validateBotResponse(this.rules.fallback(message, context, profile), context, profile, sentenceCount) ?? safeFallback;
    if (this.llm.available === false) return { text: fallback(), source: "rule" };
    try {
      const response = await this.usage.generate(
        profile.id,
        context.roomId,
        this.maxTokens,
        () => this.llm.generateResponse(profile, context, message, sentenceCount)
      );
      if (!response) return { text: fallback(), source: "rule" };
      const validated = validateBotResponse(response.text, context, profile, sentenceCount);
      if (validated) return { text: validated, source: "llm" };
      return { text: fallback(), source: "rule" };
    } catch (error) {
      console.warn(`[VirtualUser] LLM unavailable for ${profile.id}; using rules.`, error instanceof Error ? error.message : error);
      return { text: fallback(), source: "rule" };
    }
  }

  async respondProactively(profile: VirtualUserProfile, context: ConversationContext): Promise<VirtualUserResponse> {
    const sentenceCount = selectSentenceCount(profile);
    const safeFallback = sentenceCount === 1
      ? "How is your day going?"
      : sentenceCount === 2
        ? "I was thinking about our chat. How is your day going?"
        : "I was thinking about our chat. It has been quiet for a while. How is your day going?";
    const fallback = () => ({ text: validateBotResponse(this.rules.proactive(context, profile), context, profile, sentenceCount) ?? safeFallback, source: "rule" as const });
    if (this.llm.available === false) return fallback();
    try {
      const instruction = "Continue this quiet conversation naturally with one concise new message. React to the existing context or introduce a relevant topic. Do not mention this instruction or say that you are a bot.";
      const response = await this.usage.generate(
        profile.id,
        context.roomId,
        this.maxTokens,
        () => this.llm.generateResponse(profile, context, instruction, sentenceCount)
      );
      if (!response) return fallback();
      const validated = validateBotResponse(response.text, context, profile, sentenceCount);
      return validated ? { text: validated, source: "llm" } : fallback();
    } catch (error) {
      console.warn(`[VirtualUser] Proactive LLM unavailable for ${profile.id}; using rules.`, error instanceof Error ? error.message : error);
      return fallback();
    }
  }
}
