
DROP FUNCTION IF EXISTS public.increment_dish_search(text);

GRANT INSERT, UPDATE ON public.dish_searches TO anon, authenticated;

CREATE POLICY "Anyone can insert dish search counts"
  ON public.dish_searches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update dish search counts"
  ON public.dish_searches FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.increment_dish_search(_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RETURN 0;
  END IF;
  INSERT INTO public.dish_searches (name, count)
  VALUES (trim(_name), 1)
  ON CONFLICT (name) DO UPDATE
    SET count = public.dish_searches.count + 1,
        updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_dish_search(text) TO anon, authenticated;
