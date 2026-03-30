"use client";

import { useState, useCallback } from "react";
import {
  RouteCheckData,
  RouteWeatherSummary,
  SafetyLevel,
  WeatherData,
  MalaysiaLocation,
} from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";
import AddressSearch from "@/components/AddressSearch";
import NavigationHandoff from "@/components/NavigationHandoff";
import RideLogCard from "@/components/RideLogCard";
import { formatLocationDisplay, locationsMatch } from "@/lib/places";

interface RouteCheckProps {
  onRouteCheck: (
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ) => void;
  data: RouteCheckData | null;
  loading: boolean;
  error: string | null;
  weatherData?: WeatherData | null;
  startLocation: MalaysiaLocation | null;
  endLocation: MalaysiaLocation | null;
  routePlacementMode: "start" | "end" | null;
  onPickRoutePoint: (kind: "start" | "end") => void;
  onSetRoutePoint: (kind: "start" | "end", location: MalaysiaLocation) => void;
  onSwapRoutePoints: () => void;
  onClearRoutePoints: () => void;
  onLoadSavedRoute: (from: MalaysiaLocation, to: MalaysiaLocation) => void;
}

interface SavedRoute {
  id: string;
  from: MalaysiaLocation;
  to: MalaysiaLocation;
  lastScore?: number;
  lastLevel?: SafetyLevel;
}

const LS_KEY = "ridesafe-saved-routes";
const MAX_SAVED = 5;

function isValidLocation(value: unknown): value is MalaysiaLocation {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "lat" in value &&
    "lon" in value &&
    "state" in value &&
    typeof (value as MalaysiaLocation).name === "string" &&
    typeof (value as MalaysiaLocation).lat === "number" &&
    typeof (value as MalaysiaLocation).lon === "number" &&
    typeof (value as MalaysiaLocation).state === "string"
  );
}

function isValidSavedRoute(value: unknown): value is SavedRoute {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "from" in value &&
    "to" in value &&
    typeof (value as SavedRoute).id === "string" &&
    isValidLocation((value as SavedRoute).from) &&
    isValidLocation((value as SavedRoute).to)
  );
}

function loadSavedRoutes(): SavedRoute[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSavedRoute);
  } catch {
    return [];
  }
}

function persistSavedRoutes(routes: SavedRoute[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(routes));
  } catch {
    // Ignore storage failures in the beta UI.
  }
}

function formatCoords(location: MalaysiaLocation): string {
  return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
}

function formatRange(min: number, max: number, unit: string): string {
  return min === max ? `${min}${unit}` : `${min}-${max}${unit}`;
}

function toLabelCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildFallbackRouteWeatherSummary(data: RouteCheckData): RouteWeatherSummary {
  const temperatures = data.waypoints
    .map((waypoint) =>
      typeof waypoint.temperature_c === "number" ? waypoint.temperature_c : null
    )
    .filter((value): value is number => value !== null);
  const winds = data.waypoints
    .map((waypoint) =>
      typeof waypoint.wind_speed_kmh === "number" ? waypoint.wind_speed_kmh : null
    )
    .filter((value): value is number => value !== null);
  const wettestWaypoint = data.waypoints.reduce((current, waypoint) => {
    const currentRain = typeof current.rain_mm === "number" ? current.rain_mm : -1;
    const nextRain = typeof waypoint.rain_mm === "number" ? waypoint.rain_mm : -1;
    return nextRain > currentRain ? waypoint : current;
  }, data.waypoints[0]);
  const worstWaypoint = data.waypoints.reduce((current, waypoint) =>
    waypoint.safety_score < current.safety_score ? waypoint : current
  , data.waypoints[0]);

  return {
    temperature_min_c: temperatures.length > 0 ? Math.min(...temperatures) : 0,
    temperature_max_c: temperatures.length > 0 ? Math.max(...temperatures) : 0,
    wind_min_kmh: winds.length > 0 ? Math.min(...winds) : 0,
    wind_max_kmh: winds.length > 0 ? Math.max(...winds) : 0,
    max_rain_mm: typeof wettestWaypoint.rain_mm === "number" ? wettestWaypoint.rain_mm : 0,
    max_rain_intensity: wettestWaypoint.rain_intensity ?? "none",
    worst_waypoint_label: worstWaypoint.label,
    worst_waypoint_reason: worstWaypoint.weather_description,
    summary_text: `Watch the route near ${worstWaypoint.label}.`,
  };
}

function RouteWeatherMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(15, 23, 42, 0.45)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="text-[11px] opacity-50 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold" style={highlight ? { color: highlight } : undefined}>
        {value}
      </div>
    </div>
  );
}

export default function RouteCheck({
  onRouteCheck,
  data,
  loading,
  error,
  weatherData,
  startLocation,
  endLocation,
  routePlacementMode,
  onPickRoutePoint,
  onSetRoutePoint,
  onSwapRoutePoints,
  onClearRoutePoints,
  onLoadSavedRoute,
}: RouteCheckProps) {
  const { t } = useI18n();
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => loadSavedRoutes());

  const handleCheck = useCallback(() => {
    if (!startLocation || !endLocation || locationsMatch(startLocation, endLocation)) {
      return;
    }
    onRouteCheck(startLocation.lat, startLocation.lon, endLocation.lat, endLocation.lon);
  }, [endLocation, onRouteCheck, startLocation]);

  const handleSaveRoute = useCallback(() => {
    if (!startLocation || !endLocation || locationsMatch(startLocation, endLocation)) {
      return;
    }

    setSavedRoutes((prev) => {
      const isDuplicate = prev.some(
        (route) =>
          locationsMatch(route.from, startLocation) &&
          locationsMatch(route.to, endLocation)
      );
      if (isDuplicate) return prev;

      const next = [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          from: startLocation,
          to: endLocation,
          lastScore: data?.overall_score,
          lastLevel: data?.overall_level,
        },
      ].slice(-MAX_SAVED);
      persistSavedRoutes(next);
      return next;
    });
  }, [data?.overall_level, data?.overall_score, endLocation, startLocation]);

  const handleDeleteRoute = useCallback((id: string) => {
    setSavedRoutes((prev) => {
      const next = prev.filter((route) => route.id !== id);
      persistSavedRoutes(next);
      return next;
    });
  }, []);

  const alreadySaved =
    startLocation !== null &&
    endLocation !== null &&
    savedRoutes.some(
      (route) =>
        locationsMatch(route.from, startLocation) &&
        locationsMatch(route.to, endLocation)
    );
  const weatherSummary = data ? data.weather_summary ?? buildFallbackRouteWeatherSummary(data) : null;

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-lg font-bold mb-4">{t("routeCheck")}</h3>

      {savedRoutes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs opacity-60 uppercase tracking-wide mb-2">
            {t("savedRoutes")}
          </h4>
          <div className="space-y-2">
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => onLoadSavedRoute(route.from, route.to)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {route.lastLevel && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: getSafetyColor(route.lastLevel),
                      }}
                    />
                  )}
                  <span className="text-sm truncate">
                    {route.from.name} - {route.to.name}
                  </span>
                  {route.lastScore != null && (
                    <span
                      className="text-xs opacity-60 shrink-0"
                      style={
                        route.lastLevel
                          ? { color: getSafetyColor(route.lastLevel) }
                          : undefined
                      }
                    >
                      {route.lastScore}
                    </span>
                  )}
                </div>
                <button
                  className="ml-2 text-slate-500 hover:text-red-400 transition-colors shrink-0 p-1 text-lg leading-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoute(route.id);
                  }}
                  aria-label={`Delete saved route ${route.from.name} to ${route.to.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {routePlacementMode && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.2)",
            color: "#bfdbfe",
          }}
        >
          {routePlacementMode === "start"
            ? t("tapMapToPlaceStart")
            : t("tapMapToPlaceEnd")}
          <div className="text-xs opacity-70 mt-1">
            {t("routePlacementScrollHint")}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div
          className="w-full rounded-lg p-3 text-left transition-colors"
          style={{
            background:
              routePlacementMode === "start"
                ? "rgba(34,197,94,0.12)"
                : "rgba(15, 23, 42, 0.55)",
            border:
              routePlacementMode === "start"
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => onPickRoutePoint("start")}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs opacity-50 uppercase tracking-wide mb-1">
                {t("from")}
              </div>
              {startLocation ? (
                <>
                  <div className="text-sm font-medium truncate">
                    {formatLocationDisplay(startLocation)}
                  </div>
                  <div className="text-xs opacity-45 mt-0.5">
                    {formatCoords(startLocation)}
                  </div>
                </>
              ) : (
                <div className="text-sm opacity-45">{t("routeStartUnset")}</div>
              )}
            </div>
            <span
              className="px-3 py-2 rounded-lg text-xs font-medium shrink-0"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#86efac",
              }}
            >
              {t("pickStartOnMap")}
            </span>
          </button>
          <div className="mt-3">
            <AddressSearch
              onSelect={(location) => onSetRoutePoint("start", location)}
              placeholder={t("searchStartRoute")}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onSwapRoutePoints}
            disabled={!startLocation && !endLocation}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#60a5fa",
            }}
            aria-label={t("swapLocations")}
            title={t("swapLocations")}
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
              <path d="M7 16V4m0 0L3 8m4-4l4 4" />
              <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
          <button
            onClick={onClearRoutePoints}
            disabled={!startLocation && !endLocation}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#fca5a5",
            }}
          >
            {t("clearRoute")}
          </button>
        </div>

        <div
          className="w-full rounded-lg p-3 text-left transition-colors"
          style={{
            background:
              routePlacementMode === "end"
                ? "rgba(239,68,68,0.12)"
                : "rgba(15, 23, 42, 0.55)",
            border:
              routePlacementMode === "end"
                ? "1px solid rgba(239,68,68,0.3)"
                : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => onPickRoutePoint("end")}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs opacity-50 uppercase tracking-wide mb-1">
                {t("to")}
              </div>
              {endLocation ? (
                <>
                  <div className="text-sm font-medium truncate">
                    {formatLocationDisplay(endLocation)}
                  </div>
                  <div className="text-xs opacity-45 mt-0.5">
                    {formatCoords(endLocation)}
                  </div>
                </>
              ) : (
                <div className="text-sm opacity-45">{t("routeEndUnset")}</div>
              )}
            </div>
            <span
              className="px-3 py-2 rounded-lg text-xs font-medium shrink-0"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              {t("pickEndOnMap")}
            </span>
          </button>
          <div className="mt-3">
            <AddressSearch
              onSelect={(location) => onSetRoutePoint("end", location)}
              placeholder={t("searchEndRoute")}
            />
          </div>
        </div>
      </div>

      <p className="text-xs opacity-45 mb-4">{t("dragPinsHint")}</p>

      <button
        onClick={handleCheck}
        disabled={
          !startLocation ||
          !endLocation ||
          locationsMatch(startLocation, endLocation) ||
          loading
        }
        className="w-full bg-accent-blue hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {loading ? t("checkingRoute") : t("checkRouteSafety")}
      </button>

      {error && (
        <div className="text-red-400 text-sm text-center py-2">{error}</div>
      )}

      {data && !loading && (
        <div className="mt-4">
          {weatherSummary && (
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: "rgba(15, 23, 42, 0.62)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="mb-3">
                <div className="text-lg font-bold">{t("routeWeatherHeadline")}</div>
                <p className="text-sm opacity-60 mt-1">{t("routeWeatherSubhead")}</p>
              </div>
              <div
                className="rounded-lg px-3 py-2 text-sm mb-3"
                style={{
                  background: "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  color: "#dbeafe",
                }}
              >
                {weatherSummary.summary_text}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <RouteWeatherMetric
                  label={t("maxRain")}
                  value={`${weatherSummary.max_rain_mm.toFixed(1)} mm • ${toLabelCase(weatherSummary.max_rain_intensity)}`}
                  highlight={
                    weatherSummary.max_rain_intensity === "heavy"
                      ? "#fca5a5"
                      : weatherSummary.max_rain_intensity === "moderate"
                        ? "#fde68a"
                        : "#bfdbfe"
                  }
                />
                <RouteWeatherMetric
                  label={t("tempRange")}
                  value={formatRange(weatherSummary.temperature_min_c, weatherSummary.temperature_max_c, "°C")}
                />
                <RouteWeatherMetric
                  label={t("windRange")}
                  value={formatRange(weatherSummary.wind_min_kmh, weatherSummary.wind_max_kmh, " km/h")}
                />
                <RouteWeatherMetric
                  label={t("worstStretch")}
                  value={weatherSummary.worst_waypoint_label}
                  highlight={getSafetyColor(data.overall_level)}
                />
              </div>
            </div>
          )}

          <div
            className="text-center py-3 px-4 rounded-lg mb-4"
            style={{
              backgroundColor: `${getSafetyColor(data.overall_level)}15`,
              border: `1px solid ${getSafetyColor(data.overall_level)}40`,
            }}
          >
            <div className="text-xs opacity-60 uppercase tracking-wide mb-1">
              {t("routeRisk")}
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: getSafetyColor(data.overall_level) }}
            >
              {t(
                data.overall_level === "Safe"
                  ? "safe"
                  : data.overall_level === "Caution"
                    ? "caution"
                    : "dangerous"
              )}
            </div>
            <div
              className="text-sm opacity-80"
              style={{ color: getSafetyColor(data.overall_level) }}
            >
              {t("score")}: {data.overall_score}/100
            </div>
            {(data.distance_km != null || data.duration_min != null) && (
              <div className="flex justify-center gap-4 mt-2 text-xs opacity-60">
                {data.distance_km != null && <span>{data.distance_km} km</span>}
                {data.duration_min != null && <span>~{data.duration_min} min</span>}
              </div>
            )}
          </div>

          <div className="mb-2 text-xs opacity-50 uppercase tracking-wide">
            {t("routeSummary")}
          </div>
          <div className="space-y-2">
            {data.waypoints.map((wp, i) => {
              const color = getSafetyColor(wp.safety_level as SafetyLevel);
              return (
                <div
                  key={i}
                  className="py-2 px-3 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <span className="text-sm">{wp.label}</span>
                        <span className="block text-xs opacity-50 capitalize">
                          {wp.weather_description}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color }}>
                      {wp.safety_score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 pl-4">
                    <span className="text-[11px] opacity-55">
                      {typeof wp.rain_mm === "number" ? `${wp.rain_mm.toFixed(1)} mm ${wp.rain_intensity}` : wp.rain_intensity}
                    </span>
                    <span className="text-[11px] opacity-55">
                      {typeof wp.temperature_c === "number" ? `${wp.temperature_c}°C` : "--"}
                    </span>
                    <span className="text-[11px] opacity-55">
                      {typeof wp.wind_speed_kmh === "number" ? `${wp.wind_speed_kmh} km/h` : "--"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-3">
            <div className="flex items-center gap-1">
              {data.waypoints.map((wp, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getSafetyColor(
                        wp.safety_level as SafetyLevel
                      ),
                    }}
                  />
                  {i < data.waypoints.length - 1 && (
                    <div className="w-8 h-0.5 bg-slate-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveRoute}
            disabled={alreadySaved}
            className="w-full mt-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: "rgba(59, 130, 246, 0.4)",
              color: alreadySaved ? "#64748b" : "#93c5fd",
              background: alreadySaved
                ? "transparent"
                : "rgba(59, 130, 246, 0.1)",
            }}
          >
            {alreadySaved ? t("routeAlreadySaved") : t("saveRoute")}
          </button>

          {data.waypoints.length >= 2 && (
            <NavigationHandoff
              fromLat={data.waypoints[0].lat}
              fromLon={data.waypoints[0].lon}
              fromName={data.from}
              toLat={data.waypoints[data.waypoints.length - 1].lat}
              toLon={data.waypoints[data.waypoints.length - 1].lon}
              toName={data.to}
            />
          )}

          <RideLogCard routeData={data} weatherData={weatherData ?? null} />
        </div>
      )}
    </div>
  );
}
