import type { ConversationContext, SentenceCount, VirtualUserProfile } from "./virtualUserTypes.js";

const disallowedIdentityPattern = /\b(?:as an ai|ai assistant|language model|i am (?:a )?bot|virtual user)\b/i;
const inappropriatePattern = /\b(?:kill yourself|racial slur|explicit sexual|nazi propaganda|terrorist instructions)\b/i;
const assistantPattern = /\b(?:how can i (?:assist|help) you|i'm here to help|here are \d+ (?:ways|steps)|as your assistant)\b/i;
const malformedPattern = /(?:```|<script|<\/?(?:html|body)|\u0000)/i;

export function selectSentenceCount(
  profile: Pick<VirtualUserProfile, "singleSentenceProbability" | "twoSentenceProbability" | "threeSentenceProbability">,
  random = Math.random
): SentenceCount {
  const roll = random() * 100;
  if (roll < profile.singleSentenceProbability) return 1;
  return roll < profile.singleSentenceProbability + profile.twoSentenceProbability ? 2 : 3;
}

function sentenceParts(value: string) {
  return value.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

export function fitBotResponseToSentenceCount(response: string, target: SentenceCount) {
  const clean = response.replace(/\s+/g, " ").trim();
  const parts = sentenceParts(clean);
  if (!parts.length) return clean;
  const selected = parts.slice(0, target);
  const firstIsQuestion = /[?]$/.test(selected[0]!);
  const fillers = firstIsQuestion
    ? ["I'd like to hear your take.", "I'm curious about your experience."]
    : ["What about you?", "I'm curious to hear your take."];
  while (selected.length < target) {
    selected.push(fillers[selected.length - 1] ?? "I'm curious to hear your take.");
  }
  return selected.map((part) => /[.!?]$/.test(part) ? part : `${part}.`).join(" ");
}

export function countBotResponseSentences(response: string) {
  return sentenceParts(response).length;
}

export function validateBotResponse(response: string, context: ConversationContext, profile?: VirtualUserProfile, sentenceCount?: SentenceCount) {
  const clean = response.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 300) return null;
  if (disallowedIdentityPattern.test(clean) || inappropriatePattern.test(clean) || assistantPattern.test(clean) || malformedPattern.test(clean)) return null;
  const fitted = sentenceCount ? fitBotResponseToSentenceCount(clean, sentenceCount) : clean;
  const previousBotMessages = context.recentMessages.filter((item) => item.senderType === "virtual_user").slice(-3);
  if (previousBotMessages.some((item) => item.text.toLocaleLowerCase() === fitted.toLocaleLowerCase())) return null;
  if (countBotResponseSentences(fitted) > 3) return null;
  return fitted;
}
