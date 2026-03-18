"use client";

import { useState, useEffect } from "react";
import { getMonsoonAlert, MonsoonAlertLevel } from "@/lib/monsoon";

interface MonsoonBannerProps {
  cityName: string;
}

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
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Resolve month client-side to avoid SSR/hydration mismatch
  useEffect(() => {
    setCurrentMonth(new Date().getMonth() + 1);
  }, []);

  // Re-check dismissal from sessionStorage whenever city or month changes
  useEffect(() => {
    if (!currentMonth || !cityName) return;
    const alert = getMonsoonAlert(cityName, currentMonth);
    if (alert.level === "none") return;
    const key = `ridesafe-monsoon-dismissed-${cityName}-${alert.seasonName}`;
    try {
      setDismissed(sessionStorage.getItem(key) === "true");
    } catch {
      setDismissed(false);
    }
  }, [cityName, currentMonth]);

  if (!cityName || currentMonth === null) return null;

  const alert = getMonsoonAlert(cityName, currentMonth);
  if (alert.level === "none" || dismissed) return null;

  const styles = LEVEL_STYLES[alert.level as Exclude<MonsoonAlertLevel, "none">];

  const handleDismiss = () => {
    const key = `ridesafe-monsoon-dismissed-${cityName}-${alert.seasonName}`;
    try {
      sessionStorage.setItem(key, "true");
    } catch {
      // sessionStorage unavailable (e.g. private browsing restrictions)
    }
    setDismissed(true);
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
