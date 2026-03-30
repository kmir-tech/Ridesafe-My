import {
  calculateSafetyScore,
  getSafetyLevel,
  getRainIntensity,
} from "./safety";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";

function wmoToDescription(code: number): string {
  if (code === 0) return "clear sky";
  if (code === 1) return "mainly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code === 45) return "fog";
  if (code === 48) return "rime fog";
  if (code === 51) return "light drizzle";
  if (code === 53) return "moderate drizzle";
  if (code === 55) return "dense drizzle";
  if (code >= 56 && code <= 57) return "freezing drizzle";
  if (code === 61) return "slight rain";
  if (code === 63) return "moderate rain";
  if (code === 65) return "heavy rain";
  if (code >= 66 && code <= 67) return "freezing rain";
  if (code === 71) return "slight snow";
  if (code === 73) return "moderate snow";
  if (code === 75) return "heavy snow";
  if (code === 77) return "snow grains";
  if (code === 80) return "slight showers";
  if (code === 81) return "moderate showers";
  if (code === 82) return "violent showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code === 95) return "thunderstorm";
  if (code === 96 || code === 99) return "thunderstorm with hail";
  return "unknown";
}

function wmoToOWMIcon(code: number, isDay: boolean): string {
  const d = isDay ? "d" : "n";
  if (code === 0) return `01${d}`;
  if (code === 1) return `02${d}`;
  if (code === 2) return `03${d}`;
  if (code === 3) return `04${d}`;
  if (code === 45 || code === 48) return `50${d}`;
  if (code >= 51 && code <= 57) return `09${d}`;
  if (code >= 61 && code <= 65) return `10${d}`;
  if (code >= 66 && code <= 77) return `13${d}`;
  if (code >= 80 && code <= 82) return `09${d}`;
  if (code >= 85 && code <= 86) return `13${d}`;
  if (code >= 95) return `11${d}`;
  return `01${d}`;
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `${NOMINATIM_BASE}?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RideSafeMY/1.0" },
    });
    if (!res.ok) return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.county ||
      data.address?.state ||
      data.display_name?.split(",")[0] ||
      `${lat.toFixed(2)}, ${lon.toFixed(2)}`
    );
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

interface OpenMeteoCurrentResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    visibility: number[];
  };
}

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    rain: number[];
    wind_speed_10m: number[];
    visibility: number[];
    weather_code: number[];
    is_day: number[];
  };
}

export async function fetchCurrentWeather(lat: number, lon: number) {
  const url =
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,wind_gusts_10m,weather_code,is_day` +
    `&hourly=visibility&forecast_hours=2&timezone=auto`;

  const [res, location] = await Promise.all([
    fetch(url),
    reverseGeocode(lat, lon),
  ]);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const data: OpenMeteoCurrentResponse = await res.json();

  const cur = data.current;
  const rainMm = cur.rain ?? cur.precipitation ?? 0;
  const visibilityKm = (data.hourly.visibility?.[0] ?? 10000) / 1000;
  const windSpeedKmh = cur.wind_speed_10m; // Open-Meteo returns km/h by default
  const hour = new Date(cur.time).getHours();
  const isDay = cur.is_day === 1;

  const safetyScore = calculateSafetyScore({
    rain_mm: rainMm,
    recent_precip_mm: rainMm,
    wind_speed_kmh: windSpeedKmh,
    visibility_km: visibilityKm,
    temperature_c: cur.temperature_2m,
    humidity_pct: cur.relative_humidity_2m,
    hour,
    weather_code: cur.weather_code,
  });

  return {
    location,
    lat,
    lon,
    temperature_c: Math.round(cur.temperature_2m),
    humidity_pct: cur.relative_humidity_2m,
    rain_intensity: getRainIntensity(rainMm),
    rain_mm: Math.round(rainMm * 10) / 10,
    recent_precip_mm: Math.round(rainMm * 10) / 10,
    wind_speed_kmh: Math.round(windSpeedKmh),
    visibility_km: Math.round(visibilityKm * 10) / 10,
    uv_index: 0,
    weather_description: wmoToDescription(cur.weather_code),
    weather_icon: wmoToOWMIcon(cur.weather_code, isDay),
    safety_score: safetyScore,
    safety_level: getSafetyLevel(safetyScore),
    fetched_at: new Date().toISOString(),
  };
}

export async function fetchForecast(lat: number, lon: number, hours: number) {
  const url =
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,visibility,weather_code,is_day` +
    `&forecast_hours=${hours}&timezone=auto`;

  const [res, location] = await Promise.all([
    fetch(url),
    reverseGeocode(lat, lon),
  ]);
  if (!res.ok) throw new Error(`Open-Meteo Forecast API error: ${res.status}`);
  const data: OpenMeteoForecastResponse = await res.json();

  const { hourly } = data;

  const hourlyData = hourly.time.slice(0, hours).map((time, i) => {
    const rainMm = hourly.rain[i] ?? hourly.precipitation[i] ?? 0;
    const visibilityKm = (hourly.visibility[i] ?? 10000) / 1000;
    const windSpeedKmh = hourly.wind_speed_10m[i];
    const hour = new Date(time).getHours();
    const isDay = hourly.is_day[i] === 1;

    const safetyScore = calculateSafetyScore({
      rain_mm: rainMm,
      recent_precip_mm: rainMm,
      wind_speed_kmh: windSpeedKmh,
      visibility_km: visibilityKm,
      temperature_c: hourly.temperature_2m[i],
      humidity_pct: hourly.relative_humidity_2m[i],
      hour,
      weather_code: hourly.weather_code[i],
    });

    return {
      time,
      temperature_c: Math.round(hourly.temperature_2m[i]),
      humidity_pct: hourly.relative_humidity_2m[i],
      rain_intensity: getRainIntensity(rainMm),
      rain_mm: Math.round(rainMm * 10) / 10,
      wind_speed_kmh: Math.round(windSpeedKmh),
      visibility_km: Math.round(visibilityKm * 10) / 10,
      safety_score: safetyScore,
      safety_level: getSafetyLevel(safetyScore),
      weather_description: wmoToDescription(hourly.weather_code[i]),
      weather_icon: wmoToOWMIcon(hourly.weather_code[i], isDay),
    };
  });

  return {
    location,
    lat,
    lon,
    hourly: hourlyData,
  };
}
