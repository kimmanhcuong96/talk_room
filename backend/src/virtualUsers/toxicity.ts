export type ToxicityLevel = "none" | "rude" | "severe";

const departureMessages = [
  "I'm going to leave now because this conversation has become disrespectful. Please keep things civil.",
  "This conversation has crossed a line, so I'm leaving the room. Please speak respectfully to others.",
  "I'm not comfortable continuing a disrespectful conversation, so I'll leave now. Please be considerate next time.",
  "The way this conversation is going is not respectful. I'm going to step away from the room.",
  "I'm leaving because the conversation has become rude. A respectful tone would make this a better space for everyone.",
  "I don't want to continue while the conversation is disrespectful, so I'm leaving. Please keep future chats polite.",
  "This no longer feels like a respectful conversation, so I'll leave the room now.",
  "I'm stepping away because of the disrespectful language. Please treat people with more respect in future chats.",
  "I think it's best for me to leave now. This conversation has become unnecessarily rude.",
  "I'm ending this conversation and leaving the room because the language has become disrespectful.",
] as const;

export function getToxicityDepartureMessage(previousMessage?: string, random = Math.random) {
  const candidates = departureMessages.filter((message) => message !== previousMessage);
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
  return candidates[index] ?? departureMessages[0];
}

function normalizeMessage(text: string) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Keep this policy deliberately target-aware. Matching isolated sensitive words
// creates false positives in language-learning, news, and support conversations.
const severePatterns = [
  /\b(?:kill|hurt|harm)\s+(?:yourself|urself)\b/u,
  /\b(?:i(?:'m| am)\s+(?:going to|gonna)|i(?: will|'ll| want to)|gonna)\s+(?:kill|hurt|harm|rape)\s+(?:you|u)\b/u,
  /\b(?:you|u)\s+(?:should|need to|must)\s+(?:die|kill yourself)\b/u,
  /(?:mày|may)\s+(?:chết|chet|tự tử|tu tu)\s+đi\b/u,
  /\btao\s+(?:sẽ\s+)?(?:giết|giet|đánh|danh)\s+(?:mày|may)\b/u,
];

const rudePatterns = [
  /\b(?:fuck\s+(?:you|u)|stfu|shut\s+(?:the\s+fuck\s+)?up)\b/u,
  /\b(?:you(?:'re| are)?|u(?:'re| r)?)\s+(?:an?\s+)?(?:idiot|stupid|moron|dumbass|asshole|bitch)\b/u,
  /\b(?:idiot|moron|dumbass|asshole|bitch)\s+(?:you|u)\b/u,
  /(?:mày|may)\s+(?:ngu|đần|dan|khốn nạn|khon nan)\b/u,
  /(?:đồ|do)\s+(?:ngu|đần|dan|khốn nạn|khon nan)\b/u,
  /(?:địt|dit|đụ|du)\s+mẹ\s+(?:mày|may)\b/u,
  /(?:mày|may)\s+cút\s+đi\b/u,
];

export function classifyHumanMessage(text: string): ToxicityLevel {
  const clean = normalizeMessage(text);
  if (!clean) return "none";
  if (severePatterns.some((pattern) => pattern.test(clean))) return "severe";
  if (rudePatterns.some((pattern) => pattern.test(clean))) return "rude";
  return "none";
}
