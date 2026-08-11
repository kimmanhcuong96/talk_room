import type { ConversationContext, RouteDecision, VirtualUserProfile } from "./virtualUserTypes.js";

const normalizedReactionPattern = /^(?:ha(?:ha)+|lol+|lmao|rofl|[\p{Extended_Pictographic}\uFE0F\s]+)$/iu;
const greetingPattern = /^(?:hi|hello|hey|hiya|good (?:morning|afternoon|evening))[!.\s]*$/i;
const thanksPattern = /^(?:thanks|thank you|thx|ty)[!.\s]*$/i;
const byePattern = /^(?:bye|goodbye|see you|cya|good night)[!.\s]*$/i;

function pick(items: readonly string[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

export class RuleEngine {
  route(message: string, context: ConversationContext, profile: VirtualUserProfile): RouteDecision {
    const clean = message.trim();
    if (!clean) return { route: "IGNORE", confidence: 1 };
    const previousBotMessage = [...context.recentMessages].reverse().find((item) => item.senderType === "virtual_user");
    const botAskedQuestion = previousBotMessage?.text.includes("?") ?? false;

    if (greetingPattern.test(clean)) {
      const beginner = /^(?:A1|A2)$/i.test(profile.englishLevel);
      return { route: "RULE", confidence: 0.99, response: beginner ? pick(["Hi! 👋", "Hello! 😊"]) : pick(["Hey! 👋", "Hi! Nice to meet you 😊", "Hello! How's it going?"]) };
    }
    if (thanksPattern.test(clean)) {
      return { route: "RULE", confidence: 0.99, response: pick(["You're welcome! 😊", "Anytime!", "No problem!"]) };
    }
    if (byePattern.test(clean)) {
      return { route: "RULE", confidence: 0.99, response: pick(["See you! 👋", "Bye! Talk soon.", "Have a good one!"]) };
    }
    if (normalizedReactionPattern.test(clean) && clean.length <= 24) {
      if (botAskedQuestion) return { route: "LLM", confidence: 0.82 };
      if (/^[\p{Extended_Pictographic}\uFE0F\s]+$/u.test(clean)) {
        return { route: "RULE", confidence: 0.95, response: clean.slice(0, 8) };
      }
      return Math.random() < 0.5
        ? { route: "IGNORE", confidence: 0.9 }
        : { route: "RULE", confidence: 0.9, response: pick(["Haha 😄", "😂", "Right? 😄"]) };
    }

    if (/^(?:ok(?:ay)?|sure|got it|i see)[!.\s]*$/i.test(clean)) {
      return botAskedQuestion
        ? { route: "LLM", confidence: 0.84 }
        : { route: "RULE", confidence: 0.9, response: pick(["Yeah 😊", "Right!", "Exactly."]) };
    }

    const contextConfidence = 0.78
      + (context.topic ? 0.04 : 0)
      + (context.recentMessages.length > 0 ? 0.03 : 0)
      + (profile.personality ? 0.01 : 0);
    return { route: "LLM", confidence: Math.min(0.95, contextConfidence) };
  }

  fallback(message: string) {
    if (message.includes("?")) return pick(["That's a good question. What do you think?", "Hmm, I'm not totally sure. What's your take?", "I'd like to hear your opinion first."]);
    return pick(["That sounds interesting!", "I see what you mean.", "Tell me a little more.", "Oh, really? 😊"]);
  }
}
