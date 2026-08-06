export const roomLanguages = [
  { code: "en", nativeName: "English" },
  { code: "vi", nativeName: "Tiếng Việt" },
  { code: "zh", nativeName: "中文" },
  { code: "ja", nativeName: "日本語" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "de", nativeName: "Deutsch" },
  { code: "pt", nativeName: "Português" },
  { code: "ru", nativeName: "Русский" },
  { code: "ar", nativeName: "العربية" },
  { code: "hi", nativeName: "हिन्दी" },
  { code: "bn", nativeName: "বাংলা" },
  { code: "id", nativeName: "Bahasa Indonesia" },
  { code: "ko", nativeName: "한국어" }
] as const;

export type RoomLanguage = (typeof roomLanguages)[number]["code"];

export const roomLanguageLevels = [
  { code: "any", label: "Any level" },
  { code: "a1", label: "Beginner (A1)" },
  { code: "a2", label: "Elementary (A2)" },
  { code: "b1", label: "Intermediate (B1)" },
  { code: "b2", label: "Upper-intermediate (B2)" },
  { code: "c1", label: "Advanced (C1)" },
  { code: "c2", label: "Proficient (C2)" }
] as const;

export type RoomLanguageLevel = (typeof roomLanguageLevels)[number]["code"];

export function getRoomLanguageName(code: RoomLanguage) {
  return roomLanguages.find((language) => language.code === code)?.nativeName ?? code;
}

export function getRoomLanguageLevelLabel(code: RoomLanguageLevel) {
  return roomLanguageLevels.find((level) => level.code === code)?.label ?? code;
}
