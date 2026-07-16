
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.user_id = has_role.user_id
      AND ur.role = _role
  )
$$;

DROP POLICY IF EXISTS "Authenticated users can create hashtags" ON public.hashtags;
CREATE POLICY "Authenticated users can create hashtags"
ON public.hashtags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
