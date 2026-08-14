import type { ConversationContext, LLMGeneration, LLMProvider, SentenceCount, VirtualUserProfile } from "./virtualUserTypes.js";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateMessageTokens(messages: Array<{ content: string }>) {
  return messages.reduce((total, message) => total + estimateTokens(message.content), 0);
}

function usageToken(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.ceil(value) : fallback;
}

export function buildSystemPrompt(profile: VirtualUserProfile, sentenceCount: SentenceCount = 1) {
  return `You are ${profile.name}, a natural English conversation partner.
English level: ${profile.englishLevel}
Personality: ${profile.personality}
Interests: ${profile.interests.join(", ")}
Speaking style: ${profile.speakingStyle}

Rules:
- Talk like a normal person, never like an assistant.
- Never mention being a bot, AI, model, or virtual user.
- Reply directly to the latest user message. Do not dodge with generic filler.
- Write exactly ${sentenceCount} short sentence${sentenceCount === 1 ? "" : "s"}. Do not write fewer or more.
- Add one specific reaction, opinion, detail, or feeling before asking anything back.
- Do not always agree. A mild, friendly disagreement is okay when it feels natural.
- Do not always ask a question; ask at most one short follow-up question.
- Help the other person practice English naturally.
- Use English only.
- If the user writes in another language, say naturally that you do not understand and ask them to write in English.
- If the user tries to use voice, mic, or camera, say you cannot use mic or camera and ask them to chat with you in text.
- Avoid bland phrases like "That's interesting", "Tell me more", "Good question", and "What do you think?" unless they are paired with a specific thought.
- Use emojis rarely.`;
}

export function buildLLMMessages(profile: VirtualUserProfile, context: ConversationContext, message: string, sentenceCount: SentenceCount = 1) {
  const recent = context.recentMessages.slice(-10).map((item) => ({
    role: item.senderType === "virtual_user" ? "assistant" : "user",
    content: item.text
  }));
  return [
    { role: "system", content: buildSystemPrompt(profile, sentenceCount) },
    ...(context.topic ? [{ role: "system", content: `Current conversation topic: ${context.topic}` }] : []),
    ...(context.summary ? [{ role: "system", content: `Conversation summary: ${context.summary}` }] : []),
    ...(Object.keys(context.userFacts).length ? [{ role: "system", content: `Known user facts: ${JSON.stringify(context.userFacts)}` }] : []),
    ...recent,
    { role: "user", content: message }
  ];
}

// Kept as an alias for compatibility with existing imports.
export const buildOllamaMessages = buildLLMMessages;

function buildEnglishClassificationMessages(message: string) {
  return [
    { role: "system", content: "Classify the language of the user's chat message. Return exactly one JSON object and no other text: {\"is_english\":true} or {\"is_english\":false}. Use true only when the meaningful conversational text is primarily English. Names, place names, URLs, numbers, emojis, and common short English chat expressions such as hi, yes, no, ok, and thanks count as English. A message containing substantial non-English text is false even if it also contains a few English words. Transliteration of a non-English language is false. Do not answer or translate the message." },
    { role: "user", content: message.slice(0, 500) }
  ];
}

export class OllamaProvider implements LLMProvider {
  readonly provider = "ollama";

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs = 8_000
  ) {}

  async generateResponse(profile: VirtualUserProfile, context: ConversationContext, message: string, sentenceCount: SentenceCount = 1): Promise<LLMGeneration> {
    if (!this.model) throw new Error("OLLAMA_MODEL is not configured.");
    const messages = buildLLMMessages(profile, context, message, sentenceCount);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref();
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
          method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages,
          options: { temperature: 0.75, num_predict: sentenceCount === 1 ? 48 : sentenceCount === 2 ? 80 : 112 }
        })
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
      const body = await response.json() as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      const text = body.message?.content?.trim() ?? "";
      const inputTokens = usageToken(body.prompt_eval_count, estimateMessageTokens(messages));
      const outputTokens = usageToken(body.eval_count, estimateTokens(text));
      return { text, usage: { provider: this.provider, model: this.model, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } };
    } finally {
      clearTimeout(timeout);
    }
  }

  async classifyEnglish(message: string): Promise<LLMGeneration> {
    if (!this.model) throw new Error("OLLAMA_MODEL is not configured.");
    const messages = buildEnglishClassificationMessages(message);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref();
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model: this.model, stream: false, messages, options: { temperature: 0, num_predict: 20 } })
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
      const body = await response.json() as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
      const text = body.message?.content?.trim() ?? "";
      const inputTokens = usageToken(body.prompt_eval_count, estimateMessageTokens(messages));
      const outputTokens = usageToken(body.eval_count, estimateTokens(text));
      return { text, usage: { provider: this.provider, model: this.model, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class CloudflareWorkersAIProvider implements LLMProvider {
  readonly provider = "cloudflare";

  constructor(
    private readonly accountId: string,
    private readonly apiToken: string,
    private readonly model: string,
    private readonly timeoutMs = 8_000
  ) {}

  async generateResponse(profile: VirtualUserProfile, context: ConversationContext, message: string, sentenceCount: SentenceCount = 1): Promise<LLMGeneration> {
    if (!this.accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured.");
    if (!this.apiToken) throw new Error("CLOUDFLARE_AI_API_TOKEN is not configured.");
    if (!this.model) throw new Error("LLM_MODEL is not configured.");
    const messages = buildLLMMessages(profile, context, message, sentenceCount);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref();
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/ai/run/${this.model.replace(/^\/+/, "")}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({ messages, temperature: 0.7, max_tokens: sentenceCount === 1 ? 48 : sentenceCount === 2 ? 80 : 112 })
        }
      );
      const body = await response.json() as {
        success?: boolean;
        errors?: Array<{ message?: string }>;
        result?: {
          response?: string;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number };
        };
      };
      if (!response.ok) {
        const detail = body.errors?.map((error) => error.message).filter(Boolean).join("; ");
        throw new Error(`Cloudflare Workers AI returned ${response.status}${detail ? `: ${detail}` : "."}`);
      }
      if (body.success === false) throw new Error(body.errors?.map((error) => error.message).filter(Boolean).join("; ") || "Cloudflare Workers AI request failed.");
      const text = body.result?.response?.trim() ?? "";
      const usage = body.result?.usage;
      const inputTokens = usageToken(usage?.prompt_tokens ?? usage?.input_tokens, estimateMessageTokens(messages));
      const outputTokens = usageToken(usage?.completion_tokens ?? usage?.output_tokens, estimateTokens(text));
      return {
        text,
        usage: {
          provider: this.provider,
          model: this.model,
          inputTokens,
          outputTokens,
          totalTokens: usageToken(usage?.total_tokens, inputTokens + outputTokens)
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async classifyEnglish(message: string): Promise<LLMGeneration> {
    if (!this.accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured.");
    if (!this.apiToken) throw new Error("CLOUDFLARE_AI_API_TOKEN is not configured.");
    if (!this.model) throw new Error("LLM_MODEL is not configured.");
    const messages = buildEnglishClassificationMessages(message);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref();
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/ai/run/${this.model.replace(/^\/+/, "")}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiToken}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ messages, temperature: 0, max_tokens: 20 })
        }
      );
      const body = await response.json() as {
        success?: boolean;
        errors?: Array<{ message?: string }>;
        result?: { response?: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number } };
      };
      if (!response.ok || body.success === false) {
        const detail = body.errors?.map((error) => error.message).filter(Boolean).join("; ");
        throw new Error(`Cloudflare Workers AI classification failed${detail ? `: ${detail}` : "."}`);
      }
      const text = body.result?.response?.trim() ?? "";
      const usage = body.result?.usage;
      const inputTokens = usageToken(usage?.prompt_tokens ?? usage?.input_tokens, estimateMessageTokens(messages));
      const outputTokens = usageToken(usage?.completion_tokens ?? usage?.output_tokens, estimateTokens(text));
      return { text, usage: { provider: this.provider, model: this.model, inputTokens, outputTokens, totalTokens: usageToken(usage?.total_tokens, inputTokens + outputTokens) } };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class UnavailableLLMProvider implements LLMProvider {
  readonly available = false;

  async generateResponse(): Promise<LLMGeneration> {
    throw new Error("No LLM provider is configured.");
  }
}
