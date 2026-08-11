import type { ChatMessage } from "../types/socket.js";
import type { ConversationContext } from "./virtualUserTypes.js";

export class ConversationStore {
  private readonly contexts = new Map<string, ConversationContext>();

  private key(roomId: string, botId: string) {
    return `${roomId}:${botId}`;
  }

  get(roomId: string, botId: string) {
    const key = this.key(roomId, botId);
    let context = this.contexts.get(key);
    if (!context) {
      context = { roomId, botId, userFacts: {}, recentMessages: [] };
      this.contexts.set(key, context);
    }
    return context;
  }

  destroy(roomId: string, botId: string) {
    this.contexts.delete(this.key(roomId, botId));
  }

  remember(context: ConversationContext, message: ChatMessage) {
    context.recentMessages.push(message);
    if (message.senderType === "human") context.lastUserMessageAt = message.timestamp;
    else context.lastBotMessageAt = message.timestamp;

    if (message.senderType === "human") {
      const name = message.text.match(/\bmy name is\s+([a-z][a-z '-]{1,30})/i)?.[1];
      const location = message.text.match(/\b(?:i am|i'm) from\s+([a-z][a-z '-]{1,40}?)(?=\s+and\s+i\b|[.!?]|$)/i)?.[1];
      const interest = message.text.match(/\bi (?:like|love|enjoy)\s+([^.!?]{2,60})/i)?.[1];
      if (name) context.userFacts.name = name.trim();
      if (location) context.userFacts.location = location.trim();
      if (interest) context.userFacts.interest = interest.trim();
    }

    if (context.recentMessages.length > 10) {
      const removed = context.recentMessages.splice(0, context.recentMessages.length - 10);
      const compact = removed.map((item) => `${item.senderType === "virtual_user" ? "Bot" : "User"}: ${item.text}`).join(" | ");
      context.summary = [context.summary, compact].filter(Boolean).join(" | ").slice(-1_000);
    }
  }

  count() {
    return this.contexts.size;
  }
}
