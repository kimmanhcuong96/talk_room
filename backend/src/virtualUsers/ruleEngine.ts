import { buildCommonEnglishFallback } from "./commonEnglishPhraseBank.js";
import type { ConversationContext, RouteDecision, VirtualUserProfile } from "./virtualUserTypes.js";

const normalizedReactionPattern = /^(?:ha(?:ha)+|lol+|lmao|rofl|[\p{Extended_Pictographic}\uFE0F\s]+)$/iu;
const greetingPattern = /^(?:hi|hello|hey|hiya|good (?:morning|afternoon|evening))[!.\s]*$/i;
const thanksPattern = /^(?:thanks|thank you|thx|ty)[!.\s]*$/i;
const byePattern = /^(?:bye|goodbye|see you|cya|good night)[!.\s]*$/i;
const boringFallbackPattern = /\b(?:interesting|tell me more|good question|what do you think|your opinion)\b/i;

const nonEnglishFallbacks = [
  "I don't understand that language yet. Could you write it in English?",
  "I am not sure I understand that. Can you send it in English?",
  "Sorry, I can only follow English here. Could you type that again in English?",
  "I might miss your meaning in that language. English would work better for me.",
  "I don't want to guess wrong. Could you write that in English?",
  "I cannot understand that clearly yet. Try it in English and I will reply properly.",
  "That language is hard for me to read right now. Can we use English?",
  "I am losing the meaning there. Send it in English and I will keep up.",
  "I don't fully understand that message. Could you switch to English?",
  "I can chat much better if you write that in English."
] as const;

export const voicePromptResponses = [
  "I can't use the mic or camera here, but I can chat with you. Type it and I'll answer.",
  "I can only do text in this room. Send me a message here and I'll follow along.",
  "I can't hear voice or use camera, sadly. Write it in chat and I'm with you.",
  "I am text-only here, so I may miss anything you say out loud. Drop it in chat?",
  "I can't listen through the mic, but I can reply fast if you type it.",
  "Voice won't reach me here. Send the same idea as a chat message and I'll answer.",
  "I wish I could use the mic, but I can't. Let's keep it in chat.",
  "I can't join the voice side of the room. Text me and I'll stay with you.",
  "I won't be able to hear that, but I can read chat perfectly.",
  "I am better in text here. Type what you wanted to say and I'll respond.",
  "I may look like I am in the room, but I cannot hear the mic. Chat is the best way to reach me.",
  "I can't pick up audio here. Write the line in chat and I'll answer like normal.",
  "The mic side is out of reach for me. Send it as text and I can keep up.",
  "I won't catch voice or camera, but I am right here in chat.",
  "If you are talking out loud, I will probably miss it. Type it here and I will reply."
] as const;

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

function hasVietnameseText(value: string) {
  return /[\u0103\u00e2\u0111\u00ea\u00f4\u01a1\u01b0\u00e1\u00e0\u1ea3\u00e3\u1ea1\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ed\u00ec\u1ec9\u0129\u1ecb\u00f3\u00f2\u1ecf\u00f5\u1ecd\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00fa\u00f9\u1ee7\u0169\u1ee5\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u00fd\u1ef3\u1ef7\u1ef9\u1ef5]/i.test(value)
    || /\b(?:toi|ban|minh|khong|duoc|ngon ngu|tieng viet|tra loi|hieu|chao|cam on|xin loi|tai sao|lam sao)\b/i.test(value);
}

function hasLikelyNonEnglishText(value: string) {
  if (hasVietnameseText(value)) return true;
  const letters = value.match(/\p{L}/gu) ?? [];
  if (!letters.length) return false;
  const asciiLetters = value.match(/[a-z]/gi) ?? [];
  return asciiLetters.length / letters.length < 0.7;
}

function makeDefaultProfile(): VirtualUserProfile {
  return {
    id: "bot-01",
    name: "Emma",
    avatarUrl: null,
    englishLevel: "B1",
    personality: "Friendly and curious",
    interests: ["music", "food", "travel"],
    speakingStyle: "Casual and concise",
    replyProbability: 1,
    proactiveMessageProbability: 0.5,
    longResponseDelayMinSeconds: 5,
    longResponseDelayMaxSeconds: 15,
    enabled: true,
    updatedAt: new Date(0).toISOString()
  };
}

export function getVoicePromptResponse() {
  return pick(voicePromptResponses);
}

function fallbackFor(message: string, profile: VirtualUserProfile) {
  if (hasLikelyNonEnglishText(message)) return pick(nonEnglishFallbacks);
  return buildCommonEnglishFallback(message, profile);
}

export class RuleEngine {
  route(message: string, context: ConversationContext, profile: VirtualUserProfile): RouteDecision {
    const clean = message.trim();
    if (!clean) return { route: "IGNORE", confidence: 1 };
    const previousBotMessage = [...context.recentMessages].reverse().find((item) => item.senderType === "virtual_user");
    const botAskedQuestion = previousBotMessage?.text.includes("?") ?? false;

    if (hasLikelyNonEnglishText(clean)) {
      return { route: "RULE", confidence: 0.98, response: pick(nonEnglishFallbacks) };
    }

    if (greetingPattern.test(clean)) {
      const beginner = /^(?:A1|A2)$/i.test(profile.englishLevel);
      return { route: "RULE", confidence: 0.99, response: beginner ? pick(["Hi!", "Hello!"]) : pick(["Hey!", "Hi! Nice to meet you.", "Hello! How's it going?"]) };
    }
    if (thanksPattern.test(clean)) {
      return { route: "RULE", confidence: 0.99, response: pick(["You're welcome!", "Anytime!", "No problem!"]) };
    }
    if (byePattern.test(clean)) {
      return { route: "RULE", confidence: 0.99, response: pick(["See you!", "Bye! Talk soon.", "Have a good one!"]) };
    }
    if (normalizedReactionPattern.test(clean) && clean.length <= 24) {
      if (botAskedQuestion) return { route: "LLM", confidence: 0.82 };
      if (/^[\p{Extended_Pictographic}\uFE0F\s]+$/u.test(clean)) {
        return { route: "RULE", confidence: 0.95, response: clean.slice(0, 8) };
      }
      return Math.random() < 0.5
        ? { route: "IGNORE", confidence: 0.9 }
        : { route: "RULE", confidence: 0.9, response: pick(["Haha", "I know, right?", "Right?"]) };
    }

    if (/^(?:ok(?:ay)?|sure|got it|i see)[!.\s]*$/i.test(clean)) {
      return botAskedQuestion
        ? { route: "LLM", confidence: 0.84 }
        : { route: "RULE", confidence: 0.9, response: pick(["Yeah.", "Right!", "Exactly."]) };
    }

    const contextConfidence = 0.78
      + (context.topic ? 0.04 : 0)
      + (context.recentMessages.length > 0 ? 0.03 : 0)
      + (profile.personality ? 0.01 : 0);
    return { route: "LLM", confidence: Math.min(0.95, contextConfidence) };
  }

  fallback(message: string, context?: ConversationContext, profile?: VirtualUserProfile) {
    const activeProfile = profile ?? makeDefaultProfile();
    const previousBotMessages = context?.recentMessages.filter((item) => item.senderType === "virtual_user").slice(-3) ?? [];
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const candidate = fallbackFor(message.trim(), activeProfile);
      const duplicate = previousBotMessages.some((item) => item.text.toLocaleLowerCase() === candidate.toLocaleLowerCase());
      if (!boringFallbackPattern.test(candidate) && !duplicate) return candidate;
    }
    return hasLikelyNonEnglishText(message)
      ? "I don't understand that yet. Could you write it in English?"
      : "I get you. There is more feeling in that than it looks at first.";
  }

  proactive(context: ConversationContext, profile: VirtualUserProfile) {
    const topic = context.topic?.trim();
    const interest = pick(profile.interests.length ? profile.interests : ["music", "movies", "travel"]);
    const candidates = topic
      ? [
          `I was still thinking about ${topic}. What part of it interests you most?`,
          `There is probably more to say about ${topic}. Have you had any personal experience with it?`,
          `One thing about ${topic} just crossed my mind. Do you usually enjoy conversations like this?`
        ]
      : [
          `Random question: what have you been enjoying lately?`,
          `I just thought of ${interest}. Are you into that too?`,
          `What kind of day are you having so far?`,
          `Here is a small question: what are you looking forward to this week?`,
          `I am curious—what topic could you talk about for hours?`
        ];
    return pick(candidates);
  }
}
