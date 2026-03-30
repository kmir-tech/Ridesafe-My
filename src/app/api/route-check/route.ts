import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentWeather } from "@/lib/weather-api";
import { RouteCheckData, RouteWaypoint, RouteWeatherSummary } from "@/lib/types";
import { getSafetyLevel } from "@/lib/safety";
import { getCached, setCache } from "@/lib/cache";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const NUM_WAYPOINTS = 5;

interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][]; // [lon, lat]
  };
}

const RAIN_INTENSITY_WEIGHT = {
  none: 0,
  light: 1,
  moderate: 2,
  heavy: 3,
} as const;

function buildWorstWaypointReason(waypoint: RouteWaypoint): string {
  if (waypoint.rain_intensity !== "none") {
    return `${waypoint.rain_intensity} rain near ${waypoint.label.toLowerCase()}`;
  }
  if (waypoint.wind_speed_kmh >= 28) {
    return `strong winds near ${waypoint.label.toLowerCase()}`;
  }
  if (waypoint.visibility_km <= 5) {
    return `reduced visibility near ${waypoint.label.toLowerCase()}`;
  }
  return `${waypoint.weather_description} near ${waypoint.label.toLowerCase()}`;
}

function buildRouteWeatherSummary(waypoints: RouteWaypoint[]): RouteWeatherSummary {
  const temperatures = waypoints.map((waypoint) => waypoint.temperature_c);
  const winds = waypoints.map((waypoint) => waypoint.wind_speed_kmh);
  const maxRainWaypoint = waypoints.reduce((currentWettest, waypoint) => {
    const currentWeight = RAIN_INTENSITY_WEIGHT[currentWettest.rain_intensity];
    const nextWeight = RAIN_INTENSITY_WEIGHT[waypoint.rain_intensity];

    if (waypoint.rain_mm > currentWettest.rain_mm) return waypoint;
    if (waypoint.rain_mm === currentWettest.rain_mm && nextWeight > currentWeight) {
      return waypoint;
    }
    return currentWettest;
  }, waypoints[0]);
  const worstWaypoint = waypoints.reduce((currentWorst, waypoint) =>
    waypoint.safety_score < currentWorst.safety_score ? waypoint : currentWorst
  , waypoints[0]);

  const temperatureMin = Math.min(...temperatures);
  const temperatureMax = Math.max(...temperatures);
  const windMin = Math.min(...winds);
  const windMax = Math.max(...winds);
  const rainSummary =
    maxRainWaypoint.rain_intensity === "none"
      ? "No rain detected across the sampled route"
      : `${maxRainWaypoint.rain_intensity} rain peaks near ${maxRainWaypoint.label}`;
  const summaryText =
    `${rainSummary}. ` +
    `Temperatures range from ${temperatureMin}°C to ${temperatureMax}°C, with winds from ${windMin} to ${windMax} km/h. ` +
    `Watch the worst stretch near ${worstWaypoint.label}.`;

  return {
    temperature_min_c: temperatureMin,
    temperature_max_c: temperatureMax,
    wind_min_kmh: windMin,
    wind_max_kmh: windMax,
    max_rain_mm: Math.round(maxRainWaypoint.rain_mm * 10) / 10,
    max_rain_intensity: maxRainWaypoint.rain_intensity,
    worst_waypoint_label: worstWaypoint.label,
    worst_waypoint_reason: buildWorstWaypointReason(worstWaypoint),
    summary_text: summaryText,
  };
}

async function getRouteFromOSRM(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{
  waypoints: { lat: number; lon: number }[];
  distance_km: number;
  duration_min: number;
}> {
  const url = `${OSRM_BASE}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: { "User-Agent": "RideSafeMY/1.0" },
  });
  if (!res.ok) throw new Error(`OSRM API error: ${res.status}`);
  const data = await res.json();

  if (!data.routes?.[0]) throw new Error("No route found");
  const route: OSRMRoute = data.routes[0];
  const coords = route.geometry.coordinates;

  // Sample NUM_WAYPOINTS evenly-spaced points along the route
  const total = coords.length;
  const sampled: { lat: number; lon: number }[] = [];
  for (let i = 0; i < NUM_WAYPOINTS; i++) {
    const idx =
      i === NUM_WAYPOINTS - 1
        ? total - 1
        : Math.round((i / (NUM_WAYPOINTS - 1)) * (total - 1));
    sampled.push({ lat: coords[idx][1], lon: coords[idx][0] });
  }

  return {
    waypoints: sampled,
    distance_km: Math.round((route.distance / 1000) * 10) / 10,
    duration_min: Math.round(route.duration / 60),
  };
}

function interpolateWaypoints(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [
    { lat: fromLat, lon: fromLon },
  ];
  for (let i = 1; i <= NUM_WAYPOINTS - 2; i++) {
    const t = i / (NUM_WAYPOINTS - 1);
    points.push({
      lat: fromLat + (toLat - fromLat) * t,
      lon: fromLon + (toLon - fromLon) * t,
    });
  }
  points.push({ lat: toLat, lon: toLon });
  return points;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fromLat = parseFloat(searchParams.get("from_lat") ?? "");
  const fromLon = parseFloat(searchParams.get("from_lon") ?? "");
  const toLat = parseFloat(searchParams.get("to_lat") ?? "");
  const toLon = parseFloat(searchParams.get("to_lon") ?? "");

  if (isNaN(fromLat) || isNaN(fromLon) || isNaN(toLat) || isNaN(toLon)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid coordinates. Provide from_lat, from_lon, to_lat, to_lon",
      },
      { status: 400 }
    );
  }

  const cacheKey = `route:v2:${fromLat.toFixed(2)}:${fromLon.toFixed(2)}:${toLat.toFixed(2)}:${toLon.toFixed(2)}`;
  const cached = await getCached<RouteCheckData>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  }

  try {
    // Try OSRM for actual road routing, fall back to linear interpolation
    let routePoints: { lat: number; lon: number }[];
    let distance_km: number | undefined;
    let duration_min: number | undefined;

    try {
      const osrmResult = await getRouteFromOSRM(
        fromLat,
        fromLon,
        toLat,
        toLon
      );
      routePoints = osrmResult.waypoints;
      distance_km = osrmResult.distance_km;
      duration_min = osrmResult.duration_min;
    } catch {
      // OSRM unavailable — fall back to straight-line interpolation
      routePoints = interpolateWaypoints(fromLat, fromLon, toLat, toLon);
    }

    const weatherResults = await Promise.all(
      routePoints.map((p) => fetchCurrentWeather(p.lat, p.lon))
    );

    const labels = ["Start", "Waypoint 1", "Waypoint 2", "Waypoint 3", "End"];

    const waypoints: RouteWaypoint[] = weatherResults.map((w, i) => ({
      label: `${w.location} (${labels[i]})`,
      lat: w.lat,
      lon: w.lon,
      temperature_c: w.temperature_c,
      rain_intensity: w.rain_intensity,
      rain_mm: w.rain_mm,
      wind_speed_kmh: w.wind_speed_kmh,
      visibility_km: w.visibility_km,
      safety_score: w.safety_score,
      safety_level: w.safety_level,
      weather_description: w.weather_description,
    }));

    const overallScore = Math.min(...waypoints.map((w) => w.safety_score));
    const weatherSummary = buildRouteWeatherSummary(waypoints);

    const result: RouteCheckData = {
      from: weatherResults[0].location,
      to: weatherResults[weatherResults.length - 1].location,
      overall_score: overallScore,
      overall_level: getSafetyLevel(overallScore),
      waypoints,
      weather_summary: weatherSummary,
      distance_km,
      duration_min,
    };

    await setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
