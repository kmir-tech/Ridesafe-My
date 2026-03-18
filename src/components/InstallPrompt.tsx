"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    setDismissed(true);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl p-4 flex items-center gap-3"
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(59,130,246,0.35)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="w-10 h-10 bg-accent-blue rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
      >
        R
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{t("installApp")}</p>
        <p className="text-xs opacity-50">{t("installPrompt")}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="text-xs opacity-50 hover:opacity-80 px-2 py-1"
        >
          {t("notNow")}
        </button>
        <button
          onClick={handleInstall}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{
            background: "#3b82f6",
            color: "#fff",
          }}
        >
          {t("install")}
        </button>
      </div>
    </div>
  );
}
