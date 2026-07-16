
REVOKE EXECUTE ON FUNCTION public.is_premium(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_referral_code() FROM PUBLIC, anon, authenticated;
