"use client";
import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";

export default function LanguageSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  const next = locale === "en" ? "ar" : "en";
  const label = next === "ar" ? "العربية" : "English";

  return (
    <button
      onClick={() => setLocale(next)}
      title={t("language.switchTo")}
      className={cn(
        "flex items-center gap-2 rounded-xl text-xs font-medium text-gray-500 hover:text-foreground hover:bg-gray-50 transition-colors",
        collapsed ? "justify-center p-2 w-full" : "px-3 py-2 w-full",
      )}
    >
      <Globe size={14} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
