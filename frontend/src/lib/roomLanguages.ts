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

export function getRoomLanguageName(code: RoomLanguage) {
  return roomLanguages.find((language) => language.code === code)?.nativeName ?? code;
}
