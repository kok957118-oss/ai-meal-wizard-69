
-- 1) Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS budget_per_day NUMERIC,
  ADD COLUMN IF NOT EXISTS age INT,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS family_size INT DEFAULT 1;

-- 2) feature_flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  rollout_percent INT NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated, anon;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags readable by everyone" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags writable by admins" ON public.feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) recently_viewed
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
CREATE INDEX IF NOT EXISTS recently_viewed_user_time_idx
  ON public.recently_viewed (user_id, viewed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recently_viewed owner" ON public.recently_viewed FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) recipe_ratings
CREATE TABLE IF NOT EXISTS public.recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
GRANT SELECT ON public.recipe_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ratings TO authenticated;
GRANT ALL ON public.recipe_ratings TO service_role;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings readable by all" ON public.recipe_ratings FOR SELECT USING (true);
CREATE POLICY "ratings insert own" ON public.recipe_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings update own" ON public.recipe_ratings FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings delete own" ON public.recipe_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- 5) Recipe rating aggregates
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_recipe_rating(_recipe_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.recipes r
     SET avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.recipe_ratings WHERE recipe_id = _recipe_id), 0),
         rating_count = COALESCE((SELECT COUNT(*) FROM public.recipe_ratings WHERE recipe_id = _recipe_id), 0)
   WHERE r.id = _recipe_id;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_recipe_rating_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM public.recalc_recipe_rating(OLD.recipe_id); RETURN OLD; END IF;
  PERFORM public.recalc_recipe_rating(NEW.recipe_id); RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_recipe_rating_change ON public.recipe_ratings;
CREATE TRIGGER trg_recipe_rating_change
AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ratings
FOR EACH ROW EXECUTE FUNCTION public.handle_recipe_rating_change();

CREATE TRIGGER trg_recipe_ratings_updated
BEFORE UPDATE ON public.recipe_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Seed a couple of default flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('cooking_mode', true, 'Step-by-step full-screen cooking mode'),
  ('personalized_planner', true, 'AI meal planner v2 using profile goals & allergies'),
  ('barcode_scanner', false, 'Barcode scan on scan page (premium)'),
  ('community_uploads', false, 'Allow users to publish recipes to community')
ON CONFLICT (key) DO NOTHING;
