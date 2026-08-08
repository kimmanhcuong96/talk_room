import { Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Language } from "../lib/i18n";
import { getTopicBackground, getTopicFont, getTopicIcon, topicBackgrounds, topicFonts, topicIcons } from "../lib/roomTopic";
import { roomTopicTranslate } from "../lib/roomTopicI18n";
import type { RoomTopic as RoomTopicValue } from "../types/realtime";

export function RoomTopicBanner({ topic, language }: { topic: RoomTopicValue; language: Language }) {
  const Icon = getTopicIcon(topic.icon);
  return <section aria-label={roomTopicTranslate(language, "topic")} className={`mx-2 mt-2 flex shrink-0 items-start gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/10 sm:mx-4 sm:mt-4 ${getTopicBackground(topic.background)}`}>
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white"><Icon size={19}/></span>
    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{roomTopicTranslate(language, "topic")}</p><p className={`mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/90 ${getTopicFont(topic.font)}`}>{topic.description}</p></div>
  </section>;
}

export function RoomTopicEditor({ topic, language, error, saving, onClose, onSave }: { topic: RoomTopicValue | null; language: Language; error: string | null; saving: boolean; onClose: () => void; onSave: (topic: RoomTopicValue | null) => void }) {
  const [description, setDescription] = useState(topic?.description ?? "");
  const [background, setBackground] = useState<RoomTopicValue["background"]>(topic?.background ?? "blue");
  const [font, setFont] = useState<RoomTopicValue["font"]>(topic?.font ?? "sans");
  const [icon, setIcon] = useState<RoomTopicValue["icon"]>(topic?.icon ?? "message");
  const [localError, setLocalError] = useState<string | null>(null);
  const t = (key: Parameters<typeof roomTopicTranslate>[1]) => roomTopicTranslate(language, key);
  const preview = { description: description.trim() || t("placeholder"), background, font, icon };
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm" onMouseDown={onClose}><form onSubmit={(event) => { event.preventDefault(); const clean = description.trim(); if (!clean) { setLocalError(t("required")); return; } onSave({ description: clean, background, font, icon }); }} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-xl border border-white/10 bg-panel p-5 text-white shadow-2xl">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{t("edit")}</h2><button type="button" onClick={onClose} className="rounded-md p-2 text-white/55 hover:bg-white/10 hover:text-white"><X size={18}/></button></div>
    <label className="mt-5 block text-sm text-white/70">{t("description")}<textarea autoFocus maxLength={500} value={description} onChange={(event) => { setDescription(event.target.value); setLocalError(null); }} placeholder={t("placeholder")} className="mt-2 min-h-28 w-full resize-y rounded-md border border-white/10 bg-field p-3 text-sm outline-none focus:border-mint"/><span className="mt-1 block text-right text-xs text-white/35">{description.length}/500</span></label>
    <fieldset className="mt-4"><legend className="text-sm text-white/70">{t("background")}</legend><div className="mt-2 flex flex-wrap gap-2">{topicBackgrounds.map((item) => <button key={item.value} type="button" aria-label={item.value} aria-pressed={background === item.value} onClick={() => setBackground(item.value)} className={`h-8 w-8 rounded-full ${item.swatch} ${background === item.value ? "ring-2 ring-white ring-offset-2 ring-offset-panel" : "opacity-65 hover:opacity-100"}`}/>)}</div></fieldset>
    <fieldset className="mt-4"><legend className="text-sm text-white/70">{t("font")}</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{topicFonts.map((item) => <button key={item.value} type="button" aria-pressed={font === item.value} onClick={() => setFont(item.value)} className={`rounded-md border px-3 py-2 text-sm ${item.className} ${font === item.value ? "border-mint bg-mint/10 text-mint" : "border-white/10 text-white/60 hover:bg-white/5"}`}>{t(item.value)}</button>)}</div></fieldset>
    <fieldset className="mt-4"><legend className="text-sm text-white/70">{t("icon")}</legend><div className="mt-2 flex flex-wrap gap-2">{topicIcons.map(({ value, Icon }) => <button key={value} type="button" aria-label={value} aria-pressed={icon === value} onClick={() => setIcon(value)} className={`grid h-10 w-10 place-items-center rounded-md border ${icon === value ? "border-mint bg-mint/10 text-mint" : "border-white/10 text-white/55 hover:bg-white/5"}`}><Icon size={18}/></button>)}</div></fieldset>
    <div className="mt-5"><RoomTopicBanner topic={preview} language={language}/></div>
    {localError || error ? <p className="mt-3 text-sm text-coral">{localError ?? error}</p> : null}
    <div className="mt-5 flex flex-wrap justify-between gap-3"><div>{topic ? <button disabled={saving} type="button" onClick={() => onSave(null)} className="inline-flex h-10 items-center gap-2 rounded-md bg-coral/10 px-3 text-sm text-coral hover:bg-coral/20 disabled:opacity-45"><Trash2 size={16}/>{t("remove")}</button> : null}</div><div className="flex gap-2"><button disabled={saving} type="button" onClick={onClose} className="h-10 rounded-md bg-white/5 px-4 text-sm text-white/65 hover:bg-white/10 disabled:opacity-45">{t("cancel")}</button><button disabled={saving} className="h-10 rounded-md bg-mint px-4 text-sm font-semibold text-ink hover:bg-mint/90 disabled:cursor-wait disabled:opacity-55">{saving ? t("saving") : t("save")}</button></div></div>
  </form></div>;
}
