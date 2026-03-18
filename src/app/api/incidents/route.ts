import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCached, setCache } from "@/lib/cache";
import type { Incident, IncidentType } from "@/lib/types";

const VALID_INCIDENT_TYPES: IncidentType[] = [
  "flood",
  "accident",
  "road_damage",
  "fallen_tree",
  "oil_spill",
  "police_roadblock",
  "traffic_jam",
  "other",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const lat_min = parseFloat(searchParams.get("lat_min") ?? "1.0");
    const lat_max = parseFloat(searchParams.get("lat_max") ?? "7.5");
    const lon_min = parseFloat(searchParams.get("lon_min") ?? "99.5");
    const lon_max = parseFloat(searchParams.get("lon_max") ?? "119.5");

    const roundedLatMin = parseFloat(lat_min.toFixed(1));
    const roundedLatMax = parseFloat(lat_max.toFixed(1));
    const roundedLonMin = parseFloat(lon_min.toFixed(1));
    const roundedLonMax = parseFloat(lon_max.toFixed(1));

    const cacheKey = `incidents:${roundedLatMin}:${roundedLatMax}:${roundedLonMin}:${roundedLonMax}`;

    const cached = await getCached<{ incidents: Incident[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .gte("lat", lat_min)
      .lte("lat", lat_max)
      .gte("lon", lon_min)
      .lte("lon", lon_max);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = { incidents: (data as Incident[]) ?? [] };
    await setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[incidents GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, description, lat, lon } = body as {
      type: IncidentType;
      description?: string;
      lat: number;
      lon: number;
    };

    if (!VALID_INCIDENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_INCIDENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (description && description.length > 280) {
      return NextResponse.json(
        { error: "Description must be 280 characters or fewer" },
        { status: 400 }
      );
    }

    if (typeof lat !== "number" || lat < 1.0 || lat > 7.5) {
      return NextResponse.json(
        { error: "lat must be between 1.0 and 7.5 (Malaysia bounds)" },
        { status: 400 }
      );
    }

    if (typeof lon !== "number" || lon < 99.5 || lon > 119.5) {
      return NextResponse.json(
        { error: "lon must be between 99.5 and 119.5 (Malaysia bounds)" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (type === "flood") {
      expiresAt.setHours(expiresAt.getHours() + 2);
    } else {
      expiresAt.setHours(expiresAt.getHours() + 6);
    }

    const { data, error } = await supabase
      .from("incidents")
      .insert({
        reporter_id: user.id,
        type,
        description: description ?? null,
        lat,
        lon,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ incident: data as Incident }, { status: 201 });
  } catch (err) {
    console.error("[incidents POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
