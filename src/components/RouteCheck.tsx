"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";
import { RouteCheckData, SafetyLevel } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";
import NavigationHandoff from "@/components/NavigationHandoff";
import RideLogCard from "@/components/RideLogCard";
import { WeatherData } from "@/lib/types";

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
}

interface SavedRoute {
  id: string;
  fromIdx: number;
  toIdx: number;
  fromName: string;
  toName: string;
  lastScore?: number;
  lastLevel?: SafetyLevel;
}

const LS_KEY = "ridesafe-saved-routes";
const MAX_SAVED = 5;

function isValidSavedRoute(r: unknown): r is SavedRoute {
  return (
    typeof r === "object" &&
    r !== null &&
    "id" in r &&
    "fromIdx" in r &&
    "toIdx" in r &&
    "fromName" in r &&
    "toName" in r &&
    typeof (r as SavedRoute).id === "string" &&
    typeof (r as SavedRoute).fromIdx === "number" &&
    typeof (r as SavedRoute).toIdx === "number" &&
    (r as SavedRoute).fromIdx >= 0 &&
    (r as SavedRoute).fromIdx < MALAYSIA_LOCATIONS.length &&
    (r as SavedRoute).toIdx >= 0 &&
    (r as SavedRoute).toIdx < MALAYSIA_LOCATIONS.length
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
    // Storage quota exceeded — silently fail
  }
}

function safeLocation(idx: number) {
  if (idx < 0 || idx >= MALAYSIA_LOCATIONS.length) return null;
  return MALAYSIA_LOCATIONS[idx];
}

// --- Combobox ---

interface ComboboxProps {
  value: string; // index as string, or ""
  onChange: (idx: string) => void;
  placeholder: string;
  excludeIdx?: string;
}

function LocationCombobox({
  value,
  onChange,
  placeholder,
  excludeIdx,
}: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLoc = value !== "" ? safeLocation(parseInt(value, 10)) : null;

  const filtered = MALAYSIA_LOCATIONS.filter((loc, i) => {
    if (excludeIdx !== "" && i === parseInt(excludeIdx ?? "", 10)) return false;
    if (!query) return true;
    return (
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      loc.state.toLowerCase().includes(query.toLowerCase())
    );
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputFocus = () => {
    setQuery("");
    setOpen(true);
  };

  const handleSelect = (idx: number) => {
    onChange(idx.toString());
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const displayValue = open
    ? query
    : selectedLoc
    ? `${selectedLoc.name}, ${selectedLoc.state}`
    : "";

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue transition-colors"
      />
      {/* Clear button */}
      {value !== "" && !open && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 text-lg leading-none"
          tabIndex={-1}
          aria-label="Clear selection"
        >
          ×
        </button>
      )}

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto z-50"
          style={{
            background: "rgba(15, 23, 42, 0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxHeight: "200px",
          }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm opacity-40">No results</div>
          ) : (
            filtered.map((loc, _i) => {
              const idx = MALAYSIA_LOCATIONS.indexOf(loc);
              return (
                <button
                  key={loc.name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(idx);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700/60 transition-colors border-b last:border-0"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <span className="font-medium">{loc.name}</span>
                  <span className="ml-1 opacity-50 text-xs">{loc.state}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export default function RouteCheck({
  onRouteCheck,
  data,
  loading,
  error,
  weatherData,
}: RouteCheckProps) {
  const { t } = useI18n();
  const [fromIdx, setFromIdx] = useState("");
  const [toIdx, setToIdx] = useState("");
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(
    () => loadSavedRoutes()
  );

  const savedRoutesRef = useRef(savedRoutes);
  savedRoutesRef.current = savedRoutes;

  const handleCheck = useCallback(() => {
    if (fromIdx === "" || toIdx === "" || fromIdx === toIdx) return;
    const from = safeLocation(parseInt(fromIdx, 10));
    const to = safeLocation(parseInt(toIdx, 10));
    if (!from || !to) return;
    onRouteCheck(from.lat, from.lon, to.lat, to.lon);
  }, [fromIdx, toIdx, onRouteCheck]);

  const handleSwap = () => {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
  };

  const handleSaveRoute = () => {
    if (fromIdx === "" || toIdx === "" || fromIdx === toIdx) return;
    const fromIdxNum = parseInt(fromIdx, 10);
    const toIdxNum = parseInt(toIdx, 10);
    const from = safeLocation(fromIdxNum);
    const to = safeLocation(toIdxNum);
    if (!from || !to) return;

    const isDuplicate = savedRoutes.some(
      (r) => r.fromIdx === fromIdxNum && r.toIdx === toIdxNum
    );
    if (isDuplicate) return;

    const newRoute: SavedRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fromIdx: fromIdxNum,
      toIdx: toIdxNum,
      fromName: from.name,
      toName: to.name,
      lastScore: data?.overall_score,
      lastLevel: data?.overall_level,
    };

    const updated = [...savedRoutes, newRoute].slice(-MAX_SAVED);
    setSavedRoutes(updated);
    persistSavedRoutes(updated);
  };

  const handleDeleteRoute = (id: string) => {
    const updated = savedRoutes.filter((r) => r.id !== id);
    setSavedRoutes(updated);
    persistSavedRoutes(updated);
  };

  const handleLoadSavedRoute = (route: SavedRoute) => {
    const from = safeLocation(route.fromIdx);
    const to = safeLocation(route.toIdx);
    if (!from || !to) return;
    setFromIdx(route.fromIdx.toString());
    setToIdx(route.toIdx.toString());
    onRouteCheck(from.lat, from.lon, to.lat, to.lon);
  };

  useEffect(() => {
    if (!data || fromIdx === "" || toIdx === "") return;
    const fromIdxNum = parseInt(fromIdx, 10);
    const toIdxNum = parseInt(toIdx, 10);
    const current = savedRoutesRef.current;

    const updated = current.map((r) =>
      r.fromIdx === fromIdxNum && r.toIdx === toIdxNum
        ? { ...r, lastScore: data.overall_score, lastLevel: data.overall_level }
        : r
    );

    const changed = updated.some(
      (r, i) =>
        r.lastScore !== current[i].lastScore ||
        r.lastLevel !== current[i].lastLevel
    );

    if (changed) {
      setSavedRoutes(updated);
      persistSavedRoutes(updated);
    }
  }, [data, fromIdx, toIdx]);

  const fromIdxNum = fromIdx !== "" ? parseInt(fromIdx, 10) : -1;
  const toIdxNum = toIdx !== "" ? parseInt(toIdx, 10) : -1;
  const alreadySaved =
    fromIdxNum >= 0 &&
    toIdxNum >= 0 &&
    savedRoutes.some(
      (r) => r.fromIdx === fromIdxNum && r.toIdx === toIdxNum
    );

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-lg font-bold mb-4">{t("routeCheck")}</h3>

      {/* Saved Routes */}
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
                onClick={() => handleLoadSavedRoute(route)}
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
                    {route.fromName} → {route.toName}
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
                  aria-label={`Delete saved route ${route.fromName} to ${route.toName}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="flex flex-col gap-2 mb-4">
        <div>
          <label className="text-xs opacity-60 uppercase tracking-wide mb-1 block">
            {t("from")}
          </label>
          <LocationCombobox
            value={fromIdx}
            onChange={setFromIdx}
            placeholder={t("selectStart")}
            excludeIdx={toIdx}
          />
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            disabled={fromIdx === "" && toIdx === ""}
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
        </div>

        <div>
          <label className="text-xs opacity-60 uppercase tracking-wide mb-1 block">
            {t("to")}
          </label>
          <LocationCombobox
            value={toIdx}
            onChange={setToIdx}
            placeholder={t("selectDest")}
            excludeIdx={fromIdx}
          />
        </div>

        <button
          onClick={handleCheck}
          disabled={
            fromIdx === "" || toIdx === "" || fromIdx === toIdx || loading
          }
          className="w-full bg-accent-blue hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? t("checkingRoute") : t("checkRouteSafety")}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-400 text-sm text-center py-2">{error}</div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="mt-2">
          {/* Overall */}
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
              className="text-2xl font-bold"
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
                {data.distance_km != null && (
                  <span>{data.distance_km} km</span>
                )}
                {data.duration_min != null && (
                  <span>~{data.duration_min} min</span>
                )}
              </div>
            )}
          </div>

          {/* Waypoints */}
          <div className="space-y-2">
            {data.waypoints.map((wp, i) => {
              const color = getSafetyColor(wp.safety_level as SafetyLevel);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <span className="text-sm">{wp.label}</span>
                      <span className="block text-xs opacity-50 capitalize">
                        {wp.weather_description}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>
                    {wp.safety_score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Connection dots visualization */}
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

          {/* Save route */}
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

          {/* Navigation handoff */}
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

          {/* Ride log */}
          <RideLogCard routeData={data} weatherData={weatherData ?? null} />
        </div>
      )}
    </div>
  );
}
