-- Lock down SECURITY DEFINER trigger/utility functions (called only by triggers or service_role)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_like_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_comment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_save_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_follow_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_count_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_hashtag_usage_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon, authenticated;

-- rate_limits: service_role only, satisfy RLS-no-policy linter
CREATE POLICY "rate_limits service only" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);