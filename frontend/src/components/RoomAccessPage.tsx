import { ArrowLeft, DoorOpen, Users } from "lucide-react";
import type { RoomSummary } from "../types/realtime";

type RoomAccessPageProps = {
  room: RoomSummary;
  nickname: string;
  isConnected: boolean;
  error: string | null;
  onNicknameChange: (nickname: string) => void;
  onReady: () => void;
  onBack: () => void;
};

export function RoomAccessPage({
  room,
  nickname,
  isConnected,
  error,
  onNicknameChange,
  onReady,
  onBack
}: RoomAccessPageProps) {
  const isFull = room.users >= room.capacity;
  const disabled = !nickname.trim() || isFull;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-white">
      <section className="w-full max-w-xl rounded-lg border border-white/10 bg-panel p-5 shadow-2xl shadow-black/30">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/75 transition hover:bg-white/10"
        >
          <ArrowLeft size={17} />
          Back to rooms
        </button>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wide text-mint">Ready access</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{room.name}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
            <Users size={17} />
            <span>
              {room.users}/{room.capacity} speakers
            </span>
          </div>
        </div>

        <label className="mt-6 block text-sm font-medium text-white/70" htmlFor="ready-nickname">
          Nickname
        </label>
        <input
          id="ready-nickname"
          maxLength={32}
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder="Enter your nickname"
          className="mt-2 h-12 w-full rounded-md border border-white/10 bg-field px-4 text-white outline-none transition placeholder:text-white/35 focus:border-mint"
        />

        {error ? <div className="mt-4 rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-coral">{error}</div> : null}

        <button
          type="button"
          disabled={disabled}
          onClick={onReady}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
        >
          <DoorOpen size={19} />
          {isFull ? "Room is full" : isConnected ? "Ready access" : "Connect and access"}
        </button>
      </section>
    </main>
  );
}
