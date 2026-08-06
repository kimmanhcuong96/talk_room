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

export function isRoomLanguage(value: unknown): value is RoomLanguage {
  return typeof value === "string" && ROOM_LANGUAGE_CODES.some((language) => language === value);
}
