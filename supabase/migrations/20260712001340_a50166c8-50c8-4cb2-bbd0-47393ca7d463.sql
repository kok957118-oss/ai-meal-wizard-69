
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  new_code TEXT;
  tries INT := 0;
  alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INT;
BEGIN
  BEGIN
    LOOP
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      BEGIN
        INSERT INTO public.referral_codes(user_id, code) VALUES (NEW.id, new_code);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        tries := tries + 1;
        IF tries > 8 THEN EXIT; END IF;
      END;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup on referral code creation
    RAISE WARNING 'ensure_referral_code failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
