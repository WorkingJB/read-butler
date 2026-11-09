-- Functions in public are exposed over /rest/v1/rpc. Trigger and event trigger
-- functions are invoked by Postgres itself and never need to be callable by
-- API roles, so remove the default EXECUTE grant (flagged by the security
-- advisor for rls_auto_enable, a SECURITY DEFINER helper Supabase adds).
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
