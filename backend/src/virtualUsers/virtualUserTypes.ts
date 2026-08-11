import type { ChatMessage } from "../types/socket.js";

export const VIRTUAL_USER_IDS = Array.from({ length: 15 }, (_, index) => `bot-${String(index + 1).padStart(2, "0")}`);

export type VirtualUserProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  englishLevel: string;
  personality: string;
  interests: string[];
  speakingStyle: string;
  replyProbability: number;
  enabled: boolean;
  updatedAt: string;
};

export type VirtualUserRuntime = {
  botId: string;
  status: "AVAILABLE" | "ACTIVE";
  roomId?: string;
};

export type ConversationContext = {
  roomId: string;
  botId: string;
  topic?: string;
  summary?: string;
  userFacts: Record<string, string>;
  recentMessages: ChatMessage[];
  lastBotMessageAt?: number;
  lastUserMessageAt?: number;
};

export type RouteDecision = {
  route: "RULE" | "LLM" | "IGNORE";
  confidence: number;
  response?: string;
};

export interface LLMProvider {
  generateResponse(profile: VirtualUserProfile, context: ConversationContext, message: string): Promise<string>;
}
