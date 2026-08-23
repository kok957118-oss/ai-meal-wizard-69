CREATE OR REPLACE FUNCTION public.protect_restaurant_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Trusted server-side admin flows run as service_role and are allowed through.
  IF current_user = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.approval_status := OLD.approval_status;
  NEW.is_verified := OLD.is_verified;
  NEW.is_demo := OLD.is_demo;
  NEW.avg_rating := OLD.avg_rating;
  NEW.rating_count := OLD.rating_count;
  RETURN NEW;
END; $function$;