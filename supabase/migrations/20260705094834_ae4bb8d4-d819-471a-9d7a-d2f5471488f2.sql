
CREATE TABLE public.dish_searches (
  name text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dish_searches TO anon, authenticated;
GRANT ALL ON public.dish_searches TO service_role;

ALTER TABLE public.dish_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dish search counts"
  ON public.dish_searches FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.increment_dish_search(_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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
