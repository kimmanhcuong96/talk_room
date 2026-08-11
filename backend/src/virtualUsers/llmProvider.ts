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
- Reply directly to the latest user message. Do not dodge with generic filler.
- Keep the response concise and conversational (normally 1-2 short sentences).
- Add one specific reaction, opinion, detail, or feeling before asking anything back.
- Do not always agree. A mild, friendly disagreement is okay when it feels natural.
- Do not always ask a question; ask at most one short follow-up question.
- Help the other person practice English naturally.
- Reply in the same language the user used when you can understand it.
- If the user uses Vietnamese, answer in Vietnamese unless they explicitly ask to practice English.
- If the language is unclear, ask briefly in Vietnamese for them to use Vietnamese or English.
- Avoid bland phrases like "That's interesting", "Tell me more", "Good question", and "What do you think?" unless they are paired with a specific thought.
- Use emojis rarely.`;
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
