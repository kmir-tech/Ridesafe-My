import { NextRequest, NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";

// Generate a grid of sample points within bounds
function generateGrid(
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
  cols = 4,
  rows = 4
): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  const latStep = (latMax - latMin) / (rows + 1);
  const lonStep = (lonMax - lonMin) / (cols + 1);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      points.push({
        lat: Math.round((latMin + latStep * r) * 100) / 100,
        lon: Math.round((lonMin + lonStep * c) * 100) / 100,
      });
    }
  }
  return points;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const latMin = parseFloat(searchParams.get("lat_min") || "");
    const latMax = parseFloat(searchParams.get("lat_max") || "");
    const lonMin = parseFloat(searchParams.get("lon_min") || "");
    const lonMax = parseFloat(searchParams.get("lon_max") || "");

    const hasViewport = [latMin, latMax, lonMin, lonMax].every((v) => !isNaN(v));

    // Clamp bounds to Malaysia region to prevent abuse
    const clampedLatMin = Math.max(0.5, Math.min(latMin, 8));
    const clampedLatMax = Math.max(0.5, Math.min(latMax, 8));
    const clampedLonMin = Math.max(99, Math.min(lonMin, 120));
    const clampedLonMax = Math.max(99, Math.min(lonMax, 120));

    // Use viewport grid or fallback to fixed locations
    const locations = hasViewport
      ? generateGrid(clampedLatMin, clampedLatMax, clampedLonMin, clampedLonMax)
      : MALAYSIA_LOCATIONS.map((l) => ({ lat: l.lat, lon: l.lon }));

    // Round to 2 decimals for cache key
    const cacheKey = hasViewport
      ? `heatmap:${latMin.toFixed(1)}:${latMax.toFixed(1)}:${lonMin.toFixed(1)}:${lonMax.toFixed(1)}`
      : "heatmap:data";

    const cached = await getCached<{ points: [number, number, number][] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const results = await Promise.all(
      locations.map((loc) =>
        fetch(`${baseUrl}/api/weather?lat=${loc.lat}&lon=${loc.lon}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    const points: [number, number, number][] = [];
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const data = results[i];
      if (data && typeof data.safety_score === "number") {
        const intensity = (100 - data.safety_score) / 100;
        points.push([loc.lat, loc.lon, intensity]);
      }
    }

    const result = { points };
    await setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[heatmap GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
