import { NextRequest, NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";
import { fetchForecast } from "@/lib/weather-api";
import { ForecastData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const hours = parseInt(searchParams.get("hours") ?? "6", 10);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Missing or invalid lat/lon parameters" },
      { status: 400 }
    );
  }

  const cacheKey = `forecast:${lat.toFixed(2)}:${lon.toFixed(2)}:${hours}`;
  const cached = await getCached<ForecastData>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  }

  try {
    const forecast = await fetchForecast(lat, lon, hours);
    await setCache(cacheKey, forecast);
    return NextResponse.json(forecast, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
