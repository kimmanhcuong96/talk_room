import { Flag, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import type { Language } from "../lib/i18n";
import { moderationTranslate } from "../lib/moderationI18n";
import type { ReportReason, RoomUser } from "../types/realtime";
import { AvatarBadge } from "./AvatarBadge";

const reasons: ReportReason[] = ["harassment", "hate_speech", "sexual_content", "spam", "impersonation", "other"];

export function RoomModerationPanel(props: {
  users: RoomUser[]; currentSocketId: string; canBlock: boolean; language: Language; open: boolean;
  onClose: () => void; onReport: (targetSocketId: string, reason: ReportReason, details: string) => void;
  onBlock: (targetSocketId: string) => void;
}) {
  const [reportTarget, setReportTarget] = useState<RoomUser | null>(null);
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const t = (key: Parameters<typeof moderationTranslate>[1]) => moderationTranslate(props.language, key);
  if (!props.open) return null;
  const participants = props.users.filter((user) => user.socketId !== props.currentSocketId);

  return <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onMouseDown={props.onClose}>
    <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-panel p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="text-mint" size={20}/>{t("safety")}</h2><p className="mt-1 text-sm text-white/55">{t("safetyDescription")}</p></div><button type="button" onClick={props.onClose} className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={19}/></button></div>
      <div className="mt-5 grid gap-3">{participants.length === 0 ? <p className="rounded-md border border-white/10 p-4 text-sm text-white/50">{t("noParticipants")}</p> : participants.map((user) => <div key={user.socketId} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center gap-3"><AvatarBadge avatar={user.avatar} size="md"/><span className="min-w-0 flex-1 truncate font-medium">{user.nickname}</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setReportTarget(user)} className="inline-flex items-center gap-1.5 rounded-md border border-coral/30 px-3 py-1.5 text-xs text-coral hover:bg-coral/10"><Flag size={14}/>{t("report")}</button>{props.canBlock ? <button type="button" onClick={() => { if (window.confirm(t("confirmBlock"))) props.onBlock(user.socketId); }} className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">{t("block")}</button> : null}</div></div>)}</div>
      {reportTarget ? <form className="mt-5 rounded-lg border border-coral/25 bg-coral/5 p-4" onSubmit={(event) => { event.preventDefault(); props.onReport(reportTarget.socketId, reason, details); setReportTarget(null); setDetails(""); }}><h3 className="font-semibold">{t("report")}: {reportTarget.nickname}</h3><label className="mt-3 block text-xs text-white/60">{t("reason")}</label><select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-sm">{reasons.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select><label className="mt-3 block text-xs text-white/60">{t("details")}</label><textarea maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={t("detailsPlaceholder")} className="mt-1 min-h-24 w-full resize-y rounded-md border border-white/10 bg-field p-3 text-sm outline-none focus:border-coral/50"/><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setReportTarget(null)} className="rounded-md px-3 py-2 text-sm text-white/60 hover:bg-white/10">Cancel</button><button className="rounded-md bg-coral px-3 py-2 text-sm font-semibold text-white hover:bg-coral/90">{t("submitReport")}</button></div></form> : null}
    </aside>
  </div>;
}
