
-- Rate limiting table (auth attempts, AI calls, generic buckets)
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket TEXT NOT NULL,
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, identifier, window_start)
);
CREATE INDEX rate_limits_lookup_idx ON public.rate_limits (bucket, identifier, window_start DESC);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No client-facing policies: only service_role (server functions) touches this.

-- Audit log for admin actions and security-relevant events
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON public.audit_logs (action, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Increment-or-insert rate limit helper (server_role only).
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket TEXT,
  _identifier TEXT,
  _max_per_minute INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_ts TIMESTAMPTZ := date_trunc('minute', now());
BEGIN
  INSERT INTO public.rate_limits (bucket, identifier, window_start, count)
  VALUES (_bucket, _identifier, window_ts, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO current_count;

  -- Best-effort cleanup: drop old rows for this identifier
  DELETE FROM public.rate_limits
  WHERE identifier = _identifier
    AND bucket = _bucket
    AND window_start < now() - INTERVAL '1 hour';

  RETURN current_count <= _max_per_minute;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER) TO service_role;
