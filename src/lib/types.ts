import type { User } from "@supabase/supabase-js";

export type { User };

export interface WeatherData {
  location: string;
  lat: number;
  lon: number;
  temperature_c: number;
  humidity_pct: number;
  rain_intensity: "none" | "light" | "moderate" | "heavy";
  rain_mm: number;
  recent_precip_mm: number;
  wind_speed_kmh: number;
  visibility_km: number;
  uv_index: number;
  weather_description: string;
  weather_icon: string;
  safety_score: number;
  safety_level: SafetyLevel;
  fetched_at: string;
  cached: boolean;
}

export interface ForecastHour {
  time: string;
  temperature_c: number;
  humidity_pct: number;
  rain_intensity: "none" | "light" | "moderate" | "heavy";
  rain_mm: number;
  wind_speed_kmh: number;
  visibility_km: number;
  safety_score: number;
  safety_level: SafetyLevel;
  weather_description: string;
  weather_icon: string;
}

export interface ForecastData {
  location: string;
  lat: number;
  lon: number;
  hourly: ForecastHour[];
}

export interface RouteWaypoint {
  label: string;
  lat: number;
  lon: number;
  safety_score: number;
  safety_level: SafetyLevel;
  weather_description: string;
}

export interface RouteCheckData {
  from: string;
  to: string;
  overall_score: number;
  overall_level: SafetyLevel;
  waypoints: RouteWaypoint[];
  distance_km?: number;
  duration_min?: number;
}

export type SafetyLevel = "Safe" | "Caution" | "Dangerous";

export interface MalaysiaLocation {
  name: string;
  lat: number;
  lon: number;
  state: string;
}

// ─── Phase 3 Types ───────────────────────────────────────────────────────────

export type IncidentType =
  | "flood"
  | "accident"
  | "road_damage"
  | "fallen_tree"
  | "oil_spill"
  | "police_roadblock"
  | "traffic_jam"
  | "other";

export interface Incident {
  id: string;
  reporter_id: string | null;
  type: IncidentType;
  description: string | null;
  lat: number;
  lon: number;
  upvotes: number;
  expires_at: string;
  created_at: string;
}

export interface RideLog {
  id: string;
  user_id: string;
  from_name: string;
  from_lat: number;
  from_lon: number;
  to_name: string;
  to_lat: number;
  to_lon: number;
  distance_km: number | null;
  duration_min: number | null;
  safety_score: number | null;
  safety_level: SafetyLevel | null;
  weather_summary: WeatherSummary | null;
  notes: string | null;
  rode_at: string;
}

export interface WeatherSummary {
  description: string;
  temperature_c: number;
  rain_intensity: string;
  wind_speed_kmh: number;
  safety_score: number;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: "route_alert" | "incident_nearby" | "system";
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_lang: "en" | "bm";
  home_city: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdvisorContext {
  weatherData: WeatherData | null;
  routeData: RouteCheckData | null;
  incidents: Incident[];
  selectedLocationName: string;
}
