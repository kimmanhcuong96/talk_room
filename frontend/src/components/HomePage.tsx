import { Check, ChevronDown, Coffee, Copy, ExternalLink, Grid2X2, Heart, Info, Languages, LoaderCircle, LogIn, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, Sparkles, UserCircle, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { getRewardSummary, type AuthUser, type RewardSummary } from "../lib/auth";
import { type Language, languages, translate } from "../lib/i18n";
import type { RoomSummary } from "../types/realtime";
import { adminPath, infoPagePath, type InfoPage } from "../lib/routes";
import { readAdminToken } from "../lib/adminAuth";
import { hasPermission } from "../lib/permissions";
import { SeoContent } from "./SeoContent";
import { getRoomLanguageLevelLabel, getRoomLanguageName, roomLanguageLevels, roomLanguages, type RoomLanguage, type RoomLanguageLevel } from "../lib/roomLanguages";
import { RoomLanguageTags } from "./RoomLanguageTags";
import { RoomParticipantAvatars } from "./RoomParticipantAvatars";

type HomePageProps = {
  rooms: RoomSummary[];
  isConnected: boolean;
  error: string | null;
  language: Language;
  user: AuthUser | null;
  authToken?: string;
  authError: string | null;
  isAuthLoading: boolean;
  isSigningIn: boolean;
  onLanguageChange: (language: Language) => void;
  onGoogleCredential: (idToken: string) => void;
  onSignOut: () => void;
  onJoin: (roomId: string) => void;
  onCreateRoom: (name: string, primaryLanguage: RoomLanguage, primaryLanguageLevel: RoomLanguageLevel, secondaryLanguage: RoomLanguage | null, capacity: number) => void;
  createRoomError: string | null;
  onOpenInfoPage: (page: InfoPage) => void;
  onOpenVerificationRequest: () => void;
};

type RoomDensity = "3x" | "2x" | "1x";
const ME2WRITE_URL = "https://write-checker.pages.dev/";

async function copyReferralUrl(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard is unavailable.");
}

const densityGridClass: Record<RoomDensity, string> = {
  "3x": "sm:grid-cols-2 lg:grid-cols-3",
  "2x": "sm:grid-cols-2",
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
  isConnected,
  error,
  language,
  user,
  authToken,
  authError,
  isAuthLoading,
  isSigningIn,
  onLanguageChange,
  onGoogleCredential,
  onSignOut,
  onJoin,
  onCreateRoom,
  createRoomError,
  onOpenInfoPage,
  onOpenVerificationRequest
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useState<RoomDensity>("3x");
  const [selectedLanguageTag, setSelectedLanguageTag] = useState<RoomLanguage | null>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [oauthMenuOpen, setOauthMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [rewards, setRewards] = useState<RewardSummary | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState<RoomLanguage>(() => language);
  const [primaryLanguageLevel, setPrimaryLanguageLevel] = useState<RoomLanguageLevel>("any");
  const [secondaryLanguage, setSecondaryLanguage] = useState<RoomLanguage | "">("");
  const [roomCapacity, setRoomCapacity] = useState(2);
  const cleanNewRoomNameLength = newRoomName.trim().length;
  const hasShortRoomName = newRoomName.length > 0 && cleanNewRoomNameLength < 3;
  const canSetRoomName = user?.role === "verified" || user?.role === "supporter";
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);
  const rewardEventLabels: Record<string, string> = {
    ROOM_TIME_REWARD: t("activityPoints"), QUALITY_CHAT_REWARD: t("qualityChatPoints"),
    LIKE_RECEIVED_REWARD: t("favoritePoints"), REFERRAL_REWARD: t("referralPoints"),
    ROOM_PARTICIPANT_JOINED_REWARD: t("roomOwnerPoints"), STREAK_3_DAYS_REWARD: t("streakPoints"),
    STREAK_7_DAYS_REWARD: t("streakPoints"), ADMIN_ADJUSTMENT: t("points"),
  };
  const selectedLanguage = languages.find((option) => option.value === language) ?? languages[0];
  const canCreateRoom = hasPermission(user?.role ?? "unverified", "create_room");
  const roleLabel = user ? t(user.role === "supporter" ? "roleSupporter" : user.role === "verified" ? "roleVerified" : "roleUnverified") : "";

  useEffect(() => {
    if (!authToken) {
      setRewards(null);
      return;
    }
    let cancelled = false;
    void getRewardSummary(authToken).then((summary) => {
      if (!cancelled) setRewards(summary);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [authToken, userMenuOpen]);

  const availableLanguageTags = useMemo(() => {
    const counts = new Map<RoomLanguage, number>();
    rooms.forEach((room) => {
      const roomTags = new Set<RoomLanguage>([room.primaryLanguage]);
      if (room.secondaryLanguage) roomTags.add(room.secondaryLanguage);
      roomTags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return roomLanguages
      .filter((languageOption) => counts.has(languageOption.code))
      .map((languageOption) => ({ ...languageOption, count: counts.get(languageOption.code) ?? 0 }));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesTag = !selectedLanguageTag
        || room.primaryLanguage === selectedLanguageTag
        || room.secondaryLanguage === selectedLanguageTag;
      if (!matchesTag) return false;
      if (!query) return true;
      const searchableValues = [
        room.name,
        room.primaryLanguage,
        getRoomLanguageName(room.primaryLanguage),
        room.primaryLanguageLevel,
        getRoomLanguageLevelLabel(room.primaryLanguageLevel),
        room.secondaryLanguage ?? "",
        room.secondaryLanguage ? getRoomLanguageName(room.secondaryLanguage) : ""
      ];
      return searchableValues.some((value) => value.toLowerCase().includes(query));
    });
  }, [rooms, searchQuery, selectedLanguageTag]);

  useEffect(() => {
    if (selectedLanguageTag && !availableLanguageTags.some((tag) => tag.code === selectedLanguageTag)) {
      setSelectedLanguageTag(null);
    }
  }, [availableLanguageTags, selectedLanguageTag]);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [userMenuOpen]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-mint">me2talk - Me to talk</p>
          <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">{t("title")}</h1>
          <p className={`mt-3 flex items-center gap-2 text-sm ${isConnected ? "text-mint" : "text-coral"}`}>
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-mint shadow-[0_0_10px_rgba(117,242,184,0.7)]" : "bg-coral shadow-[0_0_10px_rgba(255,122,105,0.6)]"}`}
            />
            {isConnected ? t("serverConnected") : t("connectingServer")}
          </p>
        </div>
        <div className="grid w-full max-w-sm grid-cols-2 items-start gap-3">
          <section className="min-w-0">
            {isAuthLoading ? (
              <div className="grid h-12 w-full place-items-center rounded-md border border-white/10 bg-panel shadow-xl shadow-black/15">
                <LoaderCircle size={18} className="animate-spin text-mint" aria-hidden="true" />
              </div>
            ) : user ? (
              <div ref={userMenuRef} className="relative">
                <div className="flex h-12 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-panel px-2 shadow-xl shadow-black/15">
                  <button
                    type="button"
                    aria-expanded={userMenuOpen}
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-white/5"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/10 object-cover"
                      />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10">
                        <UserCircle size={20} className="text-white/60" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{user.displayName}</span>
                  </button>
                  <button
                    type="button"
                    title={t("signOut")}
                    aria-label={t("signOut")}
                    onClick={onSignOut}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

                {userMenuOpen ? (
                  <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-[#182635] p-4 text-white shadow-2xl shadow-black/40">
                    <div className="flex min-w-0 items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-14 w-14 shrink-0 rounded-full border border-white/10 bg-white/10 object-cover"
                        />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10">
                          <UserCircle size={30} className="text-white/60" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">{user.displayName}</p>
                        <p className="mt-1 truncate text-sm text-white/62">{user.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/55">{t("signIn")}</span>
                        <span className="truncate font-medium text-mint">{t("google")}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/55">{t("role")}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.role === "supporter"
                            ? "bg-[#ffd84d]/15 text-[#ffd84d]"
                            : user.role === "verified"
                              ? "bg-mint/15 text-mint"
                              : "bg-white/8 text-white/60"
                        }`}>{roleLabel}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUserMenuOpen(false); onOpenInfoPage("rewards"); }}
                        className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#ffd84d]/10 px-3 text-xs font-semibold text-[#ffd84d] transition hover:bg-[#ffd84d]/20"
                      >
                        <Sparkles size={14} />{t("points")}
                      </button>
                      {rewards ? (
                        <div className="mt-1 rounded-lg border border-[#ffd84d]/20 bg-[#ffd84d]/8 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 font-medium text-white/75"><Sparkles size={16} className="text-[#ffd84d]" />{t("points")}</span>
                            <strong className="text-lg text-[#ffd84d]">{rewards.totalPoints.toLocaleString()}</strong>
                          </div>
                          {!rewards.eligible ? <p className="mt-2 text-xs leading-5 text-white/60">{t("rewardEligibleOnly")}</p> : <>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-center text-[11px] text-white/55">
                            <span>{t("activityPoints")}<strong className="mt-0.5 block text-white/85">{rewards.activityPoints}</strong></span>
                            <span>{t("referralPoints")}<strong className="mt-0.5 block text-white/85">{rewards.referralPoints}</strong></span>
                            <span>{t("favoritePoints")}<strong className="mt-0.5 block text-white/85">{rewards.favoritePoints}</strong></span>
                            <span>{t("qualityChatPoints")}<strong className="mt-0.5 block text-white/85">{rewards.qualityChatPoints}</strong></span>
                            <span>{t("roomOwnerPoints")}<strong className="mt-0.5 block text-white/85">{rewards.roomOwnerPoints}</strong></span>
                            <span>{t("streakPoints")}<strong className="mt-0.5 block text-white/85">{rewards.streakPoints}</strong></span>
                          </div>
                          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-white/50"><Heart size={12} />{t("favoritesReceived", { count: rewards.favoriteCount })}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-black/10 p-2 text-[11px] text-white/55">
                            <span>{t("currentStreak")}<strong className="block text-white/85">{rewards.currentStreakDays}d</strong></span>
                            <span>{t("highestStreak")}<strong className="block text-white/85">{rewards.highestStreakDays}d</strong></span>
                            {rewards.nextStreakMilestone ? <span className="col-span-2">{t("nextStreakMilestone", { days: rewards.nextStreakMilestone })}<span className="mt-1 block h-1 overflow-hidden rounded bg-white/10"><span className="block h-full rounded bg-[#ffd84d]" style={{ width: `${Math.min(100, rewards.currentStreakDays / rewards.nextStreakMilestone * 100)}%` }} /></span></span> : null}
                          </div>
                          {rewards.recentTransactions.length ? <details className="mt-2 text-[11px] text-white/60"><summary className="cursor-pointer">{t("recentRewards")}</summary><ul className="mt-1 max-h-28 space-y-1 overflow-auto">{rewards.recentTransactions.map((item) => <li key={item.id} className="flex justify-between gap-2"><span className="truncate">{rewardEventLabels[item.eventType] ?? t("points")}</span><strong className="text-[#ffd84d]">{item.points > 0 ? "+" : ""}{item.points}</strong></li>)}</ul></details> : null}
                          <button
                            type="button"
                            onClick={async () => {
                              const referralUrl = `${window.location.origin}/?ref=${rewards.referralCode}`;
                              try {
                                await copyReferralUrl(referralUrl);
                                setReferralCopied(true);
                                window.setTimeout(() => setReferralCopied(false), 2500);
                              } catch {
                                setReferralCopied(false);
                              }
                            }}
                            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-white/8 px-2 text-xs font-medium text-white/80 transition hover:bg-white/12"
                          >
                            <Copy size={14} />{referralCopied ? t("referralCopied") : t("copyReferralLink")}
                          </button>
                          </>}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/8 px-3 text-sm font-medium text-white/85 transition hover:bg-white/12 hover:text-white"
                      >
                        <LogOut size={16} />
                        <span>{t("signOut")}</span>
                      </button>
                      {readAdminToken() ? (
                        <a
                          href={adminPath()}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-mint/15 px-3 text-sm font-medium text-mint transition hover:bg-mint/25"
                        >
                          <ShieldCheck size={16} />
                          <span>{t("adminArea")}</span>
                        </a>
                      ) : null}
                      {user.role === "unverified" ? <button type="button" onClick={() => { setUserMenuOpen(false); onOpenVerificationRequest(); }} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-mint/15 px-3 text-sm font-medium text-mint transition hover:bg-mint/25"><ShieldCheck size={16} /><span>{t("requestVerification")}</span></button> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => setOauthMenuOpen(true)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-3 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn size={17} />
                <span className="truncate">{isSigningIn ? t("signingIn") : t("signIn")}</span>
              </button>
            )}

            {authError ? <p className="mt-3 text-sm text-coral">{authError}</p> : null}
          </section>

          <div className="min-w-0">
            {/* <label className="mb-2 block text-sm font-medium text-white/70" id="language-label">
              {t("language")}
            </label> */}
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
        </div>
      </header>

      {oauthMenuOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <section className="flex min-h-64 w-full max-w-sm flex-col rounded-lg border border-black/10 bg-white p-5 text-[#202124] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#202124]">{t("chooseSignInMethod")}</h2>
              </div>
              <button
                type="button"
                title={t("closeSignIn")}
                aria-label={t("closeSignIn")}
                onClick={() => setOauthMenuOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/5 text-[#5f6368] transition hover:bg-black/10 hover:text-[#202124]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid flex-1 content-center">
              <GoogleSignInButton
                variant="google-blue"
                disabled={isSigningIn}
                renderedOnly
                language={language}
                onCredential={(idToken) => {
                  setOauthMenuOpen(false);
                  onGoogleCredential(idToken);
                }}
              />
            </div>
          </section>
        </div>
      ) : null}

      {createRoomOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-lg border border-white/10 bg-[#182635] p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{t("createRoom")}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {canCreateRoom ? t("createRoomDescription") : <>{t("createRoomVerifiedOnly")} {user ? <button type="button" onClick={onOpenVerificationRequest} className="font-semibold text-mint underline underline-offset-2">{t("requestVerification")}</button> : null}</>}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("cancel")}
                onClick={() => setCreateRoomOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/5 text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            {canCreateRoom ? (
              <form
                className="mt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const cleanName = newRoomName.trim();
                  if (!cleanName || cleanName.length >= 3) {
                    onCreateRoom(cleanName, primaryLanguage, primaryLanguageLevel, secondaryLanguage || null, roomCapacity);
                  }
                }}
              >
                <label htmlFor="new-room-name" className="text-sm font-medium text-white/75">{t("createRoomName")} <span className="font-normal text-white/40">({t("optional")})</span></label>
                <input
                  id="new-room-name"
                  aria-describedby="new-room-name-help"
                  aria-invalid={hasShortRoomName}
                  value={newRoomName}
                  maxLength={60}
                  autoFocus
                  onChange={(event) => setNewRoomName(event.target.value)}
                  disabled={!canSetRoomName}
                  placeholder={t("createRoomNamePlaceholder")}
                  className={`mt-2 h-11 w-full rounded-md border bg-field px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mint disabled:cursor-not-allowed disabled:opacity-45 ${hasShortRoomName ? "border-coral/70" : "border-white/10"}`}
                />
                <p
                  id="new-room-name-help"
                  role={hasShortRoomName ? "alert" : undefined}
                  className={`mt-2 text-xs ${hasShortRoomName ? "text-coral" : "text-white/45"}`}
                >
                  {hasShortRoomName ? t("createRoomNameTooShort") : !canSetRoomName ? t("createRoomVerifiedOnly") : ""}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-white/75" htmlFor="room-primary-language">
                    <span className="flex min-h-10 items-start">{t("primaryLanguage")}</span>
                    <select
                      id="room-primary-language"
                      required
                      value={primaryLanguage}
                      onChange={(event) => {
                        const nextLanguage = event.target.value as RoomLanguage;
                        setPrimaryLanguage(nextLanguage);
                        if (secondaryLanguage === nextLanguage) setSecondaryLanguage("");
                      }}
                      className="h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none focus:border-mint"
                    >
                      {roomLanguages.map((roomLanguage) => (
                        <option key={roomLanguage.code} value={roomLanguage.code} className="bg-[#182635] text-white">
                          {roomLanguage.nativeName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-white/75" htmlFor="room-primary-language-level">
                    <span className="flex min-h-10 items-start">Primary language level</span>
                    <select
                      id="room-primary-language-level"
                      required
                      value={primaryLanguageLevel}
                      onChange={(event) => setPrimaryLanguageLevel(event.target.value as RoomLanguageLevel)}
                      className="h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none focus:border-mint"
                    >
                      {roomLanguageLevels.map((level) => (
                        <option key={level.code} value={level.code} className="bg-[#182635] text-white">{level.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-white/75 sm:col-span-2" htmlFor="room-secondary-language">
                    <span className="flex min-h-10 items-start gap-1">
                      <span>{t("secondaryLanguage")}</span>
                      <span className="font-normal text-white/40">({t("optional")})</span>
                    </span>
                    <select
                      id="room-secondary-language"
                      value={secondaryLanguage}
                      onChange={(event) => setSecondaryLanguage(event.target.value as RoomLanguage | "")}
                      className="h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none focus:border-mint"
                    >
                      <option value="" className="bg-[#182635] text-white">{t("selectLanguage")}</option>
                      {roomLanguages.filter((roomLanguage) => roomLanguage.code !== primaryLanguage).map((roomLanguage) => (
                        <option key={roomLanguage.code} value={roomLanguage.code} className="bg-[#182635] text-white">
                          {roomLanguage.nativeName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-white/75 sm:col-span-2" htmlFor="room-capacity">
                    <span className="flex min-h-7 items-start">{t("roomCapacity")}</span>
                    <select
                      id="room-capacity"
                      required
                      value={roomCapacity}
                      onChange={(event) => setRoomCapacity(Number(event.target.value))}
                      className="h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none focus:border-mint"
                    >
                      {[1, 2, 3, 4].map((value) => <option key={value} value={value} className="bg-[#182635] text-white">{value}</option>)}
                    </select>
                  </label>
                </div>
                {createRoomError ? <div className="mt-3 grid gap-2"><p className="text-sm text-coral">{createRoomError}</p>{!canCreateRoom ? <button type="button" onClick={onOpenVerificationRequest} className="text-left text-xs font-semibold text-mint underline underline-offset-2">{t("requestVerification")}</button> : null}</div> : null}
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={() => setCreateRoomOpen(false)} className="h-10 rounded-md bg-white/5 px-4 text-sm text-white/75 hover:bg-white/10">
                    {t("cancel")}
                  </button>
                  <button type="submit" disabled={hasShortRoomName} className="h-10 rounded-md bg-[#258ff4] px-4 text-sm font-semibold text-white hover:bg-[#1d7edb] disabled:cursor-not-allowed disabled:opacity-40">
                    {t("createRoom")}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setCreateRoomOpen(true)}
            title={!canCreateRoom ? t("createRoomVerifiedOnly") : undefined}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#258ff4] px-4 text-sm font-semibold text-white transition hover:bg-[#1d7edb]"
          >
            <Plus size={18} />
            {t("createGroup")}
          </button>
          <a
            href={ME2WRITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={t("openMe2write")}
            aria-label={t("openMe2write")}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-mint/35 bg-mint/10 px-4 text-sm font-semibold text-mint transition hover:border-mint/55 hover:bg-mint/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/45"
          >
            <span className="truncate">Me2write</span>
            <ExternalLink size={16} className="shrink-0" aria-hidden="true" />
          </a>
          {/* <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#ffd84d] px-4 text-sm font-semibold text-[#171100] transition hover:bg-[#f0c930]"
          >
            <Coffee size={18} />
            {t("buyMeCoffee")}
          </button> */}
          {/* <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#258ff4] bg-transparent px-4 text-sm font-medium text-[#55aaff] transition hover:bg-[#258ff4]/10"
          >
            <Grid2X2 size={17} />
            {t("free4TalkApp")}
          </button> */}
          <a
            href={infoPagePath("privacy")}
            onClick={(event) => { event.preventDefault(); onOpenInfoPage("privacy"); }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <ShieldCheck size={17} />
            {t("privacyPolicy")}
          </a>
          <a
            href={infoPagePath("contact")}
            onClick={(event) => { event.preventDefault(); onOpenInfoPage("contact"); }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <MessageCircle size={17} />
            {t("contactUs")}
          </a>
          <a
            href={infoPagePath("about")}
            onClick={(event) => { event.preventDefault(); onOpenInfoPage("about"); }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/5 px-4 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            <Info size={17} />
            {t("aboutUs")}
          </a>
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

        <div className="flex items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-white/[0.025] p-2" aria-label={t("filterByLanguage")}>
          <Languages size={17} className="ml-1 shrink-0 text-white/45" aria-hidden="true" />
          <button
            type="button"
            aria-pressed={selectedLanguageTag === null}
            onClick={() => setSelectedLanguageTag(null)}
            className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${selectedLanguageTag === null ? "bg-mint text-ink" : "bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}
          >
            {t("allLanguages")} ({rooms.length})
          </button>
          {availableLanguageTags.map((tag) => (
            <button
              key={tag.code}
              type="button"
              aria-pressed={selectedLanguageTag === tag.code}
              onClick={() => setSelectedLanguageTag((current) => current === tag.code ? null : tag.code)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${selectedLanguageTag === tag.code ? "bg-[#258ff4] text-white" : "bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}
            >
              {tag.nativeName} ({tag.count})
            </button>
          ))}
        </div>
      </section>

      {error ? <div className="rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-coral">{error}</div> : null}

      <section className={`grid gap-3 ${densityGridClass[density]}`}>
        {filteredRooms.map((room) => {
          const isFull = !room.canJoin;

          return (
            <article key={room.id} className="rounded-lg border border-white/10 bg-panel p-4 shadow-xl shadow-black/15">
              <div className="flex min-h-28 flex-col justify-between gap-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">{room.name}</h2>
                  <div className="mt-3">
                    <RoomLanguageTags
                      primaryLanguage={room.primaryLanguage}
                      primaryLanguageLevel={room.primaryLanguageLevel}
                      secondaryLanguage={room.secondaryLanguage}
                      language={language}
                    />
                  </div>
                  <div className="mt-3 flex min-h-16 items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-white/65">
                      <Users size={17} />
                      <span>
                        {room.users}/{room.capacity}
                      </span>
                    </div>
                    <RoomParticipantAvatars participants={room.participants} language={language} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isFull}
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

      <SeoContent language={language} onOpenInfoPage={onOpenInfoPage} />
    </main>
  );
}
