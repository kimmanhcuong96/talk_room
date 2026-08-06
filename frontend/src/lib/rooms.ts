import type { RoomSummary } from "../types/realtime";

const roomNames = [
  "English Beginner",
  "English Intermediate",
  "Daily Conversation",
  "IELTS Speaking",
  "Business English",
  "Travel English",
  "Pronunciation Practice",
  "Free Talk",
  "Movie Discussion",
  "Book Club",
  "Technology",
  "Gaming",
  "Culture Exchange",
  "Debate",
  "Vocabulary Practice",
  "Grammar Practice",
  "Interview English",
  "Coffee Chat"
] as const;

export const defaultRooms: RoomSummary[] = roomNames.map((name, index) => ({
  id: `room-${index + 1}`,
  name,
  primaryLanguage: "en",
  primaryLanguageLevel: index === 0 ? "a1" : index === 1 ? "b1" : "any",
  secondaryLanguage: null,
  users: 0,
  capacity: 4,
  participants: []
}));
