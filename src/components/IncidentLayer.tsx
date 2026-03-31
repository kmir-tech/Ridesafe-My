"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Incident, IncidentType } from "@/lib/types";
import { useI18n } from "@/contexts/I18nContext";

const INCIDENT_COLORS: Record<IncidentType, string> = {
  flood: "#3b82f6",
  accident: "#ef4444",
  road_damage: "#f97316",
  fallen_tree: "#84cc16",
  oil_spill: "#a855f7",
  police_roadblock: "#06b6d4",
  traffic_jam: "#eab308",
  other: "#94a3b8",
};

const INCIDENT_ICONS: Record<IncidentType, string> = {
  flood: "🌊",
  accident: "⚠️",
  road_damage: "🕳️",
  fallen_tree: "🌳",
  oil_spill: "🛢️",
  police_roadblock: "🚔",
  traffic_jam: "🚗",
  other: "📍",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createIncidentIcon(type: IncidentType, nearExpiry: boolean): any {
  const color = INCIDENT_COLORS[type];
  const icon = INCIDENT_ICONS[type];
  const opacity = nearExpiry ? 0.5 : 1;
  const svg = `
    <div style="
      width: 32px; height: 32px;
      background: ${color}25;
      border: 2px solid ${color};
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px ${color}40;
      opacity: ${opacity};
    ">${icon}</div>`;
  return L.divIcon({
    html: svg,
    className: "incident-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface IncidentLayerProps {
  visible: boolean;
  incidents: Incident[];
  onUpvote: (id: string) => void;
  now: number;
}

export default function IncidentLayer({
  visible,
  incidents,
  onUpvote,
  now,
}: IncidentLayerProps) {
  const { t } = useI18n();

  if (!visible || incidents.length === 0) return null;

  return (
    <>
      {incidents.map((incident) => {
        const expiresAt = new Date(incident.expires_at).getTime();
        const nearExpiry = expiresAt - now < 30 * 60 * 1000; // < 30 min
        const icon = createIncidentIcon(incident.type as IncidentType, nearExpiry);

        return (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lon]}
            icon={icon}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <div className="flex items-center gap-1 font-bold mb-1">
                  <span>{INCIDENT_ICONS[incident.type as IncidentType]}</span>
                  <span style={{ color: INCIDENT_COLORS[incident.type as IncidentType] }}>
                    {t(
                      ("incident" +
                        incident.type
                          .split("_")
                          .map((w) => w[0].toUpperCase() + w.slice(1))
                          .join("")) as Parameters<typeof t>[0]
                    )}
                  </span>
                </div>
                {incident.description && (
                  <p className="text-xs opacity-70 mb-1">{incident.description}</p>
                )}
                <p className="text-xs opacity-50">{timeAgo(incident.created_at)}</p>
                <button
                  onClick={() => onUpvote(incident.id)}
                  className="mt-2 text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
                >
                  👍 {t("upvote")} ({incident.upvotes})
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
