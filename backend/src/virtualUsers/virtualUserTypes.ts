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
  proactiveMessageProbability: number;
  longResponseDelayMinSeconds: number;
  longResponseDelayMaxSeconds: number;
  singleSentenceProbability: number;
  twoSentenceProbability: number;
  leaveWhenRejectedProbability: number;
  nonEnglishReminderCooldownSeconds: number;
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

export type LLMUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LLMGeneration = {
  text: string;
  usage: LLMUsage;
};

export type VirtualUserResponse = {
  text: string;
  source: "rule" | "llm";
};

export interface LLMProvider {
  readonly available?: boolean;
  generateResponse(profile: VirtualUserProfile, context: ConversationContext, message: string, sentenceCount?: 1 | 2): Promise<LLMGeneration>;
  classifyEnglish?(message: string): Promise<LLMGeneration>;
}

export interface LLMUsageCoordinator {
  generate(
    virtualUserId: string,
    roomId: string,
    maxTokens: number | null,
    generation: () => Promise<LLMGeneration>
  ): Promise<LLMGeneration | null>;
}
