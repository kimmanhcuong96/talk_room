import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../types/realtime";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): AppSocket {
  return io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000", {
    autoConnect: false,
    closeOnBeforeunload: true,
    transports: ["websocket", "polling"]
  });
}
