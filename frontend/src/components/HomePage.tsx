import { Users } from "lucide-react";
import type { RoomSummary } from "../types/realtime";

type HomePageProps = {
  rooms: RoomSummary[];
  nickname: string;
  isConnected: boolean;
  error: string | null;
  onNicknameChange: (nickname: string) => void;
  onJoin: (roomId: string) => void;
};

export function HomePage({ rooms, nickname, isConnected, error, onNicknameChange, onJoin }: HomePageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-mint">English Talk Rooms</p>
          <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">Practice speaking now</h1>
          <p className={`mt-3 text-sm ${isConnected ? "text-mint" : "text-white/45"}`}>
            {isConnected ? "Server connected" : "Connecting to server"}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <label className="mb-2 block text-sm font-medium text-white/70" htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            maxLength={32}
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder="Enter your nickname"
            className="h-12 w-full rounded-md border border-white/10 bg-field px-4 text-white outline-none transition placeholder:text-white/35 focus:border-mint"
          />
        </div>
      </header>

      {error ? <div className="rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-coral">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rooms.map((room) => {
          const isFull = room.users >= room.capacity;
          const disabled = !nickname.trim() || isFull;

          return (
            <article key={room.id} className="rounded-lg border border-white/10 bg-panel p-4 shadow-xl shadow-black/15">
              <div className="flex min-h-28 flex-col justify-between gap-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">{room.name}</h2>
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/65">
                    <Users size={17} />
                    <span>
                      {room.users}/{room.capacity}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onJoin(room.id)}
                  className="h-10 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                >
                  {isFull ? "Full" : "Join"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
