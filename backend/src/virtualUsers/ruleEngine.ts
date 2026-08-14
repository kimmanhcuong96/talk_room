import { buildCommonEnglishFallback } from "./commonEnglishPhraseBank.js";
import { assessEnglishMessage } from "./languageDetection.js";
import type { ConversationContext, RouteDecision, VirtualUserProfile } from "./virtualUserTypes.js";

const normalizedReactionPattern = /^(?:ha(?:ha)+|lol+|lmao|rofl|[\p{Extended_Pictographic}\uFE0F\s]+)$/iu;
const greetingPattern = /^(?:hi|hello|hey|hiya|good (?:morning|afternoon|evening))[!.\s]*$/i;
const thanksPattern = /^(?:thanks|thank you|thx|ty)[!.\s]*$/i;
const byePattern = /^(?:bye|goodbye|see you|cya|good night)[!.\s]*$/i;
const boringFallbackPattern = /\b(?:interesting|tell me more|good question|what do you think|your opinion)\b/i;

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

const singleSentenceVoicePromptResponses = [
  "I can't use the mic or camera, so please chat with me here.",
  "I can't hear voice here, but I'll answer if you type it in chat.",
  "Please send that as text because I can't use the mic.",
  "I can only chat by text here, so type your message to me.",
  "Voice won't reach me, so please write your message in chat.",
  "I can't join by mic or camera, but I can talk with you in text.",
  "Please type what you said because I can't hear the mic.",
  "I am text-only here, so send me a chat message instead.",
  "I can't pick up audio, but I can read anything you type here.",
  "Let's use chat because I can't access the mic or camera.",
  "I won't hear voice in this room, so please message me in text.",
  "The mic doesn't work for me, but chat works perfectly.",
  "I can reply in chat even though I can't hear your voice.",
  "Please write it here because I can't listen through the mic.",
  "I can't use voice or camera, so let's keep talking in chat."
] as const;

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]!;
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
    singleSentenceProbability: 70,
    twoSentenceProbability: 30,
    leaveWhenRejectedProbability: 70,
    nonEnglishReminderCooldownSeconds: 60,
    enabled: true,
    updatedAt: new Date(0).toISOString()
  };
}

export function getVoicePromptResponse(sentenceCount: 1 | 2 = 2) {
  return pick(sentenceCount === 1 ? singleSentenceVoicePromptResponses : voicePromptResponses);
}

function fallbackFor(message: string, profile: VirtualUserProfile) {
  if (assessEnglishMessage(message).stronglyNonEnglish) return "Could you write that in English?";
  return buildCommonEnglishFallback(message, profile);
}

export class RuleEngine {
  route(message: string, context: ConversationContext, profile: VirtualUserProfile): RouteDecision {
    const clean = message.trim();
    if (!clean) return { route: "IGNORE", confidence: 1 };
    const previousBotMessage = [...context.recentMessages].reverse().find((item) => item.senderType === "virtual_user");
    const botAskedQuestion = previousBotMessage?.text.includes("?") ?? false;

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
    return "I get you. There is more feeling in that than it looks at first.";
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
