import { ArrowLeft, DoorOpen, Users } from "lucide-react";
import { type Language, translate } from "../lib/i18n";
import type { RoomSummary } from "../types/realtime";
import { resolveGuestNickname } from "../lib/nickname";
import { RoomLanguageTags } from "./RoomLanguageTags";

type RoomAccessPageProps = {
  room: RoomSummary;
  nickname: string;
  authenticatedNickname: string;
  suggestedNickname: string;
  isConnected: boolean;
  error: string | null;
  language: Language;
  onNicknameChange: (nickname: string) => void;
  onReady: () => void;
  onBack: () => void;
};

export function RoomAccessPage({
  room,
  nickname,
  authenticatedNickname,
  suggestedNickname,
  isConnected,
  error,
  language,
  onNicknameChange,
  onReady,
  onBack
}: RoomAccessPageProps) {
  const isFull = room.users >= room.capacity;
  const guestNickname = resolveGuestNickname(nickname, suggestedNickname);
  const effectiveNickname = authenticatedNickname || guestNickname;
  const disabled = !effectiveNickname || isFull;
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-white">
      <section className="w-full max-w-xl rounded-lg border border-white/10 bg-panel p-5 shadow-2xl shadow-black/30">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/75 transition hover:bg-white/10"
        >
          <ArrowLeft size={17} />
          {t("backToRooms")}
        </button>

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wide text-mint">{t("readyAccess")}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{room.name}</h1>
          <div className="mt-3">
            <RoomLanguageTags
              primaryLanguage={room.primaryLanguage}
              primaryLanguageLevel={room.primaryLanguageLevel}
              secondaryLanguage={room.secondaryLanguage}
              language={language}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
            <Users size={17} />
            <span>{t("speakers", { count: room.users })}</span>
          </div>
        </div>

        {authenticatedNickname ? (
          <div className="mt-6 rounded-md border border-white/10 bg-field px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-white/45">{t("nickname")}</p>
            <p className="mt-1 truncate text-base font-semibold text-white">{authenticatedNickname}</p>
          </div>
        ) : (
          <>
            <label className="mt-6 block text-sm font-medium text-white/70" htmlFor="ready-nickname">
              {t("nickname")}
            </label>
            <input
              id="ready-nickname"
              maxLength={32}
              value={guestNickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              placeholder={t("nicknamePlaceholder")}
              className="mt-2 h-12 w-full rounded-md border border-white/10 bg-field px-4 text-white outline-none transition placeholder:text-white/35 focus:border-mint"
            />
          </>
        )}

        {error ? <div className="mt-4 rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-coral">{error}</div> : null}

        <button
          type="button"
          disabled={disabled}
          onClick={onReady}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
        >
          <DoorOpen size={19} />
          {isFull ? t("roomFull") : isConnected ? t("readyAccess") : t("connectAndAccess")}
        </button>
      </section>
    </main>
  );
}
