"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MALAYSIA_LOCATIONS,
  MALAYSIA_CENTER,
  MALAYSIA_ZOOM,
} from "@/lib/locations";
import { MalaysiaLocation, Incident } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import IncidentLayer from "@/components/IncidentLayer";
import HeatmapLayer from "@/components/HeatmapLayer";
import { useI18n } from "@/contexts/I18nContext";

function createMarkerIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#1e293b" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#1e293b"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const defaultIcon = createMarkerIcon("#3b82f6");

function UserLocationMarker({
  onLocationFound,
}: {
  onLocationFound: (lat: number, lon: number) => void;
}) {
  const map = useMap();
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useEffect(() => {
    map.locate({ setView: false, maxZoom: 10 });
    map.on("locationfound", (e) => {
      setPosition(e.latlng);
      onLocationFound(e.latlng.lat, e.latlng.lng);
    });
  }, [map, onLocationFound]);

  if (!position) return null;

  const userIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6)"></div>`,
    className: "user-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return <Marker position={position} icon={userIcon} />;
}

function RadarLayer({ visible }: { visible: boolean }) {
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((res) => res.json())
      .then((data) => {
        const latest = data.radar.past[data.radar.past.length - 1];
        setTileUrl(
          `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`
        );
      })
      .catch(() => {});
  }, [visible]);

  if (!visible || !tileUrl) return null;
  return <TileLayer key={tileUrl} url={tileUrl} opacity={0.5} />;
}

// Long-press detector inner component (needs useMap context)
function LongPressDetector({
  onLongPress,
}: {
  onLongPress: (lat: number, lon: number) => void;
}) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleDown = (e: L.LeafletMouseEvent) => {
      startPosRef.current = { x: e.containerPoint.x, y: e.containerPoint.y };
      timerRef.current = setTimeout(() => {
        onLongPress(e.latlng.lat, e.latlng.lng);
      }, 600);
    };

    const handleUp = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleMove = (e: L.LeafletMouseEvent) => {
      if (!startPosRef.current || !timerRef.current) return;
      const dx = e.containerPoint.x - startPosRef.current.x;
      const dy = e.containerPoint.y - startPosRef.current.y;
      if (Math.hypot(dx, dy) > 10) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    map.on("mousedown", handleDown);
    map.on("mouseup", handleUp);
    map.on("mousemove", handleMove);
    map.on("touchstart", handleDown as unknown as L.LeafletEventHandlerFn);
    map.on("touchend", handleUp);

    return () => {
      map.off("mousedown", handleDown);
      map.off("mouseup", handleUp);
      map.off("mousemove", handleMove);
      map.off("touchstart", handleDown as unknown as L.LeafletEventHandlerFn);
      map.off("touchend", handleUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map, onLongPress]);

  return null;
}

interface RouteSegment {
  positions: [number, number][];
  color: string;
}

interface MapProps {
  onLocationSelect: (location: MalaysiaLocation) => void;
  safetyScores: Record<string, { score: number; level: string }>;
  routeSegments?: RouteSegment[];
  incidents?: Incident[];
  onIncidentLongPress?: (lat: number, lon: number) => void;
  heatmapPoints?: [number, number, number][];
  onIncidentUpvote?: (id: string) => void;
}

export default function RideSafeMap({
  onLocationSelect,
  safetyScores,
  routeSegments,
  incidents = [],
  onIncidentLongPress,
  heatmapPoints = [],
  onIncidentUpvote,
}: MapProps) {
  const { t } = useI18n();
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [showRadar, setShowRadar] = useState(false);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const handleUserLocation = (lat: number, lon: number) => {
    setUserLoc({ lat, lon });
    let nearest = MALAYSIA_LOCATIONS[0];
    let minDist = Infinity;
    for (const loc of MALAYSIA_LOCATIONS) {
      const dist = Math.hypot(loc.lat - lat, loc.lon - lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = loc;
      }
    }
    onLocationSelect(nearest);
  };

  const handleLongPress = (lat: number, lon: number) => {
    if (onIncidentLongPress) onIncidentLongPress(lat, lon);
  };

  return (
    <div className="w-full h-[50vh] md:h-[60vh] rounded-xl overflow-hidden border border-card-border relative">
      <MapContainer
        center={[MALAYSIA_CENTER.lat, MALAYSIA_CENTER.lon]}
        zoom={MALAYSIA_ZOOM}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <RadarLayer visible={showRadar} />
        <HeatmapLayer visible={showHeatmap} points={heatmapPoints} />
        <UserLocationMarker onLocationFound={handleUserLocation} />
        {onIncidentLongPress && (
          <LongPressDetector onLongPress={handleLongPress} />
        )}

        {/* Route polyline segments */}
        {routeSegments?.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            pathOptions={{
              color: seg.color,
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ))}

        {/* Incident layer */}
        <IncidentLayer
          visible={showIncidents}
          incidents={incidents}
          onUpvote={onIncidentUpvote ?? (() => {})}
        />

        {/* Location markers */}
        {MALAYSIA_LOCATIONS.map((loc) => {
          const safety = safetyScores[loc.name];
          const icon = safety
            ? createMarkerIcon(getSafetyColor(safety.level as "Safe" | "Caution" | "Dangerous"))
            : defaultIcon;

          return (
            <Marker
              key={loc.name}
              position={[loc.lat, loc.lon]}
              icon={icon}
              eventHandlers={{ click: () => onLocationSelect(loc) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{loc.name}</strong>
                  <br />
                  <span className="text-xs opacity-70">{loc.state}</span>
                  {safety && (
                    <>
                      <br />
                      <span
                        className="font-bold"
                        style={{ color: getSafetyColor(safety.level as "Safe" | "Caution" | "Dangerous") }}
                      >
                        {safety.level} ({safety.score})
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map controls — stacked vertically top-right */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
        {[
          { key: "radar", active: showRadar, toggle: () => setShowRadar(!showRadar), label: "Radar" },
          {
            key: "incidents",
            active: showIncidents,
            toggle: () => setShowIncidents(!showIncidents),
            label: t("showIncidents"),
            badge: showIncidents && incidents.length > 0 ? incidents.length : undefined,
          },
          { key: "heatmap", active: showHeatmap, toggle: () => setShowHeatmap(!showHeatmap), label: t("showHeatmap") },
        ].map(({ key, active, toggle, label, badge }) => (
          <button
            key={key}
            onClick={toggle}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: active ? "rgba(59,130,246,0.3)" : "rgba(30,41,59,0.85)",
              border: active ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              color: active ? "#93c5fd" : "#94a3b8",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: active ? "#3b82f6" : "#475569" }}
            />
            {label}
            {badge !== undefined && (
              <span className="ml-0.5 bg-red-500 text-white text-[9px] px-1 rounded-full">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {userLoc && (
        <div className="absolute bottom-2 left-0 right-0 z-[1000] text-xs text-center opacity-50">
          {t("yourLocation")}
        </div>
      )}

      {onIncidentLongPress && (
        <div className="absolute bottom-2 left-2 z-[1000] text-[10px] opacity-30">
          {t("tapMapToReport")}
        </div>
      )}
    </div>
  );
}
