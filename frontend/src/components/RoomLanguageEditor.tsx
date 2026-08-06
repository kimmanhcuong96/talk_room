import { Languages, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type Language, translate } from "../lib/i18n";
import { roomLanguages, type RoomLanguage } from "../lib/roomLanguages";

type RoomLanguageEditorProps = {
  language: Language;
  primaryLanguage: RoomLanguage;
  secondaryLanguage: RoomLanguage | null;
  error: string | null;
  onClose: () => void;
  onSave: (primaryLanguage: RoomLanguage, secondaryLanguage: RoomLanguage | null) => void;
};

export function RoomLanguageEditor({
  language,
  primaryLanguage,
  secondaryLanguage,
  error,
  onClose,
  onSave
}: RoomLanguageEditorProps) {
  const [primary, setPrimary] = useState<RoomLanguage>(primaryLanguage);
  const [secondary, setSecondary] = useState<RoomLanguage | "">(secondaryLanguage ?? "");
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    setPrimary(primaryLanguage);
    setSecondary(secondaryLanguage ?? "");
  }, [primaryLanguage, secondaryLanguage]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="room-language-settings-title" className="w-full max-w-md rounded-lg border border-white/10 bg-[#182635] p-5 shadow-2xl shadow-black/45">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint/10 text-mint"><Languages size={20} /></span>
            <h2 id="room-language-settings-title" className="text-xl font-semibold text-white">{t("languageSettings")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="grid h-9 w-9 place-items-center rounded-md bg-white/5 text-white/65 transition hover:bg-white/10 hover:text-white">
            <X size={17} />
          </button>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(primary, secondary || null);
          }}
        >
          <label className="text-sm font-medium text-white/75" htmlFor="edit-room-primary-language">
            {t("primaryLanguage")}
            <select
              id="edit-room-primary-language"
              required
              value={primary}
              onChange={(event) => {
                const nextLanguage = event.target.value as RoomLanguage;
                setPrimary(nextLanguage);
                if (secondary === nextLanguage) setSecondary("");
              }}
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none focus:border-mint"
            >
              {roomLanguages.map((roomLanguage) => (
                <option key={roomLanguage.code} value={roomLanguage.code} className="bg-[#182635] text-white">{roomLanguage.nativeName}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-white/75" htmlFor="edit-room-secondary-language">
            {t("secondaryLanguage")} <span className="font-normal text-white/40">({t("optional")})</span>
            <select
              id="edit-room-secondary-language"
              value={secondary}
              onChange={(event) => setSecondary(event.target.value as RoomLanguage | "")}
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-field px-3 text-sm text-white outline-none focus:border-mint"
            >
              <option value="" className="bg-[#182635] text-white">{t("selectLanguage")}</option>
              {roomLanguages.filter((roomLanguage) => roomLanguage.code !== primary).map((roomLanguage) => (
                <option key={roomLanguage.code} value={roomLanguage.code} className="bg-[#182635] text-white">{roomLanguage.nativeName}</option>
              ))}
            </select>
          </label>

          {error ? <p className="rounded-md border border-coral/40 bg-coral/15 px-3 py-2 text-sm text-coral">{error}</p> : null}

          <div className="mt-1 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-md bg-white/5 px-4 text-sm text-white/75 transition hover:bg-white/10">{t("cancel")}</button>
            <button type="submit" className="h-10 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90">{t("saveChanges")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
