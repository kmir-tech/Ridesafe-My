"use client";

import { useState } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useI18n } from "@/contexts/I18nContext";
import { RouteCheckData, WeatherData } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";

interface RideLogCardProps {
  routeData: RouteCheckData;
  weatherData: WeatherData | null;
}

export default function RideLogCard({ routeData, weatherData }: RideLogCardProps) {
  const { user, openAuthModal } = useSupabase();
  const { t } = useI18n();
  const [notes, setNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div
        className="mt-3 p-4 rounded-xl text-center"
        style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-sm opacity-50 mb-2">{t("rideLogCTA")}</p>
        <button
          onClick={() => openAuthModal("signup")}
          className="text-xs text-blue-400 underline"
        >
          {t("signIn")}
        </button>
      </div>
    );
  }

  const handleLog = async () => {
    setLogging(true);
    setError(null);
    try {
      const body = {
        from_name: routeData.from,
        from_lat: routeData.waypoints[0]?.lat ?? 0,
        from_lon: routeData.waypoints[0]?.lon ?? 0,
        to_name: routeData.to,
        to_lat: routeData.waypoints[routeData.waypoints.length - 1]?.lat ?? 0,
        to_lon: routeData.waypoints[routeData.waypoints.length - 1]?.lon ?? 0,
        distance_km: routeData.distance_km,
        duration_min: routeData.duration_min,
        safety_score: routeData.overall_score,
        safety_level: routeData.overall_level,
        weather_summary: weatherData
          ? {
              description: weatherData.weather_description,
              temperature_c: weatherData.temperature_c,
              rain_intensity: weatherData.rain_intensity,
              wind_speed_kmh: weatherData.wind_speed_kmh,
              safety_score: weatherData.safety_score,
            }
          : null,
        notes: notes || undefined,
      };
      const res = await fetch("/api/ride-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to log ride");
      setLogged(true);
    } catch {
      setError("Failed to log ride. Please try again.");
    } finally {
      setLogging(false);
    }
  };

  if (logged) {
    return (
      <div
        className="mt-3 p-4 rounded-xl text-center"
        style={{
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <span className="text-sm text-green-400">✓ {t("rideLoggedSuccess")}</span>
      </div>
    );
  }

  const color = getSafetyColor(routeData.overall_level);

  return (
    <div
      className="mt-3 p-4 rounded-xl"
      style={{
        background: "rgba(30,41,59,0.6)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{t("logThisRide")}</span>
        <span className="text-xs font-bold" style={{ color }}>
          {routeData.overall_level} ({routeData.overall_score})
        </span>
      </div>
      <div className="text-xs opacity-50 mb-3">
        {routeData.from} → {routeData.to}
        {routeData.distance_km && ` · ${routeData.distance_km} km`}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("addNotes")}
        rows={2}
        className="w-full bg-slate-800/60 border border-slate-600 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-blue-500 mb-3"
      />
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <button
        onClick={handleLog}
        disabled={logging}
        className="w-full py-2 rounded-lg text-sm font-medium bg-accent-blue hover:bg-blue-600 disabled:opacity-40 text-white transition-colors"
      >
        {logging ? t("submitting") : t("logThisRide")}
      </button>
    </div>
  );
}
