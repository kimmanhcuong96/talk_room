import { Bot, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getVirtualUserSettings,
  saveVirtualUserSettings,
  type VirtualUserSettings
} from "../../lib/adminAuth";
import type { Language } from "../../lib/i18n";
import { virtualUserTranslate } from "../../lib/virtualUserI18n";

export function VirtualUsersSettingsPanel({ token, language }: { token: string; language: Language }) {
  const [settings, setSettings] = useState<VirtualUserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const t = (key: Parameters<typeof virtualUserTranslate>[1]) => virtualUserTranslate(language, key);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVirtualUserSettings(token)
      .then((value) => {
        if (!cancelled) setSettings(value);
      })
      .catch(() => {
        if (!cancelled) setError(virtualUserTranslate(language, "loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [language, token]);

  const valid = settings
    ? settings.virtualUserCount >= settings.targetRoomCount
      && settings.virtualUserCount <= settings.targetRoomCount * 4
    : false;

  const save = async () => {
    if (!settings || !valid) {
      setError(t("invalid"));
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      setSettings(await saveVirtualUserSettings(token, settings));
      setNotice(t("saved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("loadFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#258ff4]/25 bg-panel p-5 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#258ff4]/15 text-[#55aaff]">
            <Bot size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/55">{t("description")}</p>
          </div>
        </div>
        {settings ? (
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${settings.enabled ? "bg-mint/15 text-mint" : "bg-white/5 text-white/45"}`}>
            {settings.enabled ? t("active") : t("inactive")}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 flex items-center text-white/50" aria-label={t("title")}>
          <LoaderCircle size={17} className="animate-spin" />
        </div>
      ) : settings ? (
        <div className="mt-5 grid gap-4">
          <label className="flex w-fit items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
              className="h-4 w-4 accent-[#258ff4]"
            />
            {t("enabled")}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-white/65">
              {t("users")}
              <input
                type="number"
                min={1}
                max={72}
                value={settings.virtualUserCount}
                onChange={(event) => setSettings({ ...settings, virtualUserCount: Number(event.target.value) })}
                className="mt-2 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white outline-none focus:border-mint"
              />
            </label>
            <label className="text-sm text-white/65">
              {t("rooms")}
              <input
                type="number"
                min={1}
                max={18}
                value={settings.targetRoomCount}
                onChange={(event) => setSettings({ ...settings, targetRoomCount: Number(event.target.value) })}
                className="mt-2 h-10 w-full rounded-md border border-white/10 bg-field px-3 text-white outline-none focus:border-mint"
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-white/40">{t("hint")}</p>
          {!valid ? <p className="text-sm text-coral">{t("invalid")}</p> : null}
          {error ? <p className="text-sm text-coral">{error}</p> : null}
          {notice ? <p className="text-sm text-mint">{notice}</p> : null}
          <button
            type="button"
            disabled={saving || !valid}
            onClick={() => void save()}
            className="h-10 w-fit rounded-md bg-[#258ff4] px-5 text-sm font-semibold text-white hover:bg-[#1d7edb] disabled:opacity-40"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
