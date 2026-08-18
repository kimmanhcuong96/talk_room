import { Bot, ChevronLeft, Download, LoaderCircle, Save, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getVirtualUsers,
  getPresenceBotSettings,
  importVirtualUserProfiles,
  savePresenceBotSettings,
  saveVirtualUserProfile,
  type AdminVirtualUser,
  type VirtualUserProfile
} from "../../lib/adminAuth";
import type { Language } from "../../lib/i18n";
import { adminPath } from "../../lib/routes";
import { AdminReloadButton } from "./AdminReloadButton";
import { presenceBotCopy } from "./presenceBotI18n";

const labels = {
  en: { title: "Virtual Users", description: "15 fixed chat identities. Profiles can be edited, but bots cannot be added, removed, or renamed by ID.", back: "Back to dashboard", bot: "Bot", name: "Name", status: "Status", room: "Room", actions: "Actions", edit: "Edit", enabled: "Enabled", avatar: "Avatar URL", level: "English level", personality: "Personality", interests: "Interests (comma separated)", style: "Speaking style", probability: "Reply probability", proactiveProbability: "Proactive message probability", save: "Save profile", saving: "Saving...", available: "Available", active: "Active", loadFailed: "Could not load virtual users.", saved: "Profile updated." },
  vi: { title: "Virtual Users", description: "15 danh tính chat cố định. Có thể sửa hồ sơ nhưng không thể thêm, xóa hoặc đổi ID bot.", back: "Về trang quản trị", bot: "Bot", name: "Tên", status: "Trạng thái", room: "Phòng", actions: "Thao tác", edit: "Sửa", enabled: "Đang bật", avatar: "URL ảnh đại diện", level: "Trình độ tiếng Anh", personality: "Tính cách", interests: "Sở thích (phân cách bằng dấu phẩy)", style: "Phong cách trò chuyện", probability: "Xác suất trả lời", proactiveProbability: "Xác suất chủ động nhắn", save: "Lưu hồ sơ", saving: "Đang lưu...", available: "Sẵn sàng", active: "Đang hoạt động", loadFailed: "Không thể tải danh sách Virtual User.", saved: "Đã cập nhật hồ sơ." }
};

export function VirtualUsersPage({ token, language }: { token: string; language: Language }) {
  const t = language === "vi" ? labels.vi : labels.en;
  const presenceT = presenceBotCopy(language);
  const [items, setItems] = useState<AdminVirtualUser[]>([]);
  const [totalPresenceBots, setTotalPresenceBots] = useState(0);
  const [activePresenceBots, setActivePresenceBots] = useState(0);
  const [editing, setEditing] = useState<VirtualUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => Promise.allSettled([getVirtualUsers(token), getPresenceBotSettings(token)])
      .then(([users, presence]) => {
        if (cancelled) return;
        if (users.status === "fulfilled") setItems(users.value);
        if (presence.status === "fulfilled") {
          setTotalPresenceBots(presence.value.totalPresenceBots);
          setActivePresenceBots(presence.value.activePresenceBots);
        }
        setError(users.status === "rejected" ? t.loadFailed : presence.status === "rejected" ? presenceT.loadFailed : null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [token, refreshNonce, presenceT.loadFailed, t.loadFailed]);

  const save = async () => {
    if (!editing) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const updated = await saveVirtualUserProfile(token, editing);
      setItems((current) => current.map((item) => item.profile.id === updated.profile.id ? updated : item));
      setEditing(updated.profile); setNotice(t.saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t.loadFailed);
    } finally { setSaving(false); }
  };

  const savePresence = async () => {
    setSaving(true); setError(null); setNotice(null);
    try {
      const updated = await savePresenceBotSettings(token, totalPresenceBots);
      setTotalPresenceBots(updated.totalPresenceBots);
      setActivePresenceBots(updated.activePresenceBots);
      setNotice(presenceT.saved);
    } catch {
      setError(presenceT.saveFailed);
    } finally { setSaving(false); }
  };

  const exportProfiles = () => {
    const profiles = items.map(({ profile: { updatedAt: _updatedAt, ...profile } }) => profile);
    const url = URL.createObjectURL(new Blob([JSON.stringify(profiles, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `me2talk-virtual-users-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProfiles = async (file: File) => {
    setSaving(true); setError(null); setNotice(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("The import file must contain a JSON array of bot profiles.");
      const updated = await importVirtualUserProfiles(token, parsed as Array<Omit<VirtualUserProfile, "updatedAt">>);
      setItems(updated); setEditing(null); setNotice("All Virtual User profiles were imported.");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import Virtual User profiles.");
    } finally {
      setSaving(false);
      if (importInput.current) importInput.current.value = "";
    }
  };

  return <div className="grid gap-5">
    <a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16}/>{t.back}</a>
    <div className="flex flex-wrap justify-end gap-2">
      <button disabled={!items.length || saving} onClick={exportProfiles} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"><Download size={16}/>Export JSON</button>
      <button disabled={saving} onClick={() => importInput.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"><Upload size={16}/>Import JSON</button>
      <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProfiles(file); }}/>
      <AdminReloadButton language={language} loading={loading} onClick={() => setRefreshNonce((value) => value + 1)} />
    </div>
    <section className="rounded-xl border border-white/10 bg-panel p-5">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#258ff4]/15 text-[#55aaff]"><Bot size={22}/></span><div><h2 className="text-xl font-semibold">{t.title} ({items.length || 15})</h2><p className="mt-1 text-sm leading-6 text-white/55">{t.description}</p></div></div>
    </section>
    <section className="rounded-xl border border-white/10 bg-panel p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-semibold">{presenceT.title}</h2><p className="mt-1 text-sm text-white/55">{presenceT.description(activePresenceBots)}</p></div>
      <div className="flex items-end gap-2"><label className="text-sm text-white/65">{presenceT.totalLabel}<input type="number" min={0} step={1} value={totalPresenceBots} onChange={(event) => setTotalPresenceBots(Number(event.target.value))} className="mt-1 h-10 w-44 rounded-md border border-white/10 bg-field px-3 text-white"/></label><button disabled={saving || !Number.isSafeInteger(totalPresenceBots) || totalPresenceBots < 0} onClick={() => void savePresence()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#258ff4] px-4 text-sm font-semibold text-static-white disabled:opacity-40"><Save size={16}/>{presenceT.save}</button></div>
      </div>
    </section>
    {error ? <p className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p> : null}
    {notice && !editing ? <p className="rounded-md border border-mint/30 bg-mint/10 px-4 py-3 text-sm text-mint">{notice}</p> : null}
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-panel">
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">{t.bot}</th><th className="px-4 py-3">{t.name}</th><th className="px-4 py-3">{t.status}</th><th className="px-4 py-3">{t.room}</th><th className="px-4 py-3">{t.actions}</th></tr></thead>
      <tbody className="divide-y divide-white/8">{loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-white/50"><LoaderCircle className="mr-2 inline animate-spin" size={17}/></td></tr> : items.map((item) => <tr key={item.profile.id}><td className="px-4 py-3 font-mono text-mint">{item.profile.id}</td><td className="px-4 py-3"><div className="font-medium">{item.profile.name}</div><div className="text-xs text-white/40">{item.profile.englishLevel} · {item.profile.enabled ? t.enabled : "Disabled"}</div></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.runtime.status === "ACTIVE" ? "bg-mint/15 text-mint" : "bg-white/5 text-white/50"}`}>{item.runtime.status === "ACTIVE" ? t.active : t.available}</span></td><td className="px-4 py-3 text-white/60">{item.runtime.roomId ?? "—"}</td><td className="px-4 py-3"><button onClick={() => { setEditing({ ...item.profile }); setNotice(null); }} className="rounded-md bg-[#258ff4]/15 px-3 py-1.5 font-medium text-[#55aaff] hover:bg-[#258ff4]/25">{t.edit}</button></td></tr>)}</tbody></table>
    </div>

    {editing ? <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => setEditing(null)}><section className="my-auto w-full max-w-2xl rounded-xl border border-white/10 bg-panel p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between"><div><p className="font-mono text-xs text-mint">{editing.id}</p><h3 className="text-xl font-semibold">{editing.name}</h3></div><button onClick={() => setEditing(null)} className="rounded-md p-2 text-white/50 hover:bg-white/10"><X size={19}/></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">{t.name}<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={80} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">{t.avatar}<input value={editing.avatarUrl ?? ""} onChange={(e) => setEditing({ ...editing, avatarUrl: e.target.value || null })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">{t.level}<input value={editing.englishLevel} onChange={(e) => setEditing({ ...editing, englishLevel: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">{t.probability}<input type="number" min={0} max={1} step={0.05} value={editing.replyProbability} onChange={(e) => setEditing({ ...editing, replyProbability: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">{t.proactiveProbability}<input type="number" min={0} max={1} step={0.05} value={editing.proactiveMessageProbability} onChange={(e) => setEditing({ ...editing, proactiveMessageProbability: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Long response min (seconds)<input type="number" min={1} max={120} step={1} value={editing.longResponseDelayMinSeconds} onChange={(e) => setEditing({ ...editing, longResponseDelayMinSeconds: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Long response max (seconds)<input type="number" min={1} max={120} step={1} value={editing.longResponseDelayMaxSeconds} onChange={(e) => setEditing({ ...editing, longResponseDelayMaxSeconds: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Single sentence probability (%)<input type="number" min={0} max={100 - editing.threeSentenceProbability} step={1} value={editing.singleSentenceProbability} onChange={(e) => { const value = Math.min(100 - editing.threeSentenceProbability, Math.max(0, Number(e.target.value))); setEditing({ ...editing, singleSentenceProbability: value, twoSentenceProbability: 100 - editing.threeSentenceProbability - value }); }} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Two sentence probability (%)<input type="number" min={0} max={100 - editing.threeSentenceProbability} step={1} value={editing.twoSentenceProbability} onChange={(e) => { const value = Math.min(100 - editing.threeSentenceProbability, Math.max(0, Number(e.target.value))); setEditing({ ...editing, twoSentenceProbability: value, singleSentenceProbability: 100 - editing.threeSentenceProbability - value }); }} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Three sentence probability (%)<input type="number" min={0} max={100 - editing.twoSentenceProbability} step={1} value={editing.threeSentenceProbability} onChange={(e) => { const value = Math.min(100 - editing.twoSentenceProbability, Math.max(0, Number(e.target.value))); setEditing({ ...editing, threeSentenceProbability: value, singleSentenceProbability: 100 - editing.twoSentenceProbability - value }); }} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Leave when rejected probability (%)<input type="number" min={0} max={100} step={1} value={editing.leaveWhenRejectedProbability} onChange={(e) => setEditing({ ...editing, leaveWhenRejectedProbability: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65">Non-English reminder cooldown (seconds)<input type="number" min={0} max={3600} step={1} value={editing.nonEnglishReminderCooldownSeconds} onChange={(e) => setEditing({ ...editing, nonEnglishReminderCooldownSeconds: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65 sm:col-span-2">{t.personality}<textarea value={editing.personality} onChange={(e) => setEditing({ ...editing, personality: e.target.value })} className="mt-1 min-h-20 w-full rounded-md border border-white/10 bg-field p-3 text-white"/></label>
        <label className="text-sm text-white/65 sm:col-span-2">{t.interests}<input value={editing.interests.join(", ")} onChange={(e) => setEditing({ ...editing, interests: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white"/></label>
        <label className="text-sm text-white/65 sm:col-span-2">{t.style}<textarea value={editing.speakingStyle} onChange={(e) => setEditing({ ...editing, speakingStyle: e.target.value })} className="mt-1 min-h-20 w-full rounded-md border border-white/10 bg-field p-3 text-white"/></label>
        <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} className="h-4 w-4 accent-[#258ff4]"/>{t.enabled}</label>
      </div>
      {notice ? <p className="mt-4 text-sm text-mint">{notice}</p> : null}{error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}
      <button disabled={saving} onClick={() => void save()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#258ff4] px-5 text-sm font-semibold text-static-white disabled:opacity-40"><Save size={16}/>{saving ? t.saving : t.save}</button>
    </section></div> : null}
  </div>;
}
