"use client";

import { useState, useRef } from "react";
import { WeatherData } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";

function SharePanel({ data }: { data: WeatherData }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = `${data.location} — RideSafe MY\nSafety: ${data.safety_level} (${data.safety_score}/100)\nWeather: ${data.weather_description}\nWind: ${data.wind_speed_kmh} km/h | Rain: ${data.rain_mm}mm\nCheck yours at ridesafe.my`;

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent("https://ridesafe.my")}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleWebShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: t("shareTitle"), text: shareText });
    } catch {
      // user cancelled or not supported
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div
      ref={cardRef}
      className="mt-3 p-3 rounded-xl"
      style={{
        background: "rgba(30, 41, 59, 0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex gap-2">
        {hasNativeShare && (
          <button
            onClick={handleWebShare}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#93c5fd",
            }}
          >
            {t("shareCard")}
          </button>
        )}
        <button
          onClick={handleWhatsApp}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "rgba(37, 211, 102, 0.12)",
            border: "1px solid rgba(37, 211, 102, 0.3)",
            color: "#4ade80",
          }}
        >
          WhatsApp
        </button>
        <button
          onClick={handleTelegram}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "rgba(0, 136, 204, 0.12)",
            border: "1px solid rgba(0, 136, 204, 0.3)",
            color: "#38bdf8",
          }}
        >
          Telegram
        </button>
        <button
          onClick={handleCopy}
          className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: copied ? "#4ade80" : "#94a3b8",
          }}
        >
          {copied ? t("copied") : "Copy"}
        </button>
      </div>
    </div>
  );
}

interface WeatherCardProps {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

export default function WeatherCard({
  data,
  loading,
  error,
}: WeatherCardProps) {
  const { t } = useI18n();
  const [showShare, setShowShare] = useState(false);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-4" />
        <div className="flex justify-center mb-4">
          <div className="w-[120px] h-[120px] bg-slate-700/50 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-700/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="glass-card rounded-xl p-6 text-center"
        style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}
      >
        <p className="text-red-400 text-sm">{error}</p>
        <p className="text-xs opacity-50 mt-2">{t("tryAgain")}</p>
      </div>
    );
  }

  if (!data) return null;

  const safetyColor = getSafetyColor(data.safety_level);

  return (
    <div className="glass-card rounded-xl p-5">
      {/* Header — location + compact safety badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{data.location}</h2>
          <p className="text-sm opacity-60 capitalize">
            {data.weather_description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact safety badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: `${safetyColor}15`,
              border: `1px solid ${safetyColor}40`,
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: safetyColor }} />
            <span className="text-sm font-bold" style={{ color: safetyColor }}>
              {data.safety_score}
            </span>
          </div>
          <button
            onClick={() => setShowShare(!showShare)}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: showShare
                ? "rgba(59,130,246,0.2)"
                : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: showShare ? "#93c5fd" : "#64748b",
            }}
            aria-label={t("shareWeather")}
            title={t("shareWeather")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </div>

      {/* Primary: Weather Conditions Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div
          className="rounded-lg p-3 text-center"
          style={{
            background: data.rain_mm > 2 ? "rgba(239,68,68,0.08)" : "rgba(15,23,42,0.45)",
            border: `1px solid ${data.rain_mm > 2 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
          }}
        >
          <div className="text-[11px] opacity-50 uppercase tracking-wide mb-1">{t("rain")}</div>
          <div className="text-lg font-bold" style={{ color: data.rain_mm > 2 ? "#fca5a5" : "#e2e8f0" }}>
            {data.rain_mm}<span className="text-xs opacity-60 ml-0.5">mm</span>
          </div>
          <div className="text-[10px] opacity-45 capitalize mt-0.5">{data.rain_intensity}</div>
        </div>
        <div
          className="rounded-lg p-3 text-center"
          style={{
            background: "rgba(15,23,42,0.45)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="text-[11px] opacity-50 uppercase tracking-wide mb-1">{t("temp")}</div>
          <div className="text-lg font-bold">{data.temperature_c}<span className="text-xs opacity-60 ml-0.5">°C</span></div>
          <div className="text-[10px] opacity-45 mt-0.5">{data.humidity_pct}% {t("humidity").toLowerCase()}</div>
        </div>
        <div
          className="rounded-lg p-3 text-center"
          style={{
            background: data.wind_speed_kmh > 30 ? "rgba(234,179,8,0.08)" : "rgba(15,23,42,0.45)",
            border: `1px solid ${data.wind_speed_kmh > 30 ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.06)"}`,
          }}
        >
          <div className="text-[11px] opacity-50 uppercase tracking-wide mb-1">{t("wind")}</div>
          <div className="text-lg font-bold" style={{ color: data.wind_speed_kmh > 30 ? "#fde68a" : "#e2e8f0" }}>
            {data.wind_speed_kmh}<span className="text-xs opacity-60 ml-0.5">km/h</span>
          </div>
        </div>
      </div>

      {/* Secondary row: visibility */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div
          className="rounded-lg p-2.5 text-center"
          style={{
            background: "rgba(15,23,42,0.35)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="text-[11px] opacity-50 uppercase tracking-wide mb-0.5">{t("visibility")}</div>
          <div className="text-sm font-semibold">{data.visibility_km} km</div>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{
            background: `${safetyColor}08`,
            border: `1px solid ${safetyColor}20`,
          }}
        >
          <div className="text-[11px] opacity-50 uppercase tracking-wide mb-0.5">{t("ridingAdvice")}</div>
          <div className="text-sm font-semibold" style={{ color: safetyColor }}>
            {data.safety_level === "Safe" && t("goodConditions")}
            {data.safety_level === "Caution" && t("rideCaution")}
            {data.safety_level === "Dangerous" && t("avoidRiding")}
          </div>
        </div>
      </div>

      {/* Share panel */}
      {showShare && <SharePanel data={data} />}

      {/* Timestamp */}
      <div className="text-xs opacity-40 text-center mt-3">
        {t("updated")} {new Date(data.fetched_at).toLocaleTimeString()}
        {data.cached && ` ${t("cached")}`}
      </div>
    </div>
  );
}
