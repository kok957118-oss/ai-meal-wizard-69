
DROP POLICY IF EXISTS "Anyone can insert dish search counts" ON public.dish_searches;
DROP POLICY IF EXISTS "Anyone can update dish search counts" ON public.dish_searches;
REVOKE INSERT, UPDATE ON public.dish_searches FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.increment_dish_search(text);
