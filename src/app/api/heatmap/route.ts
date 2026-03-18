import { NextRequest, NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";

const CACHE_KEY = "heatmap:data";

export async function GET(request: NextRequest) {
  try {
    // Check Redis cache first (10 min TTL handled by setCache)
    const cached = await getCached<{ points: [number, number, number][] }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Fetch weather for all Malaysia locations in parallel
    const results = await Promise.all(
      MALAYSIA_LOCATIONS.map((loc) =>
        fetch(`${baseUrl}/api/weather?lat=${loc.lat}&lon=${loc.lon}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    // Map to heatmap points: [lat, lon, intensity]
    const points: [number, number, number][] = [];
    for (let i = 0; i < MALAYSIA_LOCATIONS.length; i++) {
      const loc = MALAYSIA_LOCATIONS[i];
      const data = results[i];
      if (data && typeof data.safety_score === "number") {
        const intensity = (100 - data.safety_score) / 100;
        points.push([loc.lat, loc.lon, intensity]);
      }
    }

    const result = { points };
    await setCache(CACHE_KEY, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[heatmap GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
