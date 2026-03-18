import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { RideLog } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);

    const limit = Math.min(Math.max(1, limitParam), 50);
    const offset = Math.max(0, offsetParam);

    const { data, error, count } = await supabase
      .from("ride_logs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("rode_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: (data as RideLog[]) ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("[ride-logs GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      from_name,
      from_lat,
      from_lon,
      to_name,
      to_lat,
      to_lon,
      distance_km,
      duration_min,
      safety_score,
      safety_level,
      weather_summary,
      notes,
    } = body;

    if (!from_name || !to_name || from_lat == null || from_lon == null || to_lat == null || to_lon == null) {
      return NextResponse.json(
        { error: "from_name, from_lat, from_lon, to_name, to_lat, to_lon are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ride_logs")
      .insert({
        user_id: user.id,
        from_name,
        from_lat,
        from_lon,
        to_name,
        to_lat,
        to_lon,
        distance_km: distance_km ?? null,
        duration_min: duration_min ?? null,
        safety_score: safety_score ?? null,
        safety_level: safety_level ?? null,
        weather_summary: weather_summary ?? null,
        notes: notes ?? null,
        rode_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ log: data as RideLog }, { status: 201 });
  } catch (err) {
    console.error("[ride-logs POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
