import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "crypto";
import webpush from "web-push";

function verifyCronSecret(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = `Bearer ${secret}`;
  try {
    return (
      header.length === expected.length &&
      timingSafeEqual(Buffer.from(header), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@ridesafe.my",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = await createSupabaseServiceClient();

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  let sent = 0;
  let errors = 0;

  try {
    // 1. Get all saved_routes with push_alert=true, joined with push_subscriptions
    const { data: savedRoutes, error: routesError } = await supabase
      .from("saved_routes")
      .select(`*, push_subscriptions(endpoint, p256dh, auth_key)`)
      .eq("push_alert", true);

    if (routesError) {
      console.error("[push-check] Error fetching saved routes:", routesError);
      return NextResponse.json({ error: routesError.message }, { status: 500 });
    }

    if (!savedRoutes || savedRoutes.length === 0) {
      return NextResponse.json({ sent: 0, errors: 0 });
    }

    // 2. Deduplicate routes by from_lat+from_lon+to_lat+to_lon
    const routeMap = new Map<
      string,
      {
        from_lat: number;
        from_lon: number;
        to_lat: number;
        to_lon: number;
        from_name: string;
        to_name: string;
        users: Array<{
          userId: string;
          subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }>;
        }>;
      }
    >();

    for (const route of savedRoutes) {
      const key = `${route.from_lat}:${route.from_lon}:${route.to_lat}:${route.to_lon}`;
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          from_lat: route.from_lat,
          from_lon: route.from_lon,
          to_lat: route.to_lat,
          to_lon: route.to_lon,
          from_name: route.from_name,
          to_name: route.to_name,
          users: [],
        });
      }
      const entry = routeMap.get(key)!;
      const subs = Array.isArray(route.push_subscriptions)
        ? route.push_subscriptions
        : route.push_subscriptions
        ? [route.push_subscriptions]
        : [];

      entry.users.push({
        userId: route.user_id,
        subscriptions: subs,
      });
    }

    // 3. Process each unique route
    for (const routeEntry of routeMap.values()) {
      const { from_lat, from_lon, to_lat, to_lon, from_name, to_name, users } =
        routeEntry;

      // a. Build cache key
      const cacheKey = `route:${from_lat.toFixed(2)}:${from_lon.toFixed(2)}:${to_lat.toFixed(2)}:${to_lon.toFixed(2)}`;

      // b. Try Redis cache
      let routeData: {
        overall_level: string;
        overall_score: number;
      } | null = null;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          routeData = typeof cached === "string"
            ? JSON.parse(cached) as typeof routeData
            : (cached as unknown as typeof routeData);
        }
      } catch (cacheErr) {
        console.warn("[push-check] Redis cache error:", cacheErr);
      }

      // c. Fetch if not cached
      if (!routeData) {
        try {
          const res = await fetch(
            `${baseUrl}/api/route-check?from_lat=${from_lat}&from_lon=${from_lon}&to_lat=${to_lat}&to_lon=${to_lon}`
          );
          if (res.ok) {
            routeData = await res.json();
          }
        } catch (fetchErr) {
          console.error("[push-check] Error fetching route-check:", fetchErr);
          continue;
        }
      }

      if (!routeData) continue;

      const { overall_level, overall_score } = routeData;

      // d. Only send push if Dangerous
      if (overall_level !== "Dangerous") continue;

      for (const userEntry of users) {
        const { userId, subscriptions } = userEntry;

        // Dedup: skip if we already sent a push for this user+route recently
        const pushSentKey = `push-sent:${userId}:${from_lat.toFixed(1)}:${to_lat.toFixed(1)}`;
        try {
          const alreadySent = await redis.get(pushSentKey);
          if (alreadySent) continue;
        } catch (dedupeErr) {
          console.warn("[push-check] Redis dedup check error:", dedupeErr);
        }

        const notificationPayload = JSON.stringify({
          title: "Route Safety Alert",
          body: `${from_name} → ${to_name} is now ${overall_level} (score: ${overall_score})`,
          data: { from_lat, from_lon, to_lat, to_lon },
        });

        // Send to each subscription for this user
        for (const sub of subscriptions) {
          if (!sub.endpoint) continue;
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth_key },
              },
              notificationPayload
            );
            sent++;
          } catch (pushErr: unknown) {
            const statusCode =
              pushErr && typeof pushErr === "object" && "statusCode" in pushErr
                ? (pushErr as { statusCode: number }).statusCode
                : null;

            if (statusCode === 410 || statusCode === 404) {
              // Remove stale subscription
              try {
                await supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("endpoint", sub.endpoint);
              } catch (deleteErr) {
                console.error("[push-check] Error deleting stale subscription:", deleteErr);
              }
            } else {
              console.error("[push-check] webpush error:", pushErr);
              errors++;
            }
          }
        }

        // Insert notification record
        try {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "route_alert",
            title: "Route Safety Alert",
            body: `${from_name} → ${to_name} is now ${overall_level} (score: ${overall_score})`,
            data: { from_lat, from_lon, to_lat, to_lon },
          });
        } catch (notifErr) {
          console.error("[push-check] Error inserting notification:", notifErr);
        }

        // Set Redis dedup key (3 hours TTL)
        try {
          await redis.set(pushSentKey, "1", { ex: 10800 });
        } catch (dedupeSetErr) {
          console.warn("[push-check] Redis dedup set error:", dedupeSetErr);
        }
      }
    }

    return NextResponse.json({ sent, errors });
  } catch (err) {
    console.error("[push-check GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
