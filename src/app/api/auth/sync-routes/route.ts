import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";

interface SyncRouteInput {
  fromIdx: number;
  toIdx: number;
  fromName: string;
  toName: string;
  lastScore?: number;
  lastLevel?: string;
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
    const { routes } = body as { routes: SyncRouteInput[] };

    if (!Array.isArray(routes) || routes.length === 0) {
      return NextResponse.json({ synced: 0, skipped: 0 });
    }

    let synced = 0;
    let skipped = 0;

    const upsertRows: Array<{
      user_id: string;
      from_name: string;
      from_lat: number;
      from_lon: number;
      to_name: string;
      to_lat: number;
      to_lon: number;
      last_score?: number;
      last_level?: string;
    }> = [];

    for (const route of routes) {
      const { fromIdx, toIdx, fromName, toName, lastScore, lastLevel } = route;

      const fromLoc = MALAYSIA_LOCATIONS[fromIdx];
      const toLoc = MALAYSIA_LOCATIONS[toIdx];

      if (!fromLoc || !toLoc) {
        skipped++;
        continue;
      }

      upsertRows.push({
        user_id: user.id,
        from_name: fromName,
        from_lat: fromLoc.lat,
        from_lon: fromLoc.lon,
        to_name: toName,
        to_lat: toLoc.lat,
        to_lon: toLoc.lon,
        ...(lastScore != null ? { last_score: lastScore } : {}),
        ...(lastLevel != null ? { last_level: lastLevel } : {}),
      });
    }

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from("saved_routes")
        .upsert(upsertRows, {
          onConflict: "user_id,from_lat,from_lon,to_lat,to_lon",
          ignoreDuplicates: false,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      synced = upsertRows.length;
    }

    return NextResponse.json({ synced, skipped });
  } catch (err) {
    console.error("[auth sync-routes POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
