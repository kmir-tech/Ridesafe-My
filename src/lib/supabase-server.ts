import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client for Route Handlers and Server Components
// Reads/writes session cookies automatically
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — cookies() is read-only
            // in that context, which is fine (session refresh happens in middleware)
          }
        },
      },
    }
  );
}

// Service-role client for privileged server operations (cron, notifications)
// NEVER expose to browser
export async function createSupabaseServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
