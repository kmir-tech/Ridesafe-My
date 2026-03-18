"use client";

import { useI18n } from "@/contexts/I18nContext";
import UserMenu from "@/components/UserMenu";
import NotificationCenter from "@/components/NotificationCenter";

interface HeaderProps {
  onRideHistoryOpen: () => void;
}

export default function Header({ onRideHistoryOpen }: HeaderProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="flex items-center justify-between py-4 px-4 md:px-6">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-accent-blue rounded-lg flex items-center justify-center text-lg font-bold">
          R
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">{t("appName")}</h1>
          <p className="text-xs opacity-50 leading-tight">{t("appSubtitle")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "bm" : "en")}
          className="text-xs px-2.5 py-1 rounded-md border transition-colors"
          style={{
            borderColor: "rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.7)",
          }}
          aria-label="Toggle language"
        >
          {lang === "en" ? "BM" : "EN"}
        </button>

        {/* Notification bell */}
        <NotificationCenter />

        {/* User menu */}
        <UserMenu onRideHistoryOpen={onRideHistoryOpen} />
      </div>
    </header>
  );
}
