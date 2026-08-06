import type { Language } from "../lib/i18n";
import { getRoomLanguageName, type RoomLanguage } from "../lib/roomLanguages";

const tagLabels: Record<Language, { primary: string; secondary: string }> = {
  en: { primary: "Primary language", secondary: "Secondary language" },
  vi: { primary: "Ngôn ngữ chính", secondary: "Ngôn ngữ phụ" },
  zh: { primary: "主要语言", secondary: "辅助语言" },
  ja: { primary: "メイン言語", secondary: "サブ言語" }
};

export function RoomLanguageTags({
  primaryLanguage,
  secondaryLanguage,
  language
}: {
  primaryLanguage: RoomLanguage;
  secondaryLanguage: RoomLanguage | null;
  language: Language;
}) {
  const labels = tagLabels[language];
  const accessibleLabel = [
    `${labels.primary}: ${getRoomLanguageName(primaryLanguage)}`,
    secondaryLanguage ? `${labels.secondary}: ${getRoomLanguageName(secondaryLanguage)}` : null
  ].filter(Boolean).join(", ");

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={accessibleLabel}>
      <span dir="auto" title={labels.primary} className="rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 text-xs font-semibold text-mint">
        {getRoomLanguageName(primaryLanguage)}
      </span>
      {secondaryLanguage ? (
        <span dir="auto" title={labels.secondary} className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/65">
          {getRoomLanguageName(secondaryLanguage)}
        </span>
      ) : null}
    </div>
  );
}
