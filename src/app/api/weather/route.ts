import { NextRequest, NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/cache";
import { fetchCurrentWeather } from "@/lib/weather-api";
import { WeatherData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Missing or invalid lat/lon parameters" },
      { status: 400 }
    );
  }

  const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await getCached<WeatherData>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  }

  try {
    const weather = await fetchCurrentWeather(lat, lon);
    const result: WeatherData = { ...weather, cached: false };
    await setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
