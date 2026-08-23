-- Replace function-based public checks with direct row checks
DROP POLICY "Public locations of approved restaurants" ON public.restaurant_locations;
CREATE POLICY "Public locations of approved restaurants" ON public.restaurant_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved'));

DROP POLICY "Public menus of approved restaurants" ON public.restaurant_menus;
CREATE POLICY "Public menus of approved restaurants" ON public.restaurant_menus FOR SELECT
  USING (is_active AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved'));

DROP POLICY "Public menu items of approved restaurants" ON public.menu_items;
CREATE POLICY "Public menu items of approved restaurants" ON public.menu_items FOR SELECT
  USING (NOT is_hidden AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved'));

DROP POLICY "Reviews of approved restaurants are public" ON public.restaurant_reviews;
CREATE POLICY "Reviews of approved restaurants are public" ON public.restaurant_reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved'));

DROP POLICY "Customers create orders" ON public.restaurant_orders;
CREATE POLICY "Customers create orders" ON public.restaurant_orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.approval_status = 'approved' AND r.is_accepting_orders));

DROP FUNCTION public.is_restaurant_public(uuid);

REVOKE ALL ON FUNCTION public.protect_restaurant_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_restaurant_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_restaurant_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_order(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_restaurant_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid, uuid) TO authenticated;
