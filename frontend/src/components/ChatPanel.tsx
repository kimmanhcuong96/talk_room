import { Send, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { formatTime } from "../lib/time";
import type { ChatMessage } from "../types/realtime";
import { AvatarBadge } from "./AvatarBadge";

const quickEmojis = ["😀", "😂", "👍", "❤️", "👏", "🎉", "✋", "🤔"];

type ChatPanelProps = {
  messages: ChatMessage[];
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
};

export function ChatPanel({ messages, open, onClose, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSend(draft);
    setDraft("");
  };

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-30 flex w-full max-w-[320px] flex-col border-l border-white/10 bg-panel shadow-2xl shadow-black/30 transition-transform duration-200 lg:static lg:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <h2 className="text-base font-semibold text-white">Chat</h2>
        <button
          aria-label="Close chat"
          title="Close chat"
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-white/70 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className="rounded-md bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-xs text-white/45">
              <span className="flex min-w-0 items-center gap-2">
                <AvatarBadge avatar={message.avatar} size="sm" />
                <span className="truncate font-medium text-white/70">{message.nickname}</span>
              </span>
              <time>{formatTime(message.timestamp)}</time>
            </div>
            <p className="mt-2 break-words text-sm text-white/90">{message.text}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 grid grid-cols-4 gap-2">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSend(emoji)}
              className="h-9 rounded-md border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message"
            maxLength={500}
            className="h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-mint"
          />
          <button
            aria-label="Send message"
            title="Send message"
            type="submit"
            className="grid h-11 w-11 place-items-center rounded-md bg-mint text-ink transition hover:bg-mint/90"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </aside>
  );
}
