import { RefreshCw } from "lucide-react";
import type { Language } from "../../lib/i18n";

const labels: Record<Language, string> = { en: "Reload", vi: "Tải lại", zh: "重新加载", ja: "再読み込み" };

export function AdminReloadButton({ language, loading, onClick }: { language: Language; loading: boolean; onClick: () => void }) {
  return <button type="button" disabled={loading} onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>{labels[language]}</button>;
}
