import { Home, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useLocalMedia } from "../hooks/useLocalMedia";
import { useWebRTC } from "../hooks/useWebRTC";
import { getFallbackAvatar } from "../lib/avatar";
import type { AppSocket } from "../lib/socket";
import type { RoomSummary } from "../types/realtime";
import { ChatPanel } from "./ChatPanel";
import { Toolbar } from "./Toolbar";
import { VideoGrid } from "./VideoGrid";

type RoomPageProps = {
  socket: AppSocket;
  room: RoomSummary;
  nickname: string;
  isConnected: boolean;
  connectionError: string | null;
  onLeave: () => void;
};

export function RoomPage({ socket, room, nickname, isConnected, connectionError, onLeave }: RoomPageProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [roomConnectionError, setRoomConnectionError] = useState<string | null>(null);
  const { stream, error, micEnabled, cameraEnabled, hasMicrophone, hasCamera, toggleMic, toggleCamera } = useLocalMedia();
  const { users, remotePeers } = useWebRTC(socket, stream);
  const { messages, sendMessage } = useChat(socket, true);
  const serverLocalUser = users.find((user) => user.socketId === socket.id);
  const hasJoinedRoom = users.some((user) => user.socketId === socket.id);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    socket.emit("media-status", { micEnabled, cameraEnabled });
  }, [cameraEnabled, micEnabled, socket]);

  useEffect(() => {
    if (!isConnected) {
      setRoomConnectionError(connectionError ?? "Lost connection to the room server.");
      return;
    }

    if (hasJoinedRoom) {
      setRoomConnectionError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRoomConnectionError("Could not connect to this room.");
    }, 7000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [connectionError, hasJoinedRoom, isConnected]);

  const localUser = useMemo(
    () => ({
      nickname,
      avatar: serverLocalUser?.avatar ?? getFallbackAvatar(nickname),
      micEnabled,
      cameraEnabled
    }),
    [cameraEnabled, micEnabled, nickname, serverLocalUser?.avatar]
  );

  return (
    <main className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-ink text-white">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3 sm:h-16 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">{room.name}</h1>
            <p className="text-xs text-white/50 sm:text-sm">{remotePeers.length + 1}/4 speakers</p>
          </div>
          <button
            aria-label="Open chat"
            title="Open chat"
            type="button"
            onClick={() => setChatOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-white/80 lg:hidden"
          >
            <MessageSquare size={19} />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-4">
          {error ? (
            <div className="absolute inset-x-2 top-2 z-20 rounded-md border border-coral/40 bg-coral/20 px-3 py-2 text-xs text-coral shadow-lg shadow-black/20 backdrop-blur sm:inset-x-4 sm:top-4 sm:text-sm">
              {error}
            </div>
          ) : null}
          <VideoGrid localStream={stream} localUser={localUser} remotePeers={remotePeers} />
        </div>

        <Toolbar
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          canToggleMic={hasMicrophone}
          canToggleCamera={hasCamera}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onLeave={onLeave}
        />
      </section>

      <ChatPanel messages={messages} open={chatOpen} onClose={() => setChatOpen(false)} onSend={sendMessage} />

      {roomConnectionError ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-coral/40 bg-panel p-5 shadow-2xl shadow-black/40">
            <h2 className="text-lg font-semibold text-white">Room connection failed</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">{roomConnectionError}</p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90"
            >
              <Home size={18} />
              Back to rooms
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
