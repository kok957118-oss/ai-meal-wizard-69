
REVOKE EXECUTE ON FUNCTION public.recalc_recipe_rating(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_recipe_rating_change() FROM PUBLIC, anon, authenticated;
