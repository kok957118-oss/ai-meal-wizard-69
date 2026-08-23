-- ENUMS
CREATE TYPE public.restaurant_approval_status AS ENUM ('pending','approved','rejected','suspended','changes_requested');
CREATE TYPE public.restaurant_order_status AS ENUM ('new','accepted','preparing','ready','out_for_delivery','completed','cancelled');
CREATE TYPE public.restaurant_staff_role AS ENUM ('owner','manager','staff');

-- RESTAURANTS
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  owner_name text,
  description text,
  cuisine text,
  phone text,
  email text,
  whatsapp text,
  address text,
  logo_url text,
  cover_image_url text,
  food_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_range text,
  delivery_radius_km numeric NOT NULL DEFAULT 5,
  min_order_amount numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  delivery_estimate_minutes integer NOT NULL DEFAULT 35,
  currency text NOT NULL DEFAULT 'USD',
  business_registration text,
  payment_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_status public.restaurant_approval_status NOT NULL DEFAULT 'pending',
  is_verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  is_accepting_orders boolean NOT NULL DEFAULT true,
  avg_rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- STAFF (created before helper fn usage in policies)
CREATE TABLE public.restaurant_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.restaurant_staff_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_staff TO authenticated;
GRANT ALL ON public.restaurant_staff TO service_role;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = _restaurant_id AND r.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.restaurant_staff s WHERE s.restaurant_id = _restaurant_id AND s.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_public(_restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = _restaurant_id AND r.approval_status = 'approved');
$$;

-- guard: staff cannot change approval/verification/demo
CREATE OR REPLACE FUNCTION public.protect_restaurant_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.approval_status := OLD.approval_status;
  NEW.is_verified := OLD.is_verified;
  NEW.is_demo := OLD.is_demo;
  NEW.avg_rating := OLD.avg_rating;
  NEW.rating_count := OLD.rating_count;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_restaurant_status BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.protect_restaurant_status();
CREATE TRIGGER restaurants_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Approved restaurants are public" ON public.restaurants FOR SELECT USING (approval_status = 'approved');
CREATE POLICY "Members read own restaurant" ON public.restaurants FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_restaurant_member(auth.uid(), id));
CREATE POLICY "Admins read all restaurants" ON public.restaurants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create restaurant" ON public.restaurants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members update own restaurant" ON public.restaurants FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_restaurant_member(auth.uid(), id)) WITH CHECK (owner_id = auth.uid() OR public.is_restaurant_member(auth.uid(), id));
CREATE POLICY "Admins update restaurants" ON public.restaurants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete restaurants" ON public.restaurants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members read staff" ON public.restaurant_staff FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners manage staff" ON public.restaurant_staff FOR ALL TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));

-- LOCATIONS
CREATE TABLE public.restaurant_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label text,
  address text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_locations_restaurant_idx ON public.restaurant_locations(restaurant_id);
GRANT SELECT ON public.restaurant_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_locations TO authenticated;
GRANT ALL ON public.restaurant_locations TO service_role;
ALTER TABLE public.restaurant_locations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER restaurant_locations_updated_at BEFORE UPDATE ON public.restaurant_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public locations of approved restaurants" ON public.restaurant_locations FOR SELECT USING (public.is_restaurant_public(restaurant_id));
CREATE POLICY "Members manage locations" ON public.restaurant_locations FOR ALL TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));

-- APPLICATIONS
CREATE TABLE public.restaurant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.restaurant_approval_status NOT NULL DEFAULT 'pending',
  submitted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_notes text,
  rejection_reason text,
  requested_changes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_applications_status_idx ON public.restaurant_applications(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_applications TO authenticated;
GRANT ALL ON public.restaurant_applications TO service_role;
ALTER TABLE public.restaurant_applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER restaurant_applications_updated_at BEFORE UPDATE ON public.restaurant_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Applicants read own application" ON public.restaurant_applications FOR SELECT TO authenticated USING (applicant_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Applicants submit application" ON public.restaurant_applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Admins update applications" ON public.restaurant_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete applications" ON public.restaurant_applications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- MENUS
CREATE TABLE public.restaurant_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_menus_restaurant_idx ON public.restaurant_menus(restaurant_id);
GRANT SELECT ON public.restaurant_menus TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_menus TO authenticated;
GRANT ALL ON public.restaurant_menus TO service_role;
ALTER TABLE public.restaurant_menus ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER restaurant_menus_updated_at BEFORE UPDATE ON public.restaurant_menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public menus of approved restaurants" ON public.restaurant_menus FOR SELECT USING (is_active AND public.is_restaurant_public(restaurant_id));
CREATE POLICY "Members manage menus" ON public.restaurant_menus FOR ALL TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES public.restaurant_menus(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  image_url text,
  price numeric NOT NULL DEFAULT 0,
  category text,
  is_available boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_items_restaurant_idx ON public.menu_items(restaurant_id);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public menu items of approved restaurants" ON public.menu_items FOR SELECT USING (NOT is_hidden AND public.is_restaurant_public(restaurant_id));
CREATE POLICY "Members manage menu items" ON public.menu_items FOR ALL TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));

-- ORDERS
CREATE TABLE public.restaurant_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.restaurant_order_status NOT NULL DEFAULT 'new',
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  delivery_address text,
  contact_phone text,
  notes text,
  rejection_reason text,
  placed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_orders_restaurant_idx ON public.restaurant_orders(restaurant_id);
CREATE INDEX restaurant_orders_customer_idx ON public.restaurant_orders(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_orders TO authenticated;
GRANT ALL ON public.restaurant_orders TO service_role;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER restaurant_orders_updated_at BEFORE UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Customers read own orders" ON public.restaurant_orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create orders" ON public.restaurant_orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND public.is_restaurant_public(restaurant_id));
CREATE POLICY "Customers cancel new orders" ON public.restaurant_orders FOR UPDATE TO authenticated USING (customer_id = auth.uid() AND status = 'new') WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Members update orders" ON public.restaurant_orders FOR UPDATE TO authenticated USING (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_orders o
    WHERE o.id = _order_id
      AND (o.customer_id = _user_id OR public.is_restaurant_member(_user_id, o.restaurant_id) OR public.has_role(_user_id, 'admin'))
  );
$$;
CREATE POLICY "Order items follow order access" ON public.order_items FOR SELECT TO authenticated USING (public.can_access_order(auth.uid(), order_id));
CREATE POLICY "Customers add order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.can_access_order(auth.uid(), order_id));

-- REVIEWS
CREATE TABLE public.restaurant_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);
CREATE INDEX restaurant_reviews_restaurant_idx ON public.restaurant_reviews(restaurant_id);
GRANT SELECT ON public.restaurant_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_reviews TO authenticated;
GRANT ALL ON public.restaurant_reviews TO service_role;
ALTER TABLE public.restaurant_reviews ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER restaurant_reviews_updated_at BEFORE UPDATE ON public.restaurant_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Reviews of approved restaurants are public" ON public.restaurant_reviews FOR SELECT USING (public.is_restaurant_public(restaurant_id));
CREATE POLICY "Users manage own review" ON public.restaurant_reviews FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.recalc_restaurant_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rid uuid;
BEGIN
  _rid := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  UPDATE public.restaurants r
    SET avg_rating = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.restaurant_reviews WHERE restaurant_id = _rid), 0),
        rating_count = (SELECT count(*) FROM public.restaurant_reviews WHERE restaurant_id = _rid)
  WHERE r.id = _rid;
  RETURN NULL;
END; $$;
CREATE TRIGGER restaurant_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_restaurant_rating();
