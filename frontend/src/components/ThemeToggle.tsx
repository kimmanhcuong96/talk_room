import { Moon, Sun } from "lucide-react";
import type { Language } from "../lib/i18n";
import { useTheme } from "../lib/theme";

const labels: Record<Language, { dark: string; light: string; toDark: string; toLight: string }> = {
  en: { dark: "Dark theme", light: "Light theme", toDark: "Switch to dark theme", toLight: "Switch to light theme" },
  vi: { dark: "Giao diện tối", light: "Giao diện sáng", toDark: "Chuyển sang giao diện tối", toLight: "Chuyển sang giao diện sáng" },
  zh: { dark: "深色主题", light: "浅色主题", toDark: "切换到深色主题", toLight: "切换到浅色主题" },
  ja: { dark: "ダークテーマ", light: "ライトテーマ", toDark: "ダークテーマに切り替える", toLight: "ライトテーマに切り替える" }
};

export function ThemeToggle({ language, compact = false }: { language: Language; compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const light = theme === "light";
  const label = labels[language];
  const actionLabel = light ? label.toDark : label.toLight;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={toggleTheme}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-panel text-white/75 shadow-sm transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60 ${compact ? "h-9 w-9" : "h-10 px-3 text-sm font-medium"}`}
    >
      {light ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      {compact ? null : <span>{light ? label.light : label.dark}</span>}
    </button>
  );
}
