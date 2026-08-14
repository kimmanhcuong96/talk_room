import type { ConversationContext, VirtualUserProfile } from "./virtualUserTypes.js";

const disallowedIdentityPattern = /\b(?:as an ai|ai assistant|language model|i am (?:a )?bot|virtual user)\b/i;
const inappropriatePattern = /\b(?:kill yourself|racial slur|explicit sexual|nazi propaganda|terrorist instructions)\b/i;
const assistantPattern = /\b(?:how can i (?:assist|help) you|i'm here to help|here are \d+ (?:ways|steps)|as your assistant)\b/i;
const malformedPattern = /(?:```|<script|<\/?(?:html|body)|\u0000)/i;

export function selectSentenceCount(
  profile: Pick<VirtualUserProfile, "singleSentenceProbability" | "twoSentenceProbability">,
  random = Math.random
): 1 | 2 {
  return random() * 100 < profile.singleSentenceProbability ? 1 : 2;
}

function sentenceParts(value: string) {
  return value.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

export function fitBotResponseToSentenceCount(response: string, target: 1 | 2) {
  const clean = response.replace(/\s+/g, " ").trim();
  const parts = sentenceParts(clean);
  if (!parts.length) return clean;
  const selected = parts.slice(0, target);
  if (target === 2 && selected.length === 1) {
    selected.push(/[?]$/.test(selected[0]!) ? "I'd like to hear your take." : "What about you?");
  }
  return selected.map((part) => /[.!?]$/.test(part) ? part : `${part}.`).join(" ");
}

export function countBotResponseSentences(response: string) {
  return sentenceParts(response).length;
}

export function validateBotResponse(response: string, context: ConversationContext, profile?: VirtualUserProfile, sentenceCount?: 1 | 2) {
  const clean = response.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 300) return null;
  if (disallowedIdentityPattern.test(clean) || inappropriatePattern.test(clean) || assistantPattern.test(clean) || malformedPattern.test(clean)) return null;
  const fitted = sentenceCount ? fitBotResponseToSentenceCount(clean, sentenceCount) : clean;
  const previousBotMessages = context.recentMessages.filter((item) => item.senderType === "virtual_user").slice(-3);
  if (previousBotMessages.some((item) => item.text.toLocaleLowerCase() === fitted.toLocaleLowerCase())) return null;
  if (countBotResponseSentences(fitted) > 2) return null;
  return fitted;
}
