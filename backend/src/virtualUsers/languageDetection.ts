const shortEnglishPattern = /^(?:hi|hello|hey|yes|yeah|yep|no|nope|ok|okay|thanks|thank you|thx|bye|goodbye|sure|lol|haha)[!?.\s]*$/i;
const urlPattern = /^(?:https?:\/\/|www\.)\S+$/i;
const vietnamesePattern = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const vietnameseAsciiPattern = /\b(?:toi|ban|minh|khong|duoc|ngon ngu|tieng viet|tra loi|hieu|xin chao|cam on|xin loi|tai sao|lam sao)\b/i;
const commonEnglishWords = new Set([
  "a", "about", "am", "an", "and", "are", "at", "be", "because", "but", "can", "could", "day", "did", "do", "does", "for", "from", "good", "have", "hello", "hey", "hi", "how", "i", "if", "in", "is", "it", "like", "me", "my", "no", "not", "of", "ok", "on", "or", "please", "really", "so", "thanks", "that", "the", "this", "to", "today", "want", "was", "we", "what", "when", "where", "why", "with", "would", "yes", "you", "your"
]);

export type EnglishHeuristic = { needsClassification: boolean; stronglyNonEnglish: boolean };

export function assessEnglishMessage(value: string): EnglishHeuristic {
  const clean = value.trim();
  if (!clean || shortEnglishPattern.test(clean) || urlPattern.test(clean)) {
    return { needsClassification: false, stronglyNonEnglish: false };
  }
  const letters = clean.match(/\p{L}/gu) ?? [];
  if (!letters.length) return { needsClassification: false, stronglyNonEnglish: false };
  if (vietnamesePattern.test(clean) || vietnameseAsciiPattern.test(clean)) {
    return { needsClassification: true, stronglyNonEnglish: true };
  }

  const asciiLetters = clean.match(/[a-z]/gi) ?? [];
  if (asciiLetters.length / letters.length < 0.7) {
    return { needsClassification: true, stronglyNonEnglish: true };
  }

  const words = clean.toLocaleLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  if (words.length <= 2) return { needsClassification: false, stronglyNonEnglish: false };
  const knownWords = words.filter((word) => commonEnglishWords.has(word)).length;
  return knownWords >= Math.max(1, Math.floor(words.length * 0.25))
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
