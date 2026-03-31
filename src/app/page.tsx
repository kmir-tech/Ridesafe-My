"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import WeatherCard from "@/components/WeatherCard";
import ForecastTimeline from "@/components/ForecastTimeline";
import BestTimeToRide from "@/components/BestTimeToRide";
import RouteCheck from "@/components/RouteCheck";
import LocationSelector from "@/components/LocationSelector";
import WeatherBackground from "@/components/WeatherBackground";
import MonsoonBanner from "@/components/MonsoonBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmptyState from "@/components/EmptyState";
import AddressSearch from "@/components/AddressSearch";
import OfflineBanner from "@/components/OfflineBanner";
import InstallPrompt from "@/components/InstallPrompt";
import AuthModal from "@/components/AuthModal";
import AIAdvisor from "@/components/AIAdvisor";
import RideHistory from "@/components/RideHistory";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  MalaysiaLocation,
  WeatherData,
  ForecastData,
  RouteCheckData,
  Incident,
} from "@/lib/types";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";
import { getSafetyColor } from "@/lib/safety";

// Dynamic import for Map to avoid SSR issues with Leaflet
const RideSafeMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[50vh] md:h-[60vh] rounded-xl glass-card animate-pulse flex items-center justify-center">
      <span className="opacity-40 text-sm">Loading map...</span>
    </div>
  ),
});

const IncidentReportModal = dynamic(
  () => import("@/components/IncidentReportModal"),
  { ssr: false }
);

type Tab = "weather" | "route";
type RoutePlacementMode = "start" | "end" | null;

function buildRouteSegments(data: RouteCheckData | null) {
  if (!data || data.waypoints.length < 2) return undefined;
  return data.waypoints.slice(0, -1).map((a, i) => {
    const b = data.waypoints[i + 1];
    return {
      positions: [[a.lat, a.lon], [b.lat, b.lon]] as [number, number][],
      color: getSafetyColor(a.safety_level),
    };
  });
}

const tabVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

export default function Home() {
  const { t } = useI18n();
  const { authModalOpen, authModalTab, closeAuthModal } = useSupabase();
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("weather");
  const [tabDirection, setTabDirection] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<MalaysiaLocation | null>(null);
  const [routeStart, setRouteStart] = useState<MalaysiaLocation | null>(null);
  const [routeEnd, setRouteEnd] = useState<MalaysiaLocation | null>(null);
  const [routePlacementMode, setRoutePlacementMode] = useState<RoutePlacementMode>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [routeData, setRouteData] = useState<RouteCheckData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [safetyScores, setSafetyScores] = useState<Record<string, { score: number; level: string }>>({});
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentTimestamp, setIncidentTimestamp] = useState(0);
  const [incidentReportCoords, setIncidentReportCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);
  const [rideHistoryOpen, setRideHistoryOpen] = useState(false);

  // Register service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith("ridesafe-"))
            .forEach((key) => {
              caches.delete(key).catch(() => {});
            });
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Lazily fetch safety scores for visible city markers (deferred to avoid blocking initial load)
  useEffect(() => {
    const timeout = setTimeout(() => {
      async function fetchAllScores() {
        const scores: Record<string, { score: number; level: string }> = {};
        const batchSize = 4;
        for (let i = 0; i < MALAYSIA_LOCATIONS.length; i += batchSize) {
          const batch = MALAYSIA_LOCATIONS.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (loc) => {
              try {
                const res = await fetch(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
                if (res.ok) {
                  const data: WeatherData = await res.json();
                  return { name: loc.name, score: data.safety_score, level: data.safety_level };
                }
              } catch {}
              return null;
            })
          );
          for (const r of results) {
            if (r) scores[r.name] = { score: r.score, level: r.level };
          }
        }
        setSafetyScores(scores);
      }
      fetchAllScores();
    }, 2000); // Defer by 2s to prioritize map rendering
    return () => clearTimeout(timeout);
  }, []);

  // Fetch incidents
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch("/api/incidents");
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.incidents ?? []);
          setIncidentTimestamp(Date.now());
        }
      } catch {}
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch heatmap — initial load with fixed locations, then dynamic on bounds change
  useEffect(() => {
    fetch("/api/heatmap")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setHeatmapPoints(d.points ?? []))
      .catch(() => {});
  }, []);

  const handleHeatmapBoundsChange = useCallback(
    async (bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number }) => {
      try {
        const res = await fetch(
          `/api/heatmap?lat_min=${bounds.latMin}&lat_max=${bounds.latMax}&lon_min=${bounds.lonMin}&lon_max=${bounds.lonMax}`
        );
        if (res.ok) {
          const d = await res.json();
          if (d.points) setHeatmapPoints(d.points);
        }
      } catch {}
    },
    []
  );

  const fetchWeather = useCallback(async (loc: MalaysiaLocation) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const res = await fetch(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("failedWeather"));
      }
      const data: WeatherData = await res.json();
      setWeatherData(data);
      setSafetyScores((prev) => ({
        ...prev,
        [loc.name]: { score: data.safety_score, level: data.safety_level },
      }));
    } catch (e) {
      setWeatherError(e instanceof Error ? e.message : t("failedWeather"));
    } finally {
      setWeatherLoading(false);
    }
  }, [t]);

  const fetchForecast = useCallback(async (loc: MalaysiaLocation) => {
    setForecastLoading(true);
    try {
      const res = await fetch(`/api/forecast?lat=${loc.lat}&lon=${loc.lon}&hours=24`);
      if (res.ok) setForecastData(await res.json());
    } catch {}
    finally { setForecastLoading(false); }
  }, []);

  const handleLocationSelect = useCallback(
    (loc: MalaysiaLocation) => {
      setSelectedLocation(loc);
      setActiveTab("weather");
      setTabDirection(-1);
      fetchWeather(loc);
      fetchForecast(loc);
    },
    [fetchWeather, fetchForecast]
  );

  const handleRouteCheck = useCallback(
    async (fromLat: number, fromLon: number, toLat: number, toLon: number) => {
      setRouteLoading(true);
      setRouteError(null);
      try {
        const res = await fetch(
          `/api/route-check?from_lat=${fromLat}&from_lon=${fromLon}&to_lat=${toLat}&to_lon=${toLon}`
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || t("failedRoute"));
        }
        setRouteData(await res.json());
      } catch (e) {
        setRouteError(e instanceof Error ? e.message : t("failedRoute"));
      } finally {
        setRouteLoading(false);
      }
    },
    [t]
  );

  const handleIncidentUpvote = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/incidents/${id}/upvote`, { method: "POST" });
      if (res.ok) {
        setIncidents((prev) =>
          prev.map((inc) =>
            inc.id === id ? { ...inc, upvotes: inc.upvotes + 1 } : inc
          )
        );
      }
    } catch {}
  }, []);

  const handleIncidentSubmitted = useCallback((incident: Incident) => {
    setIncidents((prev) => [incident, ...prev]);
    setIncidentReportCoords(null);
  }, []);

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) {
      if (tab === "route") {
        const nextMode: RoutePlacementMode = routeStart
          ? routeEnd
            ? "start"
            : "end"
          : "start";
        setRoutePlacementMode(nextMode);
        scrollMapIntoView();
      }
      return;
    }
    setTabDirection(tab === "route" ? 1 : -1);
    setActiveTab(tab);
    if (tab === "route") {
      const nextMode: RoutePlacementMode = routeStart
        ? routeEnd
          ? null
          : "end"
        : "start";
      setRoutePlacementMode(nextMode);
      if (nextMode) {
        scrollMapIntoView();
      }
    }
  };

  const routeSegments = buildRouteSegments(routeData);

  const scrollMapIntoView = useCallback(() => {
    mapSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const handleRoutePlacementStart = useCallback((kind: "start" | "end") => {
    setActiveTab("route");
    setTabDirection(1);
    setRoutePlacementMode(kind);
    scrollMapIntoView();
  }, [scrollMapIntoView]);

  const handleRoutePointSet = useCallback(
    (kind: "start" | "end", location: MalaysiaLocation) => {
      setRouteData(null);
      setActiveTab("route");
      setTabDirection(1);

      if (kind === "start") {
        setRouteStart(location);
        // Use functional update to avoid stale closure on routeEnd
        setRouteEnd((currentEnd) => {
          if (!currentEnd) {
            setRoutePlacementMode("end");
            scrollMapIntoView();
          } else {
            setRoutePlacementMode(null);
          }
          return currentEnd;
        });
        return;
      }

      setRouteEnd(location);
      setRoutePlacementMode(null);
    },
    [scrollMapIntoView]
  );

  const handleSwapRoutePoints = useCallback(() => {
    setRouteData(null);
    setRouteStart(routeEnd);
    setRouteEnd(routeStart);
    setRoutePlacementMode(null);
  }, [routeEnd, routeStart]);

  const handleClearRoutePoints = useCallback(() => {
    setRouteData(null);
    setRouteStart(null);
    setRouteEnd(null);
    setRoutePlacementMode(null);
  }, []);

  const handleLoadSavedRoute = useCallback(
    (from: MalaysiaLocation, to: MalaysiaLocation) => {
      setRouteData(null);
      setRouteStart(from);
      setRouteEnd(to);
      setRoutePlacementMode(null);
      setActiveTab("route");
      setTabDirection(1);
    },
    []
  );

  return (
    <>
      <WeatherBackground condition={weatherData?.weather_description ?? ""} />
      <OfflineBanner />
      <InstallPrompt />

      {/* Auth modal — controlled by SupabaseContext */}
      <AuthModal
        open={authModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
      />

      {/* Ride history drawer */}
      <RideHistory open={rideHistoryOpen} onClose={() => setRideHistoryOpen(false)} />

      {/* Incident report modal */}
      {IncidentReportModal && incidentReportCoords && (
        <IncidentReportModal
          open
          lat={incidentReportCoords.lat}
          lon={incidentReportCoords.lon}
          onClose={() => setIncidentReportCoords(null)}
          onSubmitted={handleIncidentSubmitted}
        />
      )}

      <div className="min-h-screen max-w-2xl mx-auto relative z-10">
        <Header onRideHistoryOpen={() => setRideHistoryOpen(true)} />

        <main className="px-4 md:px-6 pb-8 space-y-4">
          <div ref={mapSectionRef}>
            <ErrorBoundary componentName="Map">
              <RideSafeMap
                onLocationSelect={handleLocationSelect}
                safetyScores={safetyScores}
                selectedLocation={selectedLocation}
                routeSegments={routeSegments}
                routeStart={routeStart}
                routeEnd={routeEnd}
                routePlacementMode={routePlacementMode}
                onRoutePointSet={handleRoutePointSet}
                incidents={incidents}
                incidentTimestamp={incidentTimestamp}
                onIncidentLongPress={
                  routePlacementMode === null
                    ? (lat, lon) => setIncidentReportCoords({ lat, lon })
                    : undefined
                }
                heatmapPoints={heatmapPoints}
                onHeatmapBoundsChange={handleHeatmapBoundsChange}
                onIncidentUpvote={handleIncidentUpvote}
              />
            </ErrorBoundary>
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">{t("heatmapGuide")}</div>
                <p className="text-xs opacity-55 mt-1">
                  {activeTab === "route" ? t("routePlacementHint") : t("mapPrimaryHint")}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="opacity-45">{t("safer")}</span>
                <div className="w-16 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500" />
                <span className="opacity-45">{t("riskier")}</span>
              </div>
            </div>

            <AddressSearch onSelect={handleLocationSelect} />
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 glass-card rounded-lg p-1">
            <motion.button
              onClick={() => switchTab("weather")}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "weather" ? "bg-accent-blue text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("tabWeather")}
            </motion.button>
            <motion.button
              onClick={() => switchTab("route")}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "route" ? "bg-accent-blue text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("tabRoute")}
            </motion.button>
          </div>

          {/* Tab content */}
          <div className="relative overflow-x-hidden overflow-y-visible">
            <AnimatePresence mode="wait" custom={tabDirection}>
              {activeTab === "weather" ? (
                <motion.div
                  key="weather"
                  custom={tabDirection}
                  variants={tabVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  {!selectedLocation && !weatherLoading ? (
                    <EmptyState onLocationSelect={handleLocationSelect} />
                  ) : (
                    <>
                      <ErrorBoundary componentName="WeatherCard">
                        <WeatherCard
                          data={weatherData}
                          loading={weatherLoading}
                          error={weatherError}
                        />
                      </ErrorBoundary>
                      <BestTimeToRide data={forecastData} loading={forecastLoading} />
                      <ForecastTimeline data={forecastData} loading={forecastLoading} />
                      {/* AI Advisor — available on weather tab */}
                      <ErrorBoundary componentName="AIAdvisor">
                        <AIAdvisor
                          context={{
                            weatherData,
                            routeData,
                            incidents,
                            selectedLocationName: selectedLocation?.name ?? "",
                          }}
                        />
                      </ErrorBoundary>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="route"
                  custom={tabDirection}
                  variants={tabVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                  <ErrorBoundary componentName="RouteCheck">
                    <RouteCheck
                      onRouteCheck={handleRouteCheck}
                      data={routeData}
                      loading={routeLoading}
                      error={routeError}
                      weatherData={weatherData}
                      startLocation={routeStart}
                      endLocation={routeEnd}
                      routePlacementMode={routePlacementMode}
                      onPickRoutePoint={handleRoutePlacementStart}
                      onSetRoutePoint={handleRoutePointSet}
                      onSwapRoutePoints={handleSwapRoutePoints}
                      onClearRoutePoints={handleClearRoutePoints}
                      onLoadSavedRoute={handleLoadSavedRoute}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <LocationSelector
            selected={selectedLocation}
            onSelect={handleLocationSelect}
            safetyScores={safetyScores}
          />

          <MonsoonBanner cityName={selectedLocation?.name ?? ""} />

          <footer className="text-center text-xs opacity-30 pt-4">
            RideSafe MY &middot; Ride safe, arrive safe
          </footer>
        </main>
      </div>
    </>
  );
}
