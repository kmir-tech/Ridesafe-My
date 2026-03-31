import { MalaysiaLocation } from "./types";

/**
 * Reverse-geocode a lat/lon via Nominatim.
 * Returns a MalaysiaLocation with a human-readable name, or a coordinate fallback.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<MalaysiaLocation> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`,
      {
        headers: {
          "User-Agent": "RideSafeMY/1.0 (motorcycle safety app)",
          "Accept-Language": "en",
        },
      }
    );
    if (!res.ok) throw new Error("Nominatim reverse error");
    const data = await res.json();
    const addr = data.address ?? {};
    const name =
      addr.village || addr.town || addr.city || addr.suburb || addr.county ||
      data.display_name?.split(",").slice(0, 2).join(",").trim() ||
      `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    const state = addr.state || "Malaysia";
    return createCoordinateLocation(lat, lon, name, state);
  } catch {
    return createCoordinateLocation(lat, lon);
  }
}

function roundedCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function createCoordinateLocation(
  lat: number,
  lon: number,
  name?: string,
  state = "Malaysia"
): MalaysiaLocation {
  return {
    name: name?.trim() || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    lat: roundedCoordinate(lat),
    lon: roundedCoordinate(lon),
    state,
  };
}

export function formatLocationDisplay(location: MalaysiaLocation): string {
  return location.state ? `${location.name}, ${location.state}` : location.name;
}

export function locationsMatch(
  a: MalaysiaLocation | null,
  b: MalaysiaLocation | null
): boolean {
  if (!a || !b) return false;
  return (
    roundedCoordinate(a.lat) === roundedCoordinate(b.lat) &&
    roundedCoordinate(a.lon) === roundedCoordinate(b.lon)
  );
}
