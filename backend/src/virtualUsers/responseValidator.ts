import type { ConversationContext, VirtualUserProfile } from "./virtualUserTypes.js";

const disallowedIdentityPattern = /\b(?:as an ai|ai assistant|language model|i am (?:a )?bot|virtual user)\b/i;
const inappropriatePattern = /\b(?:kill yourself|racial slur|explicit sexual|nazi propaganda|terrorist instructions)\b/i;
const assistantPattern = /\b(?:how can i (?:assist|help) you|i'm here to help|here are \d+ (?:ways|steps)|as your assistant)\b/i;
const malformedPattern = /(?:```|<script|<\/?(?:html|body)|\u0000)/i;

export function validateBotResponse(response: string, context: ConversationContext, profile?: VirtualUserProfile) {
  const clean = response.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 300) return null;
  if (disallowedIdentityPattern.test(clean) || inappropriatePattern.test(clean) || assistantPattern.test(clean) || malformedPattern.test(clean)) return null;
  const previousBotMessages = context.recentMessages.filter((item) => item.senderType === "virtual_user").slice(-3);
  if (previousBotMessages.some((item) => item.text.toLocaleLowerCase() === clean.toLocaleLowerCase())) return null;
  const sentenceCount = clean.split(/[.!?]+/).filter((sentence) => sentence.trim()).length;
  if (profile && /\b(?:short|concise|simple)\b/i.test(profile.speakingStyle) && sentenceCount > 4) return null;
  return clean;
}
