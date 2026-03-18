"use client";

import { useI18n } from "@/contexts/I18nContext";

interface NavigationHandoffProps {
  fromLat: number;
  fromLon: number;
  fromName: string;
  toLat: number;
  toLon: number;
  toName: string;
}

export default function NavigationHandoff({
  fromLat,
  fromLon,
  fromName,
  toLat,
  toLon,
  toName,
}: NavigationHandoffProps) {
  const { t } = useI18n();

  const openWaze = () => {
    const url = `https://waze.com/ul?ll=${toLat},${toLon}&from=${fromLat},${fromLon}&navigate=yes`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={openWaze}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: "rgba(0, 207, 93, 0.1)",
          border: "1px solid rgba(0, 207, 93, 0.25)",
          color: "#34d399",
        }}
        title={`${t("openInWaze")}: ${fromName} → ${toName}`}
      >
        {/* Waze-style icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="10" r="8" opacity="0.3" />
          <circle cx="12" cy="10" r="3" />
          <path d="M12 18 Q14 22 16 23" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M12 18 Q10 22 8 23" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        {t("openInWaze")}
      </button>
      <button
        onClick={openGoogleMaps}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          background: "rgba(66, 133, 244, 0.1)",
          border: "1px solid rgba(66, 133, 244, 0.25)",
          color: "#60a5fa",
        }}
        title={`${t("openInGoogleMaps")}: ${fromName} → ${toName}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        {t("openInGoogleMaps")}
      </button>
    </div>
  );
}
