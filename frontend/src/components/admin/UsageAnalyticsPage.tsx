import { BarChart3, ChevronLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getRoomTime, getWebRtcUsage, type RoomTimeItem, type WebRtcUsage } from "../../lib/adminAuth";
import { adminPath } from "../../lib/routes";

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function UsageAnalyticsPage({ token }: { token: string }) {
  const [users, setUsers] = useState<RoomTimeItem[]>([]);
  const [usage, setUsage] = useState<WebRtcUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([getRoomTime(token), getWebRtcUsage(token)]).then(([roomTime, webrtc]) => {
      setUsers(roomTime.items); setUsage(webrtc);
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.")).finally(() => setLoading(false));
  }, [token]);
  if (loading) return <div className="grid place-items-center py-20"><LoaderCircle className="animate-spin text-mint" /></div>;
  return <div className="grid gap-5">
    <a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16}/>Back to dashboard</a>
    {error ? <p className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-coral">{error}</p> : null}
    <section className="rounded-xl border border-white/10 bg-panel p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-mint/15 text-mint"><BarChart3 size={22}/></span><div><h2 className="text-xl font-semibold">Usage analytics</h2><p className="text-sm text-white/55">Cumulative room time and WebRTC relay usage.</p></div></div></section>
    <section className="grid gap-4 md:grid-cols-4">{(["daily","weekly","monthly","yearly"] as const).map((period) => <div key={period} className="rounded-lg border border-white/10 bg-panel p-4"><p className="text-xs uppercase tracking-wide text-white/45">{period}</p><p className="mt-2 text-lg font-semibold">STUN {duration(usage?.[period].stun ?? 0)}</p><p className="text-sm text-[#55aaff]">TURN {duration(usage?.[period].turn ?? 0)}</p></div>)}</section>
    <section className="overflow-x-auto rounded-lg border border-white/10 bg-panel"><h3 className="border-b border-white/10 px-4 py-3 font-semibold">Accumulated room time by user</h3><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Total room time</th></tr></thead><tbody className="divide-y divide-white/8">{users.map((user) => <tr key={user.userId}><td className="px-4 py-3">{user.displayName}</td><td className="px-4 py-3 text-white/55">{user.email}</td><td className="px-4 py-3 font-semibold text-mint">{duration(user.totalSeconds)}</td></tr>)}</tbody></table></section>
    <section className="overflow-x-auto rounded-lg border border-white/10 bg-panel"><h3 className="border-b border-white/10 px-4 py-3 font-semibold">WebRTC daily history</h3><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">STUN</th><th className="px-4 py-3">TURN</th></tr></thead><tbody className="divide-y divide-white/8">{[...new Set((usage?.series ?? []).map((row) => row.date))].slice(-31).reverse().map((date) => <tr key={date}><td className="px-4 py-3">{date}</td><td className="px-4 py-3">{duration((usage?.series ?? []).find((row) => row.date === date && row.transport === "stun")?.seconds ?? 0)}</td><td className="px-4 py-3">{duration((usage?.series ?? []).find((row) => row.date === date && row.transport === "turn")?.seconds ?? 0)}</td></tr>)}</tbody></table></section>
  </div>;
}
