"use client";

import { ForecastData, SafetyLevel } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";

interface ForecastTimelineProps {
  data: ForecastData | null;
  loading: boolean;
}

export default function ForecastTimeline({
  data,
  loading,
}: ForecastTimelineProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 w-20 bg-slate-700 rounded-lg shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.hourly.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-lg font-bold mb-4">{t("forecastTimeline")}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {data.hourly.map((hour, i) => {
          const time = new Date(hour.time);
          const color = getSafetyColor(hour.safety_level as SafetyLevel);
          return (
            <div
              key={i}
              className="flex flex-col items-center shrink-0 p-3 rounded-lg border min-w-[80px]"
              style={{
                borderColor: `${color}40`,
                backgroundColor: `${color}08`,
              }}
            >
              <span className="text-xs opacity-60 mb-1">
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <img
                src={`https://openweathermap.org/img/wn/${hour.weather_icon}.png`}
                alt={hour.weather_description}
                className="w-10 h-10"
              />
              <span className="text-sm font-bold" style={{ color }}>
                {hour.safety_score}
              </span>
              <span className="text-xs opacity-70">
                {hour.temperature_c}°C
              </span>
              <span className="text-xs opacity-50">
                {hour.wind_speed_kmh} km/h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
