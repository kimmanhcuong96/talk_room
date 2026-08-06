export const ROOM_LANGUAGE_CODES = [
  "en",
  "vi",
  "zh",
  "ja",
  "es",
  "fr",
  "de",
  "pt",
  "ru",
  "ar",
  "hi",
  "bn",
  "id",
  "ko"
] as const;

export type RoomLanguage = (typeof ROOM_LANGUAGE_CODES)[number];

export const ROOM_LANGUAGE_LEVELS = ["any", "a1", "a2", "b1", "b2", "c1", "c2"] as const;
export type RoomLanguageLevel = (typeof ROOM_LANGUAGE_LEVELS)[number];

export function isRoomLanguage(value: unknown): value is RoomLanguage {
  return typeof value === "string" && ROOM_LANGUAGE_CODES.some((language) => language === value);
}

export function isRoomLanguageLevel(value: unknown): value is RoomLanguageLevel {
  return typeof value === "string" && ROOM_LANGUAGE_LEVELS.some((level) => level === value);
}
