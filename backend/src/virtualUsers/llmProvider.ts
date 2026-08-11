import type { ConversationContext, LLMProvider, VirtualUserProfile } from "./virtualUserTypes.js";

export function buildSystemPrompt(profile: VirtualUserProfile) {
  return `You are ${profile.name}, a natural English conversation partner.
English level: ${profile.englishLevel}
Personality: ${profile.personality}
Interests: ${profile.interests.join(", ")}
Speaking style: ${profile.speakingStyle}

Rules:
- Talk like a normal person, never like an assistant.
- Never mention being a bot, AI, model, or virtual user.
- Keep the response concise and conversational (normally 1-3 short sentences).
- Do not always agree and do not always ask a question.
- Help the other person practice English naturally.
- Use emojis only occasionally.`;
}

export function buildOllamaMessages(profile: VirtualUserProfile, context: ConversationContext, message: string) {
  const recent = context.recentMessages.slice(-10).map((item) => ({
    role: item.senderType === "virtual_user" ? "assistant" : "user",
    content: item.text
  }));
  return [
    { role: "system", content: buildSystemPrompt(profile) },
    ...(context.topic ? [{ role: "system", content: `Current conversation topic: ${context.topic}` }] : []),
    ...(context.summary ? [{ role: "system", content: `Conversation summary: ${context.summary}` }] : []),
    ...(Object.keys(context.userFacts).length ? [{ role: "system", content: `Known user facts: ${JSON.stringify(context.userFacts)}` }] : []),
    ...recent,
    { role: "user", content: message }
  ];
}

export class OllamaProvider implements LLMProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs = 8_000
  ) {}

  async generateResponse(profile: VirtualUserProfile, context: ConversationContext, message: string) {
    if (!this.model) throw new Error("OLLAMA_MODEL is not configured.");
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
          messages: buildOllamaMessages(profile, context, message),
          options: { temperature: 0.75, num_predict: 120 }
        })
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
      const body = await response.json() as { message?: { content?: string } };
      return body.message?.content?.trim() ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class UnavailableLLMProvider implements LLMProvider {
  async generateResponse(): Promise<string> {
    throw new Error("No LLM provider is configured.");
  }
}
