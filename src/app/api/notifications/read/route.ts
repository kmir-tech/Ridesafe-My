import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
    const { ids, all } = body as { ids?: string[]; all?: boolean };

    const readAt = new Date().toISOString();

    if (all === true) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (Array.isArray(ids) && ids.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .in("id", ids)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: "Provide either all=true or a non-empty ids array" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications read POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
