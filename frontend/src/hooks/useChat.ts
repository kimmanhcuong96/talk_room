import { useCallback, useEffect, useState } from "react";
import type { AppSocket } from "../lib/socket";
import type { ChatMessage } from "../types/realtime";

export function useChat(socket: AppSocket, active: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!active) {
      setMessages([]);
      setTypingUsers({});
    }
  }, [active]);

  useEffect(() => {
    const handleHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    const handleMessage = (message: ChatMessage) => {
      setMessages((current) => [...current, message]);
      setTypingUsers((current) => {
        const next = { ...current };
        delete next[message.senderId];
        return next;
      });
    };
    const handleTyping = ({ senderId, nickname, active: isTyping }: { senderId: string; nickname: string; active: boolean }) => {
      setTypingUsers((current) => {
        const next = { ...current };
        if (isTyping) next[senderId] = nickname;
        else delete next[senderId];
        return next;
      });
    };

    socket.on("chat-history", handleHistory);
    socket.on("receive-message", handleMessage);
    socket.on("typing", handleTyping);
    return () => {
      socket.off("chat-history", handleHistory);
      socket.off("receive-message", handleMessage);
      socket.off("typing", handleTyping);
    };
  }, [socket]);

  const sendMessage = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (cleanText) {
        socket.emit("send-message", { text: cleanText });
      }
    },
    [socket]
  );

  return { messages, typingNames: Object.values(typingUsers), sendMessage };
}
