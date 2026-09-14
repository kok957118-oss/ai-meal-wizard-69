-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.order_payment_status AS ENUM ('unpaid','pending','paid','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_fulfillment_type AS ENUM ('delivery','pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.promotion_kind AS ENUM ('percent_off','amount_off','bogo','free_delivery','combo','first_order');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.restaurant_staff_role ADD VALUE IF NOT EXISTS 'general_manager';
ALTER TYPE public.restaurant_staff_role ADD VALUE IF NOT EXISTS 'chef';
ALTER TYPE public.restaurant_staff_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE public.restaurant_staff_role ADD VALUE IF NOT EXISTS 'order_staff';
ALTER TYPE public.restaurant_staff_role ADD VALUE IF NOT EXISTS 'analyst';

-- ============ RESTAURANTS ============
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS pause_message TEXT,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supports_pickup BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_delivery BOOLEAN NOT NULL DEFAULT true;

-- ============ BRANCHES (restaurant_locations) ============
ALTER TABLE public.restaurant_locations
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_estimate_minutes INTEGER;

-- ============ MENU ITEMS ============
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS modifier_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.restaurant_locations(id) ON DELETE SET NULL;

-- ============ ORDERS ============
ALTER TABLE public.restaurant_orders
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.restaurant_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_type public.order_fulfillment_type NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS discount_total NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_id UUID,
  ADD COLUMN IF NOT EXISTS promotion_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_status public.order_payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ============ ORDER ITEMS ============
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC;

-- ============ PROMOTIONS ============
CREATE TABLE IF NOT EXISTS public.restaurant_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  kind public.promotion_kind NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC,
  applicable_menu_item_ids UUID[] NOT NULL DEFAULT '{}',
  applicable_branch_ids UUID[] NOT NULL DEFAULT '{}',
  usage_limit_total INTEGER,
  usage_limit_per_customer INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_promotions_code_uq
  ON public.restaurant_promotions (restaurant_id, lower(code)) WHERE code IS NOT NULL;

GRANT SELECT ON public.restaurant_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_promotions TO authenticated;
GRANT ALL ON public.restaurant_promotions TO service_role;
ALTER TABLE public.restaurant_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions of approved restaurants"
ON public.restaurant_promotions FOR SELECT
USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved')
);

CREATE POLICY "Restaurant team manages its promotions"
ON public.restaurant_promotions FOR ALL
TO authenticated
USING (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER restaurant_promotions_updated_at
BEFORE UPDATE ON public.restaurant_promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROMOTION REDEMPTIONS ============
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.restaurant_promotions(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotion_redemptions TO authenticated;
GRANT ALL ON public.promotion_redemptions TO service_role;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer or restaurant team can view redemptions"
ON public.promotion_redemptions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_restaurant_member(auth.uid(), restaurant_id)
  OR public.has_role(auth.uid(), 'admin')
);

-- ============ FK for promotion on orders ============
DO $$ BEGIN
  ALTER TABLE public.restaurant_orders
    ADD CONSTRAINT restaurant_orders_promotion_fk
    FOREIGN KEY (promotion_id) REFERENCES public.restaurant_promotions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ BRANCH READ POLICY FOR CUSTOMERS ============
DO $$ BEGIN
  CREATE POLICY "Anyone can view branches of approved restaurants"
  ON public.restaurant_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_visible ON public.menu_items (restaurant_id, is_hidden, sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.restaurant_orders (restaurant_id, status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.restaurant_orders (customer_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_restaurant_active ON public.restaurant_promotions (restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promotion_redemptions (promotion_id, user_id);
CREATE INDEX IF NOT EXISTS idx_branches_restaurant ON public.restaurant_locations (restaurant_id, is_active);

-- ============ REALTIME ============
ALTER TABLE public.restaurant_orders REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.restaurants REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_locations REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_promotions REPLICA IDENTITY FULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_orders; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_locations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_promotions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;