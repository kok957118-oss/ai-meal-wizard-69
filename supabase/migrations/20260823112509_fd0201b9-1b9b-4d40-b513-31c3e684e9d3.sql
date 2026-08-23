-- XP ledger (idempotent via unique dedupe key)
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action text NOT NULL,
  points integer NOT NULL CHECK (points >= 0 AND points <= 5000),
  dedupe_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX xp_events_user_created_idx ON public.xp_events (user_id, created_at DESC);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events_own_select" ON public.xp_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Aggregated stats
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  elite_reward_claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_stats_own_select" ON public.user_stats FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Keep total_xp in sync with the ledger
CREATE OR REPLACE FUNCTION public.apply_xp_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_xp, updated_at)
  VALUES (NEW.user_id, NEW.points, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_stats.total_xp + EXCLUDED.total_xp,
        updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER xp_events_apply AFTER INSERT ON public.xp_events
FOR EACH ROW EXECUTE FUNCTION public.apply_xp_event();

-- Challenges
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  kind text NOT NULL CHECK (kind IN ('weekly','monthly')),
  action text NOT NULL,
  goal integer NOT NULL CHECK (goal > 0),
  xp_reward integer NOT NULL CHECK (xp_reward > 0),
  premium_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO authenticated, anon;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_public_read" ON public.challenges FOR SELECT TO authenticated, anon USING (is_active);

CREATE TABLE public.user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges ON DELETE CASCADE,
  period_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, period_key)
);
GRANT SELECT ON public.user_challenges TO authenticated;
GRANT ALL ON public.user_challenges TO service_role;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_challenges_own_select" ON public.user_challenges FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Achievements unlocked by a user
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  code text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_own_select" ON public.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.challenges (code, title, description, kind, action, goal, xp_reward) VALUES
  ('weekly_cook_3', 'Cook 3 recipes', 'Cook any three recipes this week.', 'weekly', 'recipe_cooked', 3, 250),
  ('weekly_plan_week', 'Plan your week', 'Build a full weekly meal plan.', 'weekly', 'weekly_plan_completed', 1, 250),
  ('weekly_track_5', 'Track 5 days', 'Log all your meals on five days.', 'weekly', 'full_day_tracked', 5, 250),
  ('monthly_cook_12', 'Kitchen marathon', 'Cook twelve recipes this month.', 'monthly', 'recipe_cooked', 12, 750),
  ('monthly_grocery_4', 'Stocked up', 'Complete four grocery lists this month.', 'monthly', 'grocery_list_completed', 4, 750);