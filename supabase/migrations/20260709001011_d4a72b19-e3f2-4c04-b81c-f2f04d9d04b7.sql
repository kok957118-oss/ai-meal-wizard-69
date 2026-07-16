
-- ============ ENUMS ============
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','in_grace','paused','expired','cancelled');
CREATE TYPE public.subscription_tier AS ENUM ('free','monthly','annual','lifetime','promo');
CREATE TYPE public.subscription_store AS ENUM ('app_store','play_store','stripe','promo','admin');
CREATE TYPE public.payment_kind AS ENUM ('initial','renewal','trial_conversion','refund');
CREATE TYPE public.promo_reward_kind AS ENUM ('percent_discount','free_days','free_month','free_year','lifetime');
CREATE TYPE public.referral_status AS ENUM ('pending','rewarded','void');

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_app_user_id TEXT,
  rc_original_transaction_id TEXT,
  product_id TEXT,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'expired',
  store public.subscription_store,
  environment TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX idx_subs_status ON public.subscriptions(status);
CREATE INDEX idx_subs_period_end ON public.subscriptions(period_end);
CREATE UNIQUE INDEX idx_subs_rc_orig ON public.subscriptions(rc_original_transaction_id) WHERE rc_original_transaction_id IS NOT NULL;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin subscription read" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_event_id TEXT UNIQUE,
  amount_usd NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  kind public.payment_kind NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pay_user ON public.payments(user_id);
CREATE INDEX idx_pay_occurred ON public.payments(occurred_at DESC);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin payments read" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROMO CODES ============
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  reward_kind public.promo_reward_kind NOT NULL,
  reward_value INTEGER NOT NULL DEFAULT 0,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_promo_enabled ON public.promo_codes(enabled);

GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage promo" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Authenticated users can validate a code by looking it up (needed for redemption UI)
CREATE POLICY "auth read enabled promo" ON public.promo_codes FOR SELECT TO authenticated
  USING (enabled = true AND (expires_at IS NULL OR expires_at > now()));

CREATE TABLE public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_days INTEGER NOT NULL DEFAULT 0,
  granted_lifetime BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
CREATE INDEX idx_promo_red_user ON public.promo_redemptions(user_id);
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemption read" ON public.promo_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ REFERRALS ============
CREATE TABLE public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referral code" ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
-- Public lookup of a referral code (by code only) needs anon-safe path; we do it via server fn with service role, so no anon policy.

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  reward_days INTEGER NOT NULL DEFAULT 14,
  status public.referral_status NOT NULL DEFAULT 'pending',
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);
CREATE INDEX idx_ref_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_ref_status ON public.referrals(status);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals read" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(),'admin'));

-- ============ PREMIUM FEATURE CATALOG ============
CREATE TABLE public.premium_features (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  min_tier public.subscription_tier NOT NULL DEFAULT 'monthly',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_features TO anon, authenticated;
GRANT ALL ON public.premium_features TO service_role;
ALTER TABLE public.premium_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "features public read" ON public.premium_features FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage features" ON public.premium_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.premium_features (key,label,description,sort_order) VALUES
  ('unlimited_ai_chat','Unlimited AI Chef chats','Ask as many questions as you want, any time.',1),
  ('unlimited_recipes','Unlimited recipe generation','Generate endless personalised recipes.',2),
  ('unlimited_meal_plans','Unlimited meal plans','Plan every week without limits.',3),
  ('unlimited_grocery','Unlimited grocery lists','Build and save unlimited grocery lists.',4),
  ('exclusive_recipes','Premium-exclusive recipes','Chef-crafted recipes only for members.',5),
  ('nutrition_insights','Advanced nutrition insights','Deeper macro, micro, and diet analysis.',6),
  ('priority_ai','Priority AI responses','Skip the queue on busy times.',7),
  ('no_ads','No ads','A cleaner, distraction-free kitchen.',8),
  ('early_access','Early access to new features','Try new tools before anyone else.',9),
  ('premium_badge','Premium badge','Show a Premium badge on your profile.',10);

-- ============ USAGE LIMITS ============
CREATE TABLE public.usage_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  period_key TEXT NOT NULL, -- e.g. '2026-07-08' for daily, '2026-07' for monthly
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_key, period_key)
);
GRANT SELECT ON public.usage_limits TO authenticated;
GRANT ALL ON public.usage_limits TO service_role;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage read" ON public.usage_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ EVENTS AUDIT LOG ============
CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL, -- 'revenuecat' | 'admin' | 'promo' | 'referral'
  actor_id UUID,
  rc_event_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_user ON public.subscription_events(user_id);
CREATE INDEX idx_events_created ON public.subscription_events(created_at DESC);
CREATE UNIQUE INDEX idx_events_rc_event ON public.subscription_events(rc_event_id) WHERE rc_event_id IS NOT NULL;

GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin events read" ON public.subscription_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "own events read" ON public.subscription_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_promo_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON public.usage_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENTITLEMENT HELPERS ============
CREATE OR REPLACE FUNCTION public.is_premium(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status IN ('trialing','active','in_grace')
      AND (s.period_end IS NULL OR s.period_end > now() OR s.tier = 'lifetime')
  );
$$;

-- Auto-create a referral code when a profile is created
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  tries INT := 0;
BEGIN
  LOOP
    new_code := upper(substr(encode(gen_random_bytes(6),'base64'),1,8));
    new_code := regexp_replace(new_code,'[^A-Z0-9]','X','g');
    BEGIN
      INSERT INTO public.referral_codes(user_id, code) VALUES (NEW.id, new_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      tries := tries + 1;
      IF tries > 5 THEN EXIT; END IF;
    END;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_profile_created_referral
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_referral_code();

-- Backfill referral codes for existing profiles
INSERT INTO public.referral_codes (user_id, code)
SELECT p.id, upper(substr(regexp_replace(encode(gen_random_bytes(6),'base64'),'[^A-Za-z0-9]','X','g'),1,8))
FROM public.profiles p
LEFT JOIN public.referral_codes rc ON rc.user_id = p.id
WHERE rc.user_id IS NULL
ON CONFLICT DO NOTHING;
