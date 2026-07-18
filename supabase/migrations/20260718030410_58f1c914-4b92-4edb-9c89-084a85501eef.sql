
-- =========== telemetry_events ===========
CREATE TABLE public.telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  kind TEXT NOT NULL,           -- 'ai' | 'scan' | 'api' | 'nutrition' | 'ui'
  name TEXT NOT NULL,           -- e.g. 'ai.generate_recipe', 'scan.kitchen'
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX telemetry_events_created_at_idx ON public.telemetry_events (created_at DESC);
CREATE INDEX telemetry_events_kind_created_idx ON public.telemetry_events (kind, created_at DESC);
CREATE INDEX telemetry_events_user_idx ON public.telemetry_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.telemetry_events TO authenticated;
GRANT ALL ON public.telemetry_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.telemetry_events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.telemetry_events_id_seq TO service_role;

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own telemetry"
  ON public.telemetry_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins read all telemetry"
  ON public.telemetry_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========== nutrition_logs ===========
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_id UUID,
  name TEXT NOT NULL,
  meal_type TEXT,             -- breakfast | lunch | dinner | snack
  servings NUMERIC NOT NULL DEFAULT 1,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_logs_user_logged_idx ON public.nutrition_logs (user_id, logged_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_logs TO authenticated;
GRANT ALL ON public.nutrition_logs TO service_role;

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nutrition logs"
  ON public.nutrition_logs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all nutrition logs"
  ON public.nutrition_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER nutrition_logs_updated_at
  BEFORE UPDATE ON public.nutrition_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
