"use client";

import { useState, useEffect, useRef } from "react";
import { WeatherData, SafetyLevel } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 48;

function SafetyGauge({ score, level }: { score: number; level: SafetyLevel }) {
  const color = getSafetyColor(level);
  const [animated, setAnimated] = useState(0);
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = GAUGE_CIRCUMFERENCE * (1 - animated / 100);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{
            transition: "stroke-dashoffset 1.2s ease-out, stroke 0.5s ease",
            filter: `drop-shadow(0 0 6px ${color}60)`,
          }}
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          fill={color}
          fontSize="28"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          {score}
        </text>
        <text
          x="60"
          y="76"
          textAnchor="middle"
          fill={color}
          fontSize="12"
          fontFamily="Arial, sans-serif"
          opacity="0.8"
        >
          {t(
            level === "Safe"
              ? "safe"
              : level === "Caution"
              ? "caution"
              : "dangerous"
          )}
        </text>
      </svg>
    </div>
  );
}

function WeatherStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col items-center p-2">
      <span className="text-xs opacity-60 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-semibold">
        {value}
        {unit && <span className="text-sm opacity-70 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

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

  return (
    <div className="glass-card rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{data.location}</h2>
          <p className="text-sm opacity-60 capitalize">
            {data.weather_description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.weather_icon && (
            <img
              src={`https://openweathermap.org/img/wn/${data.weather_icon}@2x.png`}
              alt={data.weather_description}
              className="w-16 h-16"
            />
          )}
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

      {/* Safety Gauge */}
      <div className="flex justify-center mb-5">
        <SafetyGauge score={data.safety_score} level={data.safety_level} />
      </div>

      {/* Riding advice */}
      <div
        className="text-center text-sm font-medium mb-4 py-2 px-3 rounded-lg"
        style={{
          backgroundColor: `${getSafetyColor(data.safety_level)}15`,
          color: getSafetyColor(data.safety_level),
        }}
      >
        {data.safety_level === "Safe" && t("goodConditions")}
        {data.safety_level === "Caution" && t("rideCaution")}
        {data.safety_level === "Dangerous" && t("avoidRiding")}
      </div>

      {/* Weather Stats Grid */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <WeatherStat label={t("temp")} value={data.temperature_c} unit="°C" />
        <WeatherStat label={t("rain")} value={data.rain_mm} unit="mm" />
        <WeatherStat label={t("wind")} value={data.wind_speed_kmh} unit="km/h" />
      </div>
      <div className="grid grid-cols-3 gap-1">
        <WeatherStat label={t("humidity")} value={data.humidity_pct} unit="%" />
        <WeatherStat label={t("visibility")} value={data.visibility_km} unit="km" />
        <WeatherStat label={t("rainType")} value={data.rain_intensity} />
      </div>

      {/* Share panel */}
      {showShare && <SharePanel data={data} />}

      {/* Timestamp */}
      <div className="text-xs opacity-40 text-center mt-4">
        {t("updated")} {new Date(data.fetched_at).toLocaleTimeString()}
        {data.cached && ` ${t("cached")}`}
      </div>
    </div>
  );
}
