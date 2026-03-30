import { MalaysiaLocation } from "./types";

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
