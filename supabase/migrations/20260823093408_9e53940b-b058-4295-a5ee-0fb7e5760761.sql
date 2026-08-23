CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND (
       EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = _restaurant_id AND r.owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.restaurant_staff s WHERE s.restaurant_id = _restaurant_id AND s.user_id = _user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.restaurant_orders o
    WHERE o.id = _order_id
      AND (o.customer_id = _user_id OR public.is_restaurant_member(_user_id, o.restaurant_id) OR public.has_role(_user_id, 'admin'))
  );
$$;
