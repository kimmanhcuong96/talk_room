import { BarChart3, ChevronLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getRoomTime, getTurnUsage, getWebRtcUsage, type RoomTimeItem, type TurnUsageStatus, type WebRtcUsage } from "../../lib/adminAuth";
import { adminPath } from "../../lib/routes";
import { adminAnalyticsCopy } from "../../lib/adminAnalyticsI18n";
import type { Language } from "../../lib/i18n";
import { AdminReloadButton } from "./AdminReloadButton";

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function UsageAnalyticsPage({ token, language }: { token: string; language: Language }) {
  const copy = adminAnalyticsCopy(language);
  const [users, setUsers] = useState<RoomTimeItem[]>([]);
  const [usage, setUsage] = useState<WebRtcUsage | null>(null);
  const [turnUsage, setTurnUsage] = useState<TurnUsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () => { setRefreshing(true); return Promise.allSettled([getRoomTime(token), getWebRtcUsage(token), getTurnUsage(token)]).then(([roomTime, webrtc, turn]) => {
      if (cancelled) return;
      const failures = [roomTime, webrtc, turn].filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (roomTime.status === "fulfilled") setUsers(roomTime.value.items);
      if (webrtc.status === "fulfilled") setUsage(webrtc.value);
      if (turn.status === "fulfilled") setTurnUsage(turn.value);
      setError(failures.length ? copy.partialError : null);
    }).finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false); } }); };
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [token, refreshNonce]);
  if (loading) return <div className="grid place-items-center py-20"><LoaderCircle className="animate-spin text-mint" /></div>;
  return <div className="grid gap-5">
    <a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16}/>Back to dashboard</a>
    <div className="flex justify-end"><AdminReloadButton language={language} loading={refreshing} onClick={() => setRefreshNonce((value) => value + 1)} /></div>
    {error ? <p className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-coral">{error}</p> : null}
    <section className="rounded-xl border border-white/10 bg-panel p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-mint/15 text-mint"><BarChart3 size={22}/></span><div><h2 className="text-xl font-semibold">{copy.title}</h2><p className="text-sm text-white/55">{copy.description}</p></div></div></section>
    <section className="grid gap-4 md:grid-cols-4">{(["daily","weekly","monthly","yearly"] as const).map((period) => <div key={period} className="rounded-lg border border-white/10 bg-panel p-4"><p className="text-xs uppercase tracking-wide text-white/45">{copy[period]}</p><p className="mt-2 text-lg font-semibold">{copy.stun} {duration(usage?.[period].stun ?? 0)}</p><p className="text-sm text-[#55aaff]">{copy.turn} {duration(usage?.[period].turn ?? 0)}</p></div>)}</section>
    <section className="rounded-lg border border-white/10 bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">{copy.turnBandwidth}</h3><p className="mt-1 text-sm text-white/55">{copy.turnBandwidthDescription}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${turnUsage?.turnAllowed ? "bg-mint/15 text-mint" : "bg-coral/15 text-coral"}`}>{turnUsage?.configured ? (turnUsage.turnAllowed ? copy.turnAvailable : copy.turnLimitReached) : copy.cloudflareNotConfigured}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-white/45">{copy.bytes}</p><p className="mt-1 text-xl font-semibold">{turnUsage?.egressBytes == null ? "—" : turnUsage.egressBytes.toLocaleString()}</p></div><div><p className="text-xs uppercase tracking-wide text-white/45">{copy.mb}</p><p className="mt-1 text-xl font-semibold text-[#55aaff]">{turnUsage?.egressMb == null ? "—" : turnUsage.egressMb.toFixed(2)}</p></div><div><p className="text-xs uppercase tracking-wide text-white/45">{copy.gb}</p><p className="mt-1 text-xl font-semibold text-mint">{turnUsage?.egressGb == null ? "—" : turnUsage.egressGb.toFixed(4)} / {turnUsage?.limitGb ?? "—"}</p></div></div><p className="mt-3 text-xs text-white/40">{copy.lastCloudflareCheck}: {turnUsage?.checkedAt ? new Date(turnUsage.checkedAt).toLocaleString() : "—"}</p></section>
    <section className="overflow-x-auto rounded-lg border border-white/10 bg-panel"><h3 className="border-b border-white/10 px-4 py-3 font-semibold">{copy.roomTime}</h3><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">{copy.user}</th><th className="px-4 py-3">{copy.email}</th><th className="px-4 py-3">{copy.totalRoomTime}</th></tr></thead><tbody className="divide-y divide-white/8">{users.map((user) => <tr key={user.userId}><td className="px-4 py-3">{user.displayName}</td><td className="px-4 py-3 text-white/55">{user.email}</td><td className="px-4 py-3 font-semibold text-mint">{duration(user.totalSeconds)}</td></tr>)}</tbody></table></section>
    <section className="overflow-x-auto rounded-lg border border-white/10 bg-panel"><h3 className="border-b border-white/10 px-4 py-3 font-semibold">{copy.dailyHistory}</h3><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">{copy.date}</th><th className="px-4 py-3">{copy.stun}</th><th className="px-4 py-3">{copy.turn}</th></tr></thead><tbody className="divide-y divide-white/8">{[...new Set((usage?.series ?? []).map((row) => row.date))].slice(-31).reverse().map((date) => <tr key={date}><td className="px-4 py-3">{date}</td><td className="px-4 py-3">{duration((usage?.series ?? []).find((row) => row.date === date && row.transport === "stun")?.seconds ?? 0)}</td><td className="px-4 py-3">{duration((usage?.series ?? []).find((row) => row.date === date && row.transport === "turn")?.seconds ?? 0)}</td></tr>)}</tbody></table></section>
  </div>;
}
