import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCached, setCache } from "@/lib/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitKey = `upvote:${user.id}:${id}`;
    const alreadyUpvoted = await getCached<boolean>(rateLimitKey);
    if (alreadyUpvoted) {
      return NextResponse.json({ error: "already_upvoted" }, { status: 429 });
    }

    const { error } = await supabase.rpc("upvote_incident", {
      incident_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await setCache(rateLimitKey, true);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[upvote POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
