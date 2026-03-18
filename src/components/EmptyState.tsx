"use client";

import { useState } from "react";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";
import { MalaysiaLocation } from "@/lib/types";
import { useI18n } from "@/contexts/I18nContext";

interface EmptyStateProps {
  onLocationSelect: (loc: MalaysiaLocation) => void;
}

function findNearest(lat: number, lon: number): MalaysiaLocation {
  let nearest = MALAYSIA_LOCATIONS[0];
  let minDist = Infinity;
  for (const loc of MALAYSIA_LOCATIONS) {
    const dist = Math.hypot(loc.lat - lat, loc.lon - lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = loc;
    }
  }
  return nearest;
}

export default function EmptyState({ onLocationSelect }: EmptyStateProps) {
  const { t } = useI18n();
  const [gpsState, setGpsState] = useState<
    "idle" | "locating" | "denied" | "done"
  >("idle");
  const [nearestName, setNearestName] = useState("");

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsState("denied");
      return;
    }
    setGpsState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = findNearest(pos.coords.latitude, pos.coords.longitude);
        setNearestName(loc.name);
        setGpsState("done");
        onLocationSelect(loc);
      },
      () => setGpsState("denied"),
      { timeout: 10000 }
    );
  };

  return (
    <div className="glass-card rounded-xl p-8 text-center">
      {/* Motorcycle SVG illustration */}
      <div className="flex justify-center mb-5">
        <svg
          viewBox="0 0 120 80"
          width="120"
          height="80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Road */}
          <ellipse cx="60" cy="72" rx="55" ry="6" fill="rgba(255,255,255,0.04)" />
          {/* Rear wheel */}
          <circle cx="28" cy="62" r="14" stroke="#3b82f6" strokeWidth="3" />
          <circle cx="28" cy="62" r="6" fill="#3b82f6" opacity="0.3" />
          {/* Front wheel */}
          <circle cx="92" cy="62" r="14" stroke="#3b82f6" strokeWidth="3" />
          <circle cx="92" cy="62" r="6" fill="#3b82f6" opacity="0.3" />
          {/* Body */}
          <path
            d="M28 62 L40 38 L60 34 L80 36 L92 48 L92 62"
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Seat */}
          <path
            d="M40 38 L65 34 L68 38 L42 42 Z"
            fill="#475569"
          />
          {/* Headlight */}
          <circle cx="92" cy="46" r="4" fill="#fbbf24" opacity="0.8" />
          {/* Rider silhouette */}
          <ellipse cx="52" cy="28" rx="6" ry="7" fill="#64748b" />
          <path
            d="M46 34 Q52 42 60 38 L58 32 Q54 36 48 32 Z"
            fill="#64748b"
          />
          {/* Rain drops (decorative) */}
          <line x1="10" y1="10" x2="8" y2="20" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
          <line x1="25" y1="5" x2="23" y2="15" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
          <line x1="105" y1="8" x2="103" y2="18" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
          <line x1="115" y1="20" x2="113" y2="30" stroke="#60a5fa" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="text-lg font-bold mb-1">{t("appName")}</h2>
      <p className="text-sm opacity-50 mb-6">{t("selectLocation")}</p>

      {/* GPS button */}
      {gpsState !== "done" && (
        <button
          onClick={handleUseMyLocation}
          disabled={gpsState === "locating"}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
          style={{
            background: "rgba(59, 130, 246, 0.2)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            color: "#93c5fd",
          }}
        >
          {gpsState === "locating" ? (
            <>
              <svg
                className="animate-spin"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              {t("locating")}
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {t("useMyLocation")}
            </>
          )}
        </button>
      )}

      {/* Permission denied */}
      {gpsState === "denied" && (
        <p className="text-xs text-red-400 mt-3">{t("permissionDenied")}</p>
      )}

      {/* Nearest city found */}
      {gpsState === "done" && nearestName && (
        <p className="text-xs opacity-50 mt-3">
          {t("nearestCity")} <span className="text-blue-400">{nearestName}</span>
        </p>
      )}
    </div>
  );
}
