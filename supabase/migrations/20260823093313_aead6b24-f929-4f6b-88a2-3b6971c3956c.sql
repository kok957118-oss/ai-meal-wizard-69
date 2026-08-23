REVOKE ALL ON FUNCTION public.protect_restaurant_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_restaurant_rating() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_restaurant_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_order(uuid, uuid) FROM anon;
