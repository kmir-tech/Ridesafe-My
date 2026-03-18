import { SafetyLevel } from "./types";

interface SafetyInput {
  rain_mm: number;
  recent_precip_mm: number;
  wind_speed_kmh: number;
  visibility_km: number;
  temperature_c: number;
  humidity_pct: number;
  hour: number;
}

export function calculateSafetyScore(input: SafetyInput): number {
  let score = 100;

  // Rain penalty (30% weight) — includes recent precipitation for wet road factor
  const totalRain = input.rain_mm + input.recent_precip_mm * 0.5;
  let rainPenalty: number;
  if (totalRain > 10) {
    rainPenalty = 100;
  } else if (totalRain > 5) {
    rainPenalty = 70;
  } else if (totalRain > 2) {
    rainPenalty = 45;
  } else if (totalRain > 0.5) {
    rainPenalty = 20;
  } else {
    rainPenalty = 0;
  }
  score -= rainPenalty * 0.3;

  // Wind penalty (25% weight) — >50 km/h is full penalty
  const windPenalty = Math.min((input.wind_speed_kmh / 50) * 100, 100);
  score -= windPenalty * 0.25;

  // Visibility penalty (20% weight) — <2km is very dangerous
  const visPenalty = Math.max(0, ((10 - input.visibility_km) / 10) * 100);
  score -= visPenalty * 0.2;

  // Temperature penalty (10% weight) — extremes cause fatigue
  let tempPenalty = 0;
  if (input.temperature_c > 38) {
    tempPenalty = Math.min((input.temperature_c - 38) * 15, 100);
  } else if (input.temperature_c < 15) {
    tempPenalty = Math.min((15 - input.temperature_c) * 15, 100);
  }
  score -= tempPenalty * 0.1;

  // Humidity penalty (10% weight) — high humidity + heat
  const humidityPenalty =
    input.humidity_pct > 70
      ? Math.min(((input.humidity_pct - 70) / 30) * 100, 100)
      : 0;
  score -= humidityPenalty * 0.1;

  // Night modifier (5% flat) — riding at night with any adverse condition
  if (input.hour < 6 || input.hour > 19) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getSafetyLevel(score: number): SafetyLevel {
  if (score >= 70) return "Safe";
  if (score >= 40) return "Caution";
  return "Dangerous";
}

export function getRainIntensity(
  rainMm: number
): "none" | "light" | "moderate" | "heavy" {
  if (rainMm >= 7.6) return "heavy";
  if (rainMm >= 2.5) return "moderate";
  if (rainMm > 0) return "light";
  return "none";
}

export function getSafetyColor(level: SafetyLevel): string {
  switch (level) {
    case "Safe":
      return "#22c55e";
    case "Caution":
      return "#eab308";
    case "Dangerous":
      return "#ef4444";
  }
}
