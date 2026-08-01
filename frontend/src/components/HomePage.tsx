import { Coffee, Grid2X2, Info, MessageCircle, Plus, Search, Settings, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { RoomSummary } from "../types/realtime";

type HomePageProps = {
  rooms: RoomSummary[];
  nickname: string;
  isConnected: boolean;
  error: string | null;
  onNicknameChange: (nickname: string) => void;
  onJoin: (roomId: string) => void;
};

type RoomDensity = "3x" | "2x" | "1x";

const densityGridClass: Record<RoomDensity, string> = {
  "3x": "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
  "2x": "sm:grid-cols-2 lg:grid-cols-3",
  "1x": "grid-cols-1"
};

export function HomePage({ rooms, nickname, isConnected, error, onNicknameChange, onJoin }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useState<RoomDensity>("3x");

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rooms;
    }

    return rooms.filter((room) => room.name.toLowerCase().includes(query));
  }, [rooms, searchQuery]);

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

      <section className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#258ff4] px-4 text-sm font-semibold text-white transition hover:bg-[#1d7edb]"
          >
            <Plus size={18} />
            Create a new group
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#ffd84d] px-4 text-sm font-semibold text-[#171100] transition hover:bg-[#f0c930]"
          >
            <Coffee size={18} />
            Buy me a coffee
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#258ff4] bg-transparent px-4 text-sm font-medium text-[#55aaff] transition hover:bg-[#258ff4]/10"
          >
            <Grid2X2 size={17} />
            Free4Talk APP
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <ShieldCheck size={17} />
            Privacy Policy
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <MessageCircle size={17} />
            Contact Us
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <Info size={17} />
            About Us
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 rounded-md border border-[#258ff4]/80 bg-[#0b1622]/80">
            <button
              aria-label="Search settings"
              title="Search settings"
              type="button"
              className="grid h-10 w-11 shrink-0 place-items-center border-r border-[#258ff4]/70 text-white/70"
            >
              <Settings size={17} />
            </button>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by Topic & User"
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              className="inline-flex h-10 w-24 shrink-0 items-center justify-center gap-2 border-l border-[#258ff4]/70 text-sm font-medium text-white transition hover:bg-[#258ff4]/10"
            >
              <Search size={16} />
              Search
            </button>
          </div>

          <div className="grid h-10 grid-cols-3 overflow-hidden rounded-md border border-[#258ff4]/80">
            {(["3x", "2x", "1x"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDensity(option)}
                className={`w-12 border-r border-[#258ff4]/50 text-sm last:border-r-0 ${
                  density === option ? "bg-[#258ff4]/25 text-[#55aaff]" : "bg-transparent text-white/80 hover:bg-white/5"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-coral">{error}</div> : null}

      <section className={`grid gap-3 ${densityGridClass[density]}`}>
        {filteredRooms.map((room) => {
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
