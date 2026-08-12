import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  confirmModerationBlock,
  dismissModerationReport,
  getModerationReports,
  type AdminSession,
  type ModerationReport,
  type ReportStatus
} from "../../lib/adminAuth";
import { adminModerationCopy } from "../../lib/adminModerationI18n";
import type { Language } from "../../lib/i18n";
import { adminPath } from "../../lib/routes";
import { AdminReloadButton } from "./AdminReloadButton";

export function ReportsPage({ session, language, backLabel, previousLabel, nextLabel, loadingLabel, pageLabel }: {
  session: AdminSession; language: Language; backLabel: string; previousLabel: string; nextLabel: string; loadingLabel: string;
  pageLabel: (page: number, pages: number) => string;
}) {
  const c = adminModerationCopy(language);
  const [items, setItems] = useState<ModerationReport[]>([]);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState({ status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(total / 20));
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await getModerationReports(session.token, { page, ...filters }); setItems(result.items); setTotal(result.total); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Request failed."); }
    finally { setLoading(false); }
  }, [filters, page, session.token]);
  useEffect(() => { void load(); }, [load]);
  const review = async (item: ModerationReport, action: "block" | "dismiss") => {
    const question = action === "block" ? c.confirmQuestion : c.dismissQuestion;
    if (!window.confirm(question)) return;
    setError(null);
    try {
      if (action === "block") await confirmModerationBlock(session.token, item.id);
      else await dismissModerationReport(session.token, item.id);
      await load();
    } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "Request failed."); }
  };
  const statusLabel = (value: ReportStatus) => value === "pending" ? c.pending : value === "blocked" ? c.blocked : c.dismissed;
  const person = (value: ModerationReport["target"]) => <><div className="font-medium">{value.displayName}</div><div className="text-xs text-white/45">{value.email ?? (value.userId ? value.userId : "Guest / IP")}</div></>;

  return <div className="grid gap-5">
    <a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16}/>{backLabel}</a>
    <div><p className="text-white/60">{c.description}</p></div>
    <form onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ status, from, to }); }} className="grid gap-3 rounded-lg border border-white/10 bg-panel p-4 sm:grid-cols-4">
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-white/10 bg-field px-3"><option value="">{c.all}</option><option value="pending">{c.pending}</option><option value="blocked">{c.blocked}</option><option value="dismissed">{c.dismissed}</option></select>
      <label className="grid gap-1 text-xs text-white/55">{c.from}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-md border border-white/10 bg-field px-3 text-sm text-white"/></label>
      <label className="grid gap-1 text-xs text-white/55">{c.to}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-md border border-white/10 bg-field px-3 text-sm text-white"/></label>
      <button className="self-end h-10 rounded-md bg-[#258ff4] px-4 text-sm font-semibold">{c.apply}</button>
    </form>
    <div className="flex justify-end"><AdminReloadButton language={language} loading={loading} onClick={() => void load()} /></div>
    {error ? <div className="rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-coral">{error}</div> : null}
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-panel"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase text-white/45"><tr><th className="px-4 py-3">{c.reporter}</th><th className="px-4 py-3">{c.target}</th><th className="px-4 py-3">{c.context}</th><th className="px-4 py-3">{c.date}</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-white/10">{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-white/50"><LoaderCircle className="mr-2 inline animate-spin" size={17}/>{loadingLabel}</td></tr> : null}{!loading && !items.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-white/50">{c.empty}</td></tr> : null}{!loading && items.map((item) => <tr key={item.id} className="align-top hover:bg-white/[0.025]"><td className="px-4 py-3">{person(item.reporter)}</td><td className="px-4 py-3">{person(item.target)}</td><td className="px-4 py-3"><div>{item.roomName}</div><div className="mt-1 text-xs text-coral">{item.reason.replace(/_/g, " ")}</div>{item.details ? <p className="mt-2 max-w-sm whitespace-pre-wrap text-xs text-white/55">{item.details}</p> : null}</td><td className="px-4 py-3 text-white/60">{new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</td><td className="px-4 py-3">{statusLabel(item.status)}</td><td className="px-4 py-3">{item.status === "pending" ? <div className="flex gap-2"><button onClick={() => void review(item, "block")} className="rounded-md bg-coral px-3 py-2 text-xs font-semibold">{c.confirm}</button><button onClick={() => void review(item, "dismiss")} className="rounded-md bg-white/10 px-3 py-2 text-xs">{c.dismiss}</button></div> : <span className="text-xs text-white/40">{item.reviewerEmail ?? "—"}</span>}</td></tr>)}</tbody></table></div>
    <div className="flex items-center justify-between text-sm"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5 px-3 disabled:opacity-35"><ChevronLeft size={15}/>{previousLabel}</button><span className="text-white/55">{pageLabel(page, pages)}</span><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5 px-3 disabled:opacity-35">{nextLabel}<ChevronRight size={15}/></button></div>
  </div>;
}
