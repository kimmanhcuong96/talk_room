import type { ConversationContext, RouteDecision, VirtualUserProfile } from "./virtualUserTypes.js";
import { buildCommonEnglishFallback } from "./commonEnglishPhraseBank.js";

const normalizedReactionPattern = /^(?:ha(?:ha)+|lol+|lmao|rofl|[\p{Extended_Pictographic}\uFE0F\s]+)$/iu;
const greetingPattern = /^(?:hi|hello|hey|hiya|good (?:morning|afternoon|evening))[!.\s]*$/i;
const thanksPattern = /^(?:thanks|thank you|thx|ty)[!.\s]*$/i;
const byePattern = /^(?:bye|goodbye|see you|cya|good night)[!.\s]*$/i;
const boringFallbackPattern = /\b(?:interesting|tell me more|good question|what do you think|your opinion)\b/i;

function pick(items: readonly string[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

function cleanTopic(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(-4)
    .join(" ");
}

function hasVietnameseText(value: string) {
  return /[\u0103\u00e2\u0111\u00ea\u00f4\u01a1\u01b0\u00e1\u00e0\u1ea3\u00e3\u1ea1\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ed\u00ec\u1ec9\u0129\u1ecb\u00f3\u00f2\u1ecf\u00f5\u1ecd\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00fa\u00f9\u1ee7\u0169\u1ee5\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u00fd\u1ef3\u1ef7\u1ef9\u1ef5]/i.test(value)
    || /\b(?:toi|tôi|ban|bạn|minh|mình|khong|không|duoc|được|ngon ngu|ngôn ngữ|tieng viet|tiếng việt|tra loi|trả lời|hieu|hiểu)\b/i.test(value);
}

function hasLikelyNonEnglishText(value: string) {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (!letters.length) return false;
  const asciiLetters = value.match(/[a-z]/gi) ?? [];
  return asciiLetters.length / letters.length < 0.7;
}

function vietnameseFallback(message: string) {
  const lower = message.toLocaleLowerCase();
  if (/[?？]$/.test(message.trim()) || /\b(?:sao|tại sao|như thế nào|làm sao|không|chưa|gì)\b/i.test(lower)) {
    return pick([
      "Mình hiểu ý bạn. Với câu này mình trả lời ngắn gọn trước nhé: còn tùy ngữ cảnh, nhưng mình nghĩ nên bắt đầu từ phần dễ nhất.",
      "Câu này hay đó. Mình nghĩ điểm chính là phải xem bạn đang muốn kết quả gì trước.",
      "Mình hiểu. Nếu nói đơn giản thì nên thử một bước nhỏ trước, rồi xem phản ứng thế nào."
    ]);
  }
  return pick([
    "Mình hiểu ý bạn. Nói ngắn gọn thì chuyện này khá hợp lý.",
    "Ừ, mình hiểu. Ý đó nghe tự nhiên hơn nếu mình nói chậm lại một chút.",
    "Mình nắm được rồi. Có vẻ phần quan trọng nhất là cảm giác của bạn trong chuyện này.",
    "Đúng, mình thấy ý này ổn. Nếu muốn luyện tiếng Anh, mình có thể giúp chuyển nó thành câu đơn giản."
  ]);
}

function unsupportedLanguageFallback() {
  return pick([
    "Mình chưa hiểu rõ ngôn ngữ này. Bạn có thể viết bằng tiếng Việt hoặc tiếng Anh không?",
    "Mình chưa chắc bạn đang nói gì. Bạn thử dùng tiếng Việt hoặc tiếng Anh nhé.",
    "Mình hơi kẹt ở ngôn ngữ này rồi. Bạn gửi lại bằng tiếng Việt hoặc tiếng Anh giúp mình nhé."
  ]);
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
    enabled: true,
    updatedAt: new Date(0).toISOString()
  };
}

function questionFallback(message: string, profile: VirtualUserProfile) {
  if (hasVietnameseText(message)) {
    return vietnameseFallback(message);
  }

  if (hasLikelyNonEnglishText(message)) return unsupportedLanguageFallback();
  return buildCommonEnglishFallback(message, profile);
}

function statementFallback(message: string, profile: VirtualUserProfile) {
  if (hasVietnameseText(message)) {
    return vietnameseFallback(message);
  }

  if (hasLikelyNonEnglishText(message)) return unsupportedLanguageFallback();
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
    const clean = message.trim();
    const activeProfile = profile ?? makeDefaultProfile();
    const previousBotMessages = context?.recentMessages.filter((item) => item.senderType === "virtual_user").slice(-3) ?? [];
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const candidate = clean.includes("?") ? questionFallback(clean, activeProfile) : statementFallback(clean, activeProfile);
      const duplicate = previousBotMessages.some((item) => item.text.toLocaleLowerCase() === candidate.toLocaleLowerCase());
      if (!boringFallbackPattern.test(candidate) && !duplicate) return candidate;
    }
    return clean.includes("?")
      ? "I have a real answer, but I need one more detail first."
      : "I get you. There is more feeling in that than it looks at first.";
  }
}
