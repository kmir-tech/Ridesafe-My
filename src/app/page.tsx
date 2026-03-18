"use client";

import { useState, useCallback, useEffect } from "react";
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

type Tab = "weather" | "route";

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
  const { user, authModalOpen, authModalTab, closeAuthModal } = useSupabase();

  const [activeTab, setActiveTab] = useState<Tab>("weather");
  const [tabDirection, setTabDirection] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<MalaysiaLocation | null>(null);
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
  const [incidentReportCoords, setIncidentReportCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);
  const [rideHistoryOpen, setRideHistoryOpen] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Fetch safety scores for all locations
  useEffect(() => {
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
  }, []);

  // Fetch incidents
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch("/api/incidents");
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.incidents ?? []);
        }
      } catch {}
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch heatmap
  useEffect(() => {
    fetch("/api/heatmap")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setHeatmapPoints(d.points ?? []))
      .catch(() => {});
  }, []);

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
    if (tab === activeTab) return;
    setTabDirection(tab === "route" ? 1 : -1);
    setActiveTab(tab);
  };

  const routeSegments = buildRouteSegments(routeData);

  // Dynamically import IncidentReportModal to keep initial bundle lean
  const IncidentReportModal =
    incidentReportCoords !== null
      ? require("@/components/IncidentReportModal").default
      : null;

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
          <AddressSearch onSelect={handleLocationSelect} />

          <LocationSelector
            selected={selectedLocation}
            onSelect={handleLocationSelect}
            safetyScores={safetyScores}
          />

          <MonsoonBanner cityName={selectedLocation?.name ?? ""} />

          <ErrorBoundary componentName="Map">
            <RideSafeMap
              onLocationSelect={handleLocationSelect}
              safetyScores={safetyScores}
              routeSegments={routeSegments}
              incidents={incidents}
              onIncidentLongPress={(lat, lon) => setIncidentReportCoords({ lat, lon })}
              heatmapPoints={heatmapPoints}
              onIncidentUpvote={handleIncidentUpvote}
            />
          </ErrorBoundary>

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
          <div className="relative overflow-hidden">
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
                    />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="text-center text-xs opacity-30 pt-4">
            RideSafe MY &middot; Ride safe, arrive safe
          </footer>
        </main>
      </div>
    </>
  );
}
