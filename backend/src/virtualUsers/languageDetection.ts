const shortEnglishPattern = /^(?:hi|hello|hey|yes|yeah|yep|no|nope|ok|okay|thanks|thank you|thx|bye|goodbye|sure|lol|haha)[!?.\s]*$/i;
const urlPattern = /^(?:https?:\/\/|www\.)\S+$/i;
const vietnamesePattern = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const vietnameseAsciiPattern = /\b(?:xin chao|cam on|xin loi|tieng viet|khong hieu|khong duoc|tra loi|ban khoe|toi khong|minh khong|tai sao|lam sao)\b/i;
const commonForeignChatPattern = /\b(?:hola|bonjour|salut|merci|gracias|por favor|como estas|que tal|ca va|buenos dias|buenas tardes|guten tag|danke|hallo|ciao|buongiorno|grazie|ola|obrigado|obrigada|bom dia|tudo bem|namaste|salam|ni hao|xie xie|konnichiwa|arigato|annyeong|sawasdee|selamat|terima kasih|kumusta|salamat)\b/i;
const commonEnglishWords = new Set([
  "a", "about", "after", "all", "am", "an", "and", "are", "at", "awesome", "be", "because", "before", "but", "can", "could", "day", "did", "do", "does", "doing", "feel", "fine", "for", "from", "fun", "good", "great", "had", "has", "have", "hello", "hey", "hi", "how", "i", "if", "in", "is", "it", "like", "love", "me", "my", "nice", "no", "not", "of", "ok", "on", "or", "please", "really", "so", "sorry", "sure", "thanks", "that", "the", "this", "to", "today", "too", "very", "want", "was", "we", "weather", "were", "what", "when", "where", "why", "will", "with", "would", "yes", "you", "your"
]);

export type EnglishHeuristic = { needsClassification: boolean; stronglyNonEnglish: boolean };

export function assessEnglishMessage(value: string): EnglishHeuristic {
  const clean = value.trim();
  if (!clean || shortEnglishPattern.test(clean) || urlPattern.test(clean)) {
    return { needsClassification: false, stronglyNonEnglish: false };
  }
  const letters = clean.match(/\p{L}/gu) ?? [];
  if (!letters.length) return { needsClassification: false, stronglyNonEnglish: false };
  if (vietnamesePattern.test(clean)) {
    return { needsClassification: true, stronglyNonEnglish: true };
  }
  if (vietnameseAsciiPattern.test(clean) || commonForeignChatPattern.test(clean)) {
    return { needsClassification: true, stronglyNonEnglish: false };
  }

  const asciiLetters = clean.match(/[a-z]/gi) ?? [];
  if (asciiLetters.length / letters.length < 0.7) {
    return { needsClassification: true, stronglyNonEnglish: true };
  }

  const words = clean.toLocaleLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  if (words.length <= 2) return { needsClassification: false, stronglyNonEnglish: false };
  const knownWords = words.filter((word) => commonEnglishWords.has(word)).length;
  return knownWords >= Math.max(1, Math.ceil(words.length * 0.25))
    ? { needsClassification: false, stronglyNonEnglish: false }
    : { needsClassification: true, stronglyNonEnglish: false };
}

export const nonEnglishReminders = [
  "Could you please speak English?",
  "Let's practice in English 😊",
  "Could you write that in English?",
  "English works best for me here.",
  "Can we keep the chat in English?"
] as const;
