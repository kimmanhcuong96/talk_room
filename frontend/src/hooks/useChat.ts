import { useCallback, useEffect, useState } from "react";
import type { AppSocket } from "../lib/socket";
import type { ChatMessage } from "../types/realtime";

export function useChat(socket: AppSocket, active: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!active) {
      setMessages([]);
    }
  }, [active]);

  useEffect(() => {
    const handleHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    const handleMessage = (message: ChatMessage) => {
      setMessages((current) => [...current, message]);
    };

    socket.on("chat-history", handleHistory);
    socket.on("receive-message", handleMessage);
    return () => {
      socket.off("chat-history", handleHistory);
      socket.off("receive-message", handleMessage);
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

  return { messages, sendMessage };
}
