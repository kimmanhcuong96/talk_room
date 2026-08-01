import { Check, ChevronDown, Coffee, Grid2X2, Info, MessageCircle, Plus, Search, Settings, ShieldCheck, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { type Language, languages, translate } from "../lib/i18n";
import type { RoomSummary } from "../types/realtime";

type HomePageProps = {
  rooms: RoomSummary[];
  nickname: string;
  isConnected: boolean;
  error: string | null;
  language: Language;
  onNicknameChange: (nickname: string) => void;
  onLanguageChange: (language: Language) => void;
  onJoin: (roomId: string) => void;
};

type RoomDensity = "3x" | "2x" | "1x";

const densityGridClass: Record<RoomDensity, string> = {
  "3x": "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
  "2x": "sm:grid-cols-2 lg:grid-cols-3",
  "1x": "grid-cols-1"
};

function FlagIcon({ language }: { language: Language }) {
  if (language === "vi") {
    return (
      <span className="relative h-4 w-6 overflow-hidden rounded-sm bg-[#da251d] shadow-sm">
        <span className="absolute left-1/2 top-1/2 text-[10px] leading-none text-[#ffff00] -translate-x-1/2 -translate-y-1/2">★</span>
      </span>
    );
  }

  if (language === "zh") {
    return (
      <span className="relative h-4 w-6 overflow-hidden rounded-sm bg-[#de2910] shadow-sm">
        <span className="absolute left-1 top-0.5 text-[8px] leading-none text-[#ffde00]">★</span>
        <span className="absolute left-3 top-0.5 text-[3px] leading-none text-[#ffde00]">★</span>
        <span className="absolute left-3.5 top-1.5 text-[3px] leading-none text-[#ffde00]">★</span>
        <span className="absolute left-3.5 top-2.5 text-[3px] leading-none text-[#ffde00]">★</span>
        <span className="absolute left-3 top-3 text-[3px] leading-none text-[#ffde00]">★</span>
      </span>
    );
  }

  if (language === "ja") {
    return (
      <span className="grid h-4 w-6 place-items-center overflow-hidden rounded-sm bg-white shadow-sm">
        <span className="h-2 w-2 rounded-full bg-[#bc002d]" />
      </span>
    );
  }

  return (
    <span className="relative h-4 w-6 overflow-hidden rounded-sm bg-[#012169] shadow-sm">
      <span className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-x-1/2 -translate-y-1/2 rotate-[34deg] bg-white" />
      <span className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-x-1/2 -translate-y-1/2 -rotate-[34deg] bg-white" />
      <span className="absolute left-1/2 top-1/2 h-[1px] w-8 -translate-x-1/2 -translate-y-1/2 rotate-[34deg] bg-[#c8102e]" />
      <span className="absolute left-1/2 top-1/2 h-[1px] w-8 -translate-x-1/2 -translate-y-1/2 -rotate-[34deg] bg-[#c8102e]" />
      <span className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-white" />
      <span className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 bg-white" />
      <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-[#c8102e]" />
      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#c8102e]" />
    </span>
  );
}

export function HomePage({
  rooms,
  nickname,
  isConnected,
  error,
  language,
  onNicknameChange,
  onLanguageChange,
  onJoin
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useState<RoomDensity>("3x");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);
  const selectedLanguage = languages.find((option) => option.value === language) ?? languages[0];

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
          <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">{t("title")}</h1>
          <p className={`mt-3 flex items-center gap-2 text-sm ${isConnected ? "text-mint" : "text-coral"}`}>
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-mint shadow-[0_0_10px_rgba(117,242,184,0.7)]" : "bg-coral shadow-[0_0_10px_rgba(255,122,105,0.6)]"}`}
            />
            {isConnected ? t("serverConnected") : t("connectingServer")}
          </p>
        </div>
        <div className="grid w-full max-w-sm gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70" id="language-label">
              {t("language")}
            </label>
            <div
              ref={languageMenuRef}
              className="relative"
              onBlur={(event) => {
                if (!languageMenuRef.current?.contains(event.relatedTarget)) {
                  setLanguageMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                aria-labelledby="language-label"
                aria-expanded={languageMenuOpen}
                onClick={() => setLanguageMenuOpen((open) => !open)}
                className="flex h-12 w-full items-center justify-between rounded-md border border-white/10 bg-field px-4 text-left text-sm text-white outline-none transition hover:bg-white/10 focus:border-mint"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <FlagIcon language={selectedLanguage.value} />
                  <span className="truncate">{selectedLanguage.label}</span>
                </span>
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-white/55 transition ${languageMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {languageMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-md border border-white/10 bg-[#101c28] shadow-2xl shadow-black/35">
                  {languages.map((option) => {
                    const selected = language === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onLanguageChange(option.value);
                          setLanguageMenuOpen(false);
                        }}
                        className={`flex h-11 w-full items-center gap-3 px-4 text-left text-sm transition ${
                          selected ? "bg-mint/15 text-mint" : "text-white/78 hover:bg-white/10"
                        }`}
                      >
                        <FlagIcon language={option.value} />
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        {selected ? <Check size={16} className="shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <label className="mb-2 block text-sm font-medium text-white/70" htmlFor="nickname">
            {t("nickname")}
          </label>
          <input
            id="nickname"
            maxLength={32}
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder={t("nicknamePlaceholder")}
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
            {t("createGroup")}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#ffd84d] px-4 text-sm font-semibold text-[#171100] transition hover:bg-[#f0c930]"
          >
            <Coffee size={18} />
            {t("buyMeCoffee")}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#258ff4] bg-transparent px-4 text-sm font-medium text-[#55aaff] transition hover:bg-[#258ff4]/10"
          >
            <Grid2X2 size={17} />
            {t("free4TalkApp")}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <ShieldCheck size={17} />
            {t("privacyPolicy")}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <MessageCircle size={17} />
            {t("contactUs")}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <Info size={17} />
            {t("aboutUs")}
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
              placeholder={t("searchPlaceholder")}
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              className="inline-flex h-10 w-24 shrink-0 items-center justify-center gap-2 border-l border-[#258ff4]/70 text-sm font-medium text-white transition hover:bg-[#258ff4]/10"
            >
              <Search size={16} />
              {t("search")}
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
                  {isFull ? t("full") : t("join")}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
