import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { AppNotification } from "@/lib/types";

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
    const unreadOnly = searchParams.get("unread_only") === "true";

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications: (data as AppNotification[]) ?? [],
      unread_count: unreadCount ?? 0,
    });
  } catch (err) {
    console.error("[notifications GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
