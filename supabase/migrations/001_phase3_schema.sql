-- Phase 3 Schema Migration — RideSafe MY

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  preferred_lang TEXT NOT NULL DEFAULT 'en' CHECK (preferred_lang IN ('en', 'bm')),
  home_city     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── saved_routes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_routes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_name   TEXT NOT NULL,
  from_lat    NUMERIC(9,6) NOT NULL,
  from_lon    NUMERIC(9,6) NOT NULL,
  to_name     TEXT NOT NULL,
  to_lat      NUMERIC(9,6) NOT NULL,
  to_lon      NUMERIC(9,6) NOT NULL,
  last_score  SMALLINT,
  last_level  TEXT CHECK (last_level IN ('Safe', 'Caution', 'Dangerous')),
  push_alert  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, from_lat, from_lon, to_lat, to_lon)
);

CREATE INDEX IF NOT EXISTS saved_routes_user_id_idx
  ON public.saved_routes (user_id);

CREATE INDEX IF NOT EXISTS saved_routes_push_alert_idx
  ON public.saved_routes (push_alert)
  WHERE push_alert = true;

DROP TRIGGER IF EXISTS saved_routes_updated_at ON public.saved_routes;
CREATE TRIGGER saved_routes_updated_at
  BEFORE UPDATE ON public.saved_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own saved routes"
  ON public.saved_routes FOR ALL USING (auth.uid() = user_id);

-- ─── incidents ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE incident_type AS ENUM (
    'flood', 'accident', 'road_damage', 'fallen_tree',
    'oil_spill', 'police_roadblock', 'traffic_jam', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        incident_type NOT NULL,
  description TEXT CHECK (char_length(description) <= 280),
  lat         NUMERIC(9,6) NOT NULL,
  lon         NUMERIC(9,6) NOT NULL,
  upvotes     SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_lat_lon_idx
  ON public.incidents (lat, lon);

CREATE INDEX IF NOT EXISTS incidents_reporter_idx
  ON public.incidents (reporter_id);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live incidents"
  ON public.incidents FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Authenticated users can insert incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Reporters can delete own incidents"
  ON public.incidents FOR DELETE
  USING (auth.uid() = reporter_id);

CREATE OR REPLACE FUNCTION public.upvote_incident(incident_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.incidents
  SET upvotes = upvotes + 1,
      expires_at = LEAST(
        expires_at + INTERVAL '30 minutes',
        now() + INTERVAL '6 hours'
      )
  WHERE id = incident_id
    AND expires_at > now();
END;
$$;

-- ─── ride_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ride_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_name       TEXT NOT NULL,
  from_lat        NUMERIC(9,6) NOT NULL,
  from_lon        NUMERIC(9,6) NOT NULL,
  to_name         TEXT NOT NULL,
  to_lat          NUMERIC(9,6) NOT NULL,
  to_lon          NUMERIC(9,6) NOT NULL,
  distance_km     NUMERIC(6,1),
  duration_min    SMALLINT,
  safety_score    SMALLINT,
  safety_level    TEXT CHECK (safety_level IN ('Safe', 'Caution', 'Dangerous')),
  weather_summary JSONB,
  notes           TEXT,
  rode_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ride_logs_user_id_idx
  ON public.ride_logs (user_id);

CREATE INDEX IF NOT EXISTS ride_logs_rode_at_idx
  ON public.ride_logs (user_id, rode_at DESC);

ALTER TABLE public.ride_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own ride logs"
  ON public.ride_logs FOR ALL USING (auth.uid() = user_id);

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ─── push_subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own push subscriptions"
  ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);