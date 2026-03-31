"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/contexts/I18nContext";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() { return !navigator.onLine; }
function getServerSnapshot() { return false; }

export default function OfflineBanner() {
  const { t } = useI18n();
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
