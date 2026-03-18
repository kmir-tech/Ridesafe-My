"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";

export default function OfflineBanner() {
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium"
      style={{
        background: "rgba(239, 68, 68, 0.9)",
        backdropFilter: "blur(8px)",
        color: "#fff",
      }}
      role="status"
      aria-live="polite"
    >
      {t("offlineBanner")}
    </div>
  );
}
