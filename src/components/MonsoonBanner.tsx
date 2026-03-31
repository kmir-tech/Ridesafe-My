"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getMonsoonAlert, MonsoonAlertLevel } from "@/lib/monsoon";

interface MonsoonBannerProps {
  cityName: string;
}

const MONSOON_DISMISS_EVENT = "ridesafe-monsoon-dismiss-change";

const LEVEL_STYLES: Record<
  Exclude<MonsoonAlertLevel, "none">,
  { bg: string; border: string; text: string; dot: string }
> = {
  high: {
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
    text: "#fca5a5",
    dot: "#ef4444",
  },
  moderate: {
    bg: "rgba(234, 179, 8, 0.12)",
    border: "rgba(234, 179, 8, 0.35)",
    text: "#fde68a",
    dot: "#eab308",
  },
  caution: {
    bg: "rgba(234, 179, 8, 0.08)",
    border: "rgba(234, 179, 8, 0.25)",
    text: "#fde68a",
    dot: "#eab308",
  },
};

export default function MonsoonBanner({ cityName }: MonsoonBannerProps) {
  const currentMonth = useSyncExternalStore(
    useCallback((callback: () => void) => {
      window.addEventListener("focus", callback);
      document.addEventListener("visibilitychange", callback);
      return () => {
        window.removeEventListener("focus", callback);
        document.removeEventListener("visibilitychange", callback);
      };
    }, []),
    () => new Date().getMonth() + 1,
    () => null
  );

  const alert =
    !cityName || currentMonth === null
      ? null
      : getMonsoonAlert(cityName, currentMonth);
  const dismissalKey =
    !alert || alert.level === "none"
      ? null
      : `ridesafe-monsoon-dismissed-${cityName}-${alert.seasonName}`;

  const dismissed = useSyncExternalStore(
    useCallback((callback: () => void) => {
      window.addEventListener("storage", callback);
      window.addEventListener(MONSOON_DISMISS_EVENT, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(MONSOON_DISMISS_EVENT, callback);
      };
    }, []),
    () => {
      if (!dismissalKey) return false;
      try {
        return sessionStorage.getItem(dismissalKey) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  if (!alert || alert.level === "none" || dismissed) return null;

  const styles = LEVEL_STYLES[alert.level as Exclude<MonsoonAlertLevel, "none">];

  const handleDismiss = () => {
    if (!dismissalKey) return;
    try {
      sessionStorage.setItem(dismissalKey, "true");
      window.dispatchEvent(new Event(MONSOON_DISMISS_EVENT));
    } catch {
      // sessionStorage unavailable (e.g. private browsing restrictions)
    }
  };

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
      role="alert"
      aria-live="polite"
    >
      <div
        className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
        style={{ backgroundColor: styles.dot }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-wide opacity-70"
          style={{ color: styles.text }}
        >
          {alert.seasonName}
        </p>
        <p className="text-sm mt-0.5" style={{ color: styles.text }}>
          {alert.advice}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-sm opacity-50 hover:opacity-80 transition-opacity shrink-0 mt-0.5"
        style={{ color: styles.text }}
        aria-label="Dismiss monsoon warning"
      >
        ✕
      </button>
    </div>
  );
}
